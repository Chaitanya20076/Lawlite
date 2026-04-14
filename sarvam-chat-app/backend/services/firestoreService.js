"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — firestoreService.js  (v2)               ║
 * ║     Conversation metadata persistence via Firebase Admin    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * FIX: orderBy("updatedAt") requires a composite index when combined
 * with collection-group queries. We use a simple .get() + JS sort
 * as the fallback so it never crashes even if the index is missing.
 */

const admin = require("firebase-admin");

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

/**
 * Save or update a conversation METADATA summary in Firestore.
 * Path: conversations/{userId}/chats/{sessionId}
 *
 * NOTE: This stores high-level metadata (title, summary, counts).
 *       The actual message turns are stored by memory.engine.js
 *       under messages/{userId}/sessions/{sessionId}/turns/
 */
async function saveConversation({
  userId,
  sessionId,
  summary,
  title,
  messageCount,
  jurisdiction,
  lastMessage,
  langCode,
}) {
  if (!userId || !sessionId) return false;

  try {
    const ref = db
      .collection("conversations")
      .doc(userId)
      .collection("chats")
      .doc(sessionId);

    await ref.set(
      {
        sessionId,
        summary      : summary   || "",
        title        : title     || "Untitled Chat",
        messageCount : messageCount || 0,
        jurisdiction : jurisdiction || "India",
        lastMessage  : lastMessage  || "",
        langCode     : langCode     || "en",
        updatedAt    : admin.firestore.FieldValue.serverTimestamp(),
        createdAt    : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // merge:true so createdAt isn't overwritten on updates
    );

    console.log(`[Firestore] ✅ Saved metadata for session ${sessionId} | user ${userId}`);
    return true;
  } catch (err) {
    console.error("[Firestore] saveConversation error:", err.message);
    return false;
  }
}

/**
 * Get all conversation metadata for a user, sorted by most recent.
 *
 * We try the ordered query first (requires Firestore composite index).
 * If it fails (index not yet built), we fall back to unordered + JS sort.
 */
async function getUserConversations(userId) {
  if (!userId) return [];

  try {
    let snapshot;

    try {
      // Preferred: server-side ordering (requires composite index)
      snapshot = await db
        .collection("conversations")
        .doc(userId)
        .collection("chats")
        .orderBy("updatedAt", "desc")
        .limit(30)
        .get();
    } catch (indexErr) {
      // Fallback: fetch all then sort in JS (works without index)
      console.warn("[Firestore] Composite index missing, using JS sort fallback:", indexErr.message);
      snapshot = await db
        .collection("conversations")
        .doc(userId)
        .collection("chats")
        .limit(30)
        .get();
    }

    const docs = snapshot.docs.map(doc => doc.data());

    // Sort in JS as a safety net
    docs.sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() || a.updatedAt?._seconds * 1000 || 0;
      const tb = b.updatedAt?.toMillis?.() || b.updatedAt?._seconds * 1000 || 0;
      return tb - ta;
    });

    return docs;
  } catch (err) {
    console.error("[Firestore] getUserConversations error:", err.message);
    return [];
  }
}

/**
 * Delete a specific conversation's metadata doc.
 * (Raw turns are deleted by memory.engine.js during summarisation.)
 */
async function deleteConversation(userId, sessionId) {
  if (!userId || !sessionId) return false;

  try {
    await db
      .collection("conversations")
      .doc(userId)
      .collection("chats")
      .doc(sessionId)
      .delete();

    console.log(`[Firestore] 🗑 Deleted conversation ${sessionId} for user ${userId}`);
    return true;
  } catch (err) {
    console.error("[Firestore] deleteConversation error:", err.message);
    return false;
  }
}

module.exports = { saveConversation, getUserConversations, deleteConversation };