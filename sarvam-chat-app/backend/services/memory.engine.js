"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — memory.engine.js  (v2)                  ║
 * ║   Persistent memory: Firestore-backed + smart summarisation ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────
 *  1. Every message pair (user + assistant) is saved to Firestore
 *     under:  messages/{userId}/sessions/{sessionId}/turns/{turnId}
 *
 *  2. When a session loads, we pull the last MAX_RAW_TURNS turns.
 *     If there are older turns, we also fetch the stored rolling
 *     summary so the AI still has context without huge token cost.
 *
 *  3. Once raw turns exceed SUMMARIZE_AFTER, the oldest half is
 *     summarised via the AI, stored as a "summary" doc, and those
 *     raw turn docs are deleted from Firestore.
 *
 * FIRESTORE SCHEMA
 * ─────────────────────────────────────────────────────────────
 *  messages/{userId}/sessions/{sessionId}
 *    ├── (session meta doc)  { createdAt, updatedAt, jurisdiction, turnCount }
 *    ├── turns/{turnId}      { role, content, ts }
 *    └── summaries/rolling   { summary, summarisedUpTo, updatedAt }
 */

const admin = require("firebase-admin");

// Lazy init guard — firestoreService.js may already have initialised admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId  : process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// ── Tunables ──────────────────────────────────────────────────
const MAX_RAW_TURNS    = 20;   // keep this many recent turn-pairs in Firestore
const SUMMARIZE_AFTER  = 16;   // summarise when raw turns exceed this
const IN_MEM_CAP       = 40;   // hard cap on in-memory history array length

// ── In-process cache (survives within a single server run) ────
// Map<sessionId, Array<{role, content}>>
const sessionCache = new Map();

/* ═══════════════════════════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════════════════════════ */

function sessionRef(userId, sessionId) {
  return db
    .collection("messages")
    .doc(userId)
    .collection("sessions")
    .doc(sessionId);
}

function turnsRef(userId, sessionId) {
  return sessionRef(userId, sessionId).collection("turns");
}

function summaryRef(userId, sessionId) {
  return sessionRef(userId, sessionId)
    .collection("summaries")
    .doc("rolling");
}

/**
 * Summarise a chunk of messages using the AI.
 * We import sarvamService lazily to avoid circular deps.
 */
async function generateSummary(messages, jurisdiction) {
  const { generateResponse } = require("./sarvamService");

  const conversation = messages
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = [
    {
      role: "user",
      content: `You are a memory assistant for LAWLite, an Indian legal AI.
Summarise the following conversation into a concise paragraph (max 200 words).
Focus on: legal topics discussed, user's jurisdiction, any personal details shared,
decisions or conclusions reached. Write in third person.
Jurisdiction context: ${jurisdiction || "India"}.

CONVERSATION:
${conversation}

Respond with ONLY the summary paragraph, nothing else.`,
    },
  ];

  const result = await generateResponse(prompt);
  return (result.reply || result.text || "").trim();
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════ */

/**
 * loadSessionHistory
 * ──────────────────
 * Called at the start of each request.
 * Returns an array of {role, content} messages ready to prepend
 * to the current conversation, including a system-level summary
 * block if older history exists.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<Array<{role:string, content:string}>>}
 */
async function loadSessionHistory(userId, sessionId) {
  // 1. Return from cache if available
  if (sessionCache.has(sessionId)) {
    return sessionCache.get(sessionId);
  }

  if (!userId || userId === "anonymous") return [];

  try {
    // 2. Pull recent raw turns from Firestore
    const snap = await turnsRef(userId, sessionId)
      .orderBy("ts", "asc")
      .limitToLast(MAX_RAW_TURNS)
      .get();

    const turns = snap.docs.map(d => ({
      role   : d.data().role,
      content: d.data().content,
    }));

    // 3. Pull rolling summary (covers older turns)
    const summarySnap = await summaryRef(userId, sessionId).get();
    const history     = [];

    if (summarySnap.exists) {
      const { summary } = summarySnap.data();
      if (summary) {
        // Inject as a system-style user→assistant exchange so the AI
        // treats it as established context without counting as a real turn
        history.push({
          role   : "user",
          content: "[MEMORY CONTEXT — do not reference directly, just use as background]\n" + summary,
        });
        history.push({
          role   : "assistant",
          content: "Understood. I have your previous conversation context.",
        });
      }
    }

    // 4. Append raw recent turns
    history.push(...turns);

    // 5. Warm the cache
    sessionCache.set(sessionId, history);

    return history;
  } catch (err) {
    console.error("[Memory] loadSessionHistory error:", err.message);
    return [];
  }
}

/**
 * appendTurn
 * ──────────
 * Save one user message and one assistant reply to Firestore,
 * update the in-memory cache, and trigger summarisation if needed.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.sessionId
 * @param {string} opts.userMessage
 * @param {string} opts.assistantReply
 * @param {string} [opts.jurisdiction]
 */
async function appendTurn({ userId, sessionId, userMessage, assistantReply, jurisdiction }) {
  // Always update in-memory cache regardless of auth status
  const cached = sessionCache.get(sessionId) || [];
  cached.push({ role: "user",      content: userMessage     });
  cached.push({ role: "assistant", content: assistantReply  });

  // Trim in-memory cache to cap
  const trimmed = cached.length > IN_MEM_CAP
    ? cached.slice(-IN_MEM_CAP)
    : cached;
  sessionCache.set(sessionId, trimmed);

  // Skip Firestore persistence for anonymous users
  if (!userId || userId === "anonymous") return;

  try {
    const ref   = turnsRef(userId, sessionId);
    const batch = db.batch();
    const ts    = Date.now();

    // Write user turn
    batch.set(ref.doc(`${ts}_u`), {
      role   : "user",
      content: userMessage,
      ts     : ts,
    });

    // Write assistant turn
    batch.set(ref.doc(`${ts}_a`), {
      role   : "assistant",
      content: assistantReply,
      ts     : ts + 1, // ensure ordering
    });

    // Update session meta
    batch.set(sessionRef(userId, sessionId), {
      updatedAt   : admin.firestore.FieldValue.serverTimestamp(),
      jurisdiction: jurisdiction || "India",
    }, { merge: true });

    await batch.commit();

    // Check if we should summarise old turns
    await maybeSummarise(userId, sessionId, jurisdiction);

  } catch (err) {
    console.error("[Memory] appendTurn error:", err.message);
  }
}

/**
 * maybeSummarise
 * ──────────────
 * If there are more than SUMMARIZE_AFTER raw turn docs in Firestore,
 * summarise the oldest half, persist the summary, and delete those docs.
 */
async function maybeSummarise(userId, sessionId, jurisdiction) {
  try {
    const snap = await turnsRef(userId, sessionId)
      .orderBy("ts", "asc")
      .get();

    if (snap.size <= SUMMARIZE_AFTER) return;

    // Take the oldest half to summarise
    const cutIndex    = Math.floor(snap.size / 2);
    const oldDocs     = snap.docs.slice(0, cutIndex);
    const oldMessages = oldDocs.map(d => ({
      role   : d.data().role,
      content: d.data().content,
    }));

    console.log(`[Memory] Summarising ${oldDocs.length} old turns for session ${sessionId}`);

    // Fetch existing rolling summary to fold into new one
    const existingSnap = await summaryRef(userId, sessionId).get();
    const existing     = existingSnap.exists ? (existingSnap.data().summary || "") : "";

    const toSummarise = existing
      ? [{ role: "user", content: "Previous summary:\n" + existing }, ...oldMessages]
      : oldMessages;

    const newSummary = await generateSummary(toSummarise, jurisdiction);

    // Persist new rolling summary + delete old raw turns in a batch
    const batch = db.batch();
    batch.set(summaryRef(userId, sessionId), {
      summary         : newSummary,
      summarisedUpTo  : oldDocs[oldDocs.length - 1].data().ts,
      updatedAt       : admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const doc of oldDocs) {
      batch.delete(doc.ref);
    }

    await batch.commit();

    // Rebuild the in-memory cache to reflect summarisation
    const remaining = snap.docs.slice(cutIndex).map(d => ({
      role   : d.data().role,
      content: d.data().content,
    }));

    const freshCache = [
      { role: "user",      content: "[MEMORY CONTEXT — do not reference directly, just use as background]\n" + newSummary },
      { role: "assistant", content: "Understood. I have your previous conversation context." },
      ...remaining,
    ];
    sessionCache.set(sessionId, freshCache);

    console.log(`[Memory] ✅ Summarised. Deleted ${oldDocs.length} docs, kept ${remaining.length} raw turns.`);

  } catch (err) {
    console.error("[Memory] maybeSummarise error:", err.message);
  }
}

/**
 * clearSession
 * ────────────
 * Evict a session from the in-memory cache (e.g., on explicit new chat).
 * Does NOT delete Firestore data.
 */
function clearSession(sessionId) {
  sessionCache.delete(sessionId);
}

/**
 * loadSmartMemory  (legacy compat shim)
 * ──────────────────────────────────────
 * Returns an empty block — context is now injected via loadSessionHistory.
 */
function loadSmartMemory() {
  return { systemBlock: "", hint: "", shouldGreetByName: false };
}

/**
 * shouldSurfaceMemory  (legacy compat shim)
 */
function shouldSurfaceMemory(message) {
  if (!message) return "none";
  const m = message.toLowerCase();
  if (/\b(remember|recall|last time|previously|you said|earlier)\b/.test(m)) return "full";
  if (/\b(my name|who am i|what do i|my preference)\b/.test(m)) return "personal";
  return "none";
}

/**
 * processAndStore  (legacy compat shim — use appendTurn instead)
 */
function processAndStore() {}

module.exports = {
  // Primary API
  loadSessionHistory,
  appendTurn,
  clearSession,

  // Legacy shims (keep so nothing breaks)
  loadSmartMemory,
  shouldSurfaceMemory,
  loadRelevantConversations: () => "",
  processAndStore,
};