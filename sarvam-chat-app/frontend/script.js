/* ============================
   LAWLITE — script.js
   Full production chat logic
   v2.0 — Images + Doc Generation + Live Code
   ============================*/

'use strict';

// ── DOM refs ──
const sidebar      = document.getElementById('sidebar');
const sidebarOpen  = document.getElementById('sidebarOpen');
const sidebarClose = document.getElementById('sidebarClose');
const newChatBtn   = document.getElementById('newChatBtn');
const historyList  = document.getElementById('historyList');
const welcome      = document.getElementById('welcome');
const messages     = document.getElementById('messages');
const chatBox      = document.getElementById('chatBox');
const userInput    = document.getElementById('userInput');
const sendBtn      = document.getElementById('sendBtn');
const micBtn       = document.getElementById('micBtn');
const fileInput    = document.getElementById('fileInput');
const attachBar    = document.getElementById('attachBar');
const charCount    = document.getElementById('charCount');
const modelPill    = document.querySelector('.model-pill');
const modelDropdown= document.getElementById('modelDropdown');
const toast        = document.getElementById('toast');
const webIndicator = document.getElementById("webSearchIndicator");

// ── State ──
let isGenerating   = false;
let isRecording    = false;
let attachedFiles  = [];
let currentModel   = 'LawLite 1.1';
let toastTimer     = null;
let isWebEnabled   = false;

// ── Sample AI responses (fallback for regenerate) ──
const sampleResponses = [
  `### Analysis Complete

I've reviewed your query and here's a structured breakdown:

**Key Findings:**

The primary concern here relates to the limitation of liability clause, which is currently uncapped. Standard commercial practice requires a mutual cap — typically 12 months of fees paid. Without this, both parties carry unbounded exposure.

**Clause-by-clause review:**

1. **Section 4.2 — Indemnification**: One-sided indemnification in favor of the vendor. Recommend mutual indemnification or narrow the scope to willful misconduct.

2. **Section 7 — Governing Law**: Delaware chosen. Acceptable for US entities, but if EU operations are material, consider a dual-jurisdiction clause.

3. **Section 9 — IP Assignment**: All work-for-hire language is broad and could inadvertently assign pre-existing IP. Add a carve-out for prior inventions.

**Recommended action:** Request a redline with the above changes before execution. I can draft the specific language if needed.`,
];

// ── Sidebar toggle ──
sidebarOpen.addEventListener('click', () => sidebar.classList.remove('hidden'));
sidebarClose.addEventListener('click', () => sidebar.classList.add('hidden'));

if (window.innerWidth <= 768) sidebar.classList.add('hidden');

// ── New chat ──
newChatBtn.addEventListener('click', () => {
  messages.innerHTML = '';
  attachedFiles = [];
  attachBar.innerHTML = '';
  userInput.value = '';
  updateCharCount();
  welcome.style.display = 'block';
  if (window.LawLiteVisualizer) window.LawLiteVisualizer.closeArtifact();
  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
  showToast('New matter started');
  if (window.innerWidth <= 768) sidebar.classList.add('hidden');
});

// ── History item clicks ──
historyList.addEventListener('click', e => {
  const item = e.target.closest('.history-item');
  if (!item) return;
  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  if (window.innerWidth <= 768) sidebar.classList.add('hidden');
});

// ── Suggestion cards ──
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    userInput.value = prompt;
    autoResize();
    updateCharCount();
    sendMessage();
  });
});

// ── File upload ──
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    attachedFiles.push(file);
    renderAttachChip(file);
  });
  fileInput.value = '';
});

function renderAttachChip(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const iconMap = { pdf: '📄', doc: '📝', docx: '📝', txt: '📃', png: '🖼', jpg: '🖼', jpeg: '🖼' };
  const icon = iconMap[ext] || '📎';

  const chip = document.createElement('div');
  chip.className = 'attach-chip';
  chip.dataset.name = file.name;
  chip.innerHTML = `
    <span class="attach-chip-icon">${icon}</span>
    <span>${file.name}</span>
    <button class="attach-chip-remove" title="Remove">✕</button>
  `;
  chip.querySelector('.attach-chip-remove').addEventListener('click', () => {
    attachedFiles = attachedFiles.filter(f => f.name !== file.name);
    chip.remove();
  });
  attachBar.appendChild(chip);
}

// ── Textarea auto-resize ──
function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 240) + 'px';
}

userInput.addEventListener('input', () => { autoResize(); updateCharCount(); });

function updateCharCount() {
  const len = userInput.value.length;
  charCount.textContent = `${len.toLocaleString()} / 32k`;
  charCount.style.color = len > 30000 ? '#ef4444' : 'var(--text-muted)';
}

// ── Enter to send ──
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isGenerating) sendMessage(); }
});

sendBtn.addEventListener('click', () => { if (!isGenerating) sendMessage(); });

// ── Web search / DB toggles ──
document.getElementById('webSearchBtn').addEventListener('click', function() {
  isWebEnabled = !isWebEnabled;
  this.style.color = isWebEnabled ? 'var(--gold)' : '';
  showToast(isWebEnabled ? 'Web search enabled' : 'Web search disabled');
});

document.getElementById('dbBtn').addEventListener('click', function() {
  this.style.color = this.style.color === 'var(--gold)' ? '' : 'var(--gold)';
  showToast(this.style.color ? 'Legal DB connected' : 'Legal DB disconnected');
});

// ── Mic toggle ──
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  micBtn.addEventListener('click', () => {
    if (!isRecording) {
      isRecording = true;
      micBtn.classList.add('recording');
      userInput.placeholder = 'Listening…';
      showToast('🎤 Listening... speak now');
      recognition.start();
    } else {
      recognition.stop();
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    autoResize();
    updateCharCount();
    showToast('✅ Transcription complete');
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    userInput.placeholder = 'Ask anything — contracts, compliance, case law…';
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    showToast("⚠️ Voice input error");
    isRecording = false;
    micBtn.classList.remove('recording');
  };
} else {
  showToast("❌ Voice not supported in this browser");
}

// ══════════════════════════════════════════════
//  MAIN SEND FUNCTION
// ══════════════════════════════════════════════
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text && attachedFiles.length === 0) return;
  if (isGenerating) return;

  welcome.style.display = 'none';

  // Build user message bubble
  createMessage('user', text, attachedFiles.slice());

  const filesToSend = attachedFiles.slice();
  userInput.value = '';
  userInput.style.height = 'auto';
  attachedFiles = [];
  attachBar.innerHTML = '';
  updateCharCount();
  scrollToBottom();

  if (text && messages.children.length <= 2) addToHistory(text);

  isGenerating = true;
  sendBtn.disabled = true;

  if (isWebEnabled && webIndicator) webIndicator.classList.remove("hidden");

  const typingEl = appendTyping();
  await new Promise(r => setTimeout(r, 1200));
  typingEl.remove();
  webIndicator.classList.add("hidden");

  // ── Check if doc generation request ──
  const isDocReq = detectDocRequest(text);

  try {
    if (isDocReq) {
      await handleDocumentGeneration(text);
    } else {
      await handleChatMessage(text, filesToSend);
    }
  } catch (err) {
    console.error("Send error:", err);
    await streamBotMessage("⚠️ Error connecting to LAWLite backend. Please check your server is running.", []);
  }

  isGenerating = false;
  sendBtn.disabled = false;
}

// ── Detect document requests on frontend too (for faster UX) ──
function detectDocRequest(text) {
  return /\b(make|create|generate|build|prepare|draft)\b.{0,40}\b(ppt|powerpoint|presentation|slides|deck|pdf|report|guide|word|doc|docx|document)\b/i.test(text);
}

// ── Handle regular chat ──
async function handleChatMessage(text, filesToSend) {
  const formData = new FormData();
  formData.append("message", text);
  formData.append("web", isWebEnabled);
  filesToSend.forEach(file => formData.append("files", file));

  const res = await fetch("http://localhost:5000/chat", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  // If backend detected a doc request mid-flight
  if (data.isDocRequest) {
    await handleDocumentGeneration(text, data.requestId);
    return;
  }

  const reply = data.reply || "No response from LAWLite";
  const images = data.images || [];

  await streamBotMessage(reply, images);
}

// ── Handle document generation ──
async function handleDocumentGeneration(text, requestId) {
  // Show live coding panel
  const { group: liveGroup, codeEl } = appendLiveCode();

  try {
    const res = await fetch("http://localhost:5000/chat/generate-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: text }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    // Extract metadata from response headers
    const docType = res.headers.get("X-Doc-Type") || "document";
    const docTitle = decodeURIComponent(res.headers.get("X-Doc-Title") || "Document");
    const liveCodeRaw = decodeURIComponent(res.headers.get("X-Live-Code") || "");

    // Stream the live code into the panel
    if (liveCodeRaw) {
      await animateLiveCode(codeEl, liveCodeRaw);
    }

    // Get the file blob
    const mimeTypes = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const blob = await res.blob();
const typedBlob = new Blob([blob], { type: mimeTypes[docType] || blob.type });
const url = URL.createObjectURL(typedBlob);
    const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
      || `LawLite_Document.${docType}`;

    // Remove live code panel and show completion message
    liveGroup.remove();

    const docIcon = docType === 'pptx' ? '📊' : docType === 'pdf' ? '📄' : '📝';
    const docLabel = docType === 'pptx' ? 'PowerPoint' : docType === 'pdf' ? 'PDF Report' : 'Word Document';

    const completionMsg = `${docIcon} **Your ${docLabel} is ready!**

**${docTitle}**

Your document has been generated with professionally structured content. Click the download button below to save it.`;

    const botGroup = await streamBotMessage(completionMsg, []);

    // Inject download card
    appendDownloadCard(botGroup || messages.lastElementChild, {
      url, filename, docType, docTitle, docIcon, docLabel,
    });

  } catch (err) {
    liveGroup.remove();
    console.error("Doc gen error:", err);
    await streamBotMessage(`⚠️ Document generation failed: ${err.message}. Please try again.`, []);
  }
}

// ── Live code panel ──
function appendLiveCode() {
  const group = document.createElement('div');
  group.className = 'msg-group bot live-code-group';
  group.innerHTML = `
    <div class="msg-avatar">⚖</div>
    <div class="msg-body">
      <div class="msg-name">LawLite</div>
      <div class="live-code-panel">
        <div class="live-code-header">
          <div class="live-code-dots">
            <span class="lcd lcd-red"></span>
            <span class="lcd lcd-yellow"></span>
            <span class="lcd lcd-green"></span>
          </div>
          <span class="live-code-title">⚙ Building document…</span>
          <div class="live-code-spinner"></div>
        </div>
        <div class="live-code-body">
          <pre class="live-code-pre"><code class="live-code-content"></code></pre>
        </div>
      </div>
    </div>
  `;
  messages.appendChild(group);
  scrollToBottom();
  const codeEl = group.querySelector('.live-code-content');
  return { group, codeEl };
}

// ── Animate live code line by line ──
async function animateLiveCode(codeEl, content) {
  const lines = content.split('\n');
  let accumulated = '';

  for (const line of lines) {
    // Type each character of the line
    for (let i = 0; i < line.length; i++) {
      accumulated += line[i];
      codeEl.textContent = accumulated;
      scrollToBottom();
      await sleep(i % 3 === 0 ? 12 : 6); // variable speed for realism
    }
    accumulated += '\n';
    codeEl.textContent = accumulated;
    scrollToBottom();
    await sleep(40); // pause between lines
  }
}

// ── Download card ──
function appendDownloadCard(msgGroup, { url, filename, docType, docTitle, docIcon, docLabel }) {
  // Find or create a container after the bubble
  const body = msgGroup.querySelector?.('.msg-body') || msgGroup;

  const card = document.createElement('div');
  card.className = 'download-card';
  card.innerHTML = `
    <div class="download-card-inner">
      <div class="download-card-left">
        <span class="download-card-icon">${docIcon}</span>
        <div class="download-card-info">
          <div class="download-card-title">${escapeHtml(docTitle)}</div>
          <div class="download-card-meta">${docLabel}  •  Ready to download</div>
        </div>
      </div>
      <a href="${url}" download="${escapeHtml(filename)}" class="download-btn" onclick="showToast('Downloading ${docLabel}…')">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </a>
    </div>
    <div class="download-card-bar"></div>
  `;

  // Animate the progress bar
  const bar = card.querySelector('.download-card-bar');
  setTimeout(() => bar.classList.add('complete'), 100);

  body.appendChild(card);
  scrollToBottom();

  // Clean up blob URL after download opportunity
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

// ══════════════════════════════════════════════
//  MESSAGE CREATORS
// ══════════════════════════════════════════════
function createMessage(role, text, files) {
  const group = document.createElement('div');
  group.className = `msg-group ${role}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = role === 'user' ? 'AS' : '⚖';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const name = document.createElement('div');
  name.className = 'msg-name';
  name.textContent = role === 'user' ? (localStorage.getItem('lawlite_name') || 'You') : 'LawLite';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (files && files.length > 0) {
    const filesList = files.map(f =>
      `<span style="display:inline-flex;align-items:center;gap:5px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:100px;padding:3px 9px;font-size:12px;margin:0 4px 6px 0;">📄 ${f.name}</span>`
    ).join('');
    bubble.innerHTML += `<div style="margin-bottom:8px;">${filesList}</div>`;
  }

  if (text) bubble.innerHTML += escapeHtml(text).replace(/\n/g, '<br>');

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = role === 'bot'
    ? getBotActions()
    : getUserActions();

  body.appendChild(name);
  body.appendChild(bubble);
  body.appendChild(actions);
  group.appendChild(avatarEl);
  group.appendChild(body);
  messages.appendChild(group);

  return { group, bubble };
}

function getBotActions() {
  return `
    <button class="msg-action-btn" onclick="copyMessage(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy
    </button>
    <button class="msg-action-btn" onclick="thumbsUp(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
      Good
    </button>
    <button class="msg-action-btn" onclick="thumbsDown(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
      Poor
    </button>
    <button class="msg-action-btn" onclick="regenerate(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Regenerate
    </button>
    <button class="msg-action-btn" onclick="speakText(this.closest('.msg-body').querySelector('.msg-bubble').innerText)">
      🔊 Read
    </button>
  `;
}

function getUserActions() {
  return `
    <button class="msg-action-btn" onclick="copyMessage(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy
    </button>
    <button class="msg-action-btn" onclick="editMessage(this)">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>
  `;
}

// ══════════════════════════════════════════════
//  STREAMING BOT MESSAGE WITH IMAGES
// ══════════════════════════════════════════════
async function streamBotMessage(markdown, images = []) {
  const group = document.createElement('div');
  group.className = 'msg-group bot';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = '⚖';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const name = document.createElement('div');
  name.className = 'msg-name';
  name.textContent = 'LawLite';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = getBotActions();

  body.appendChild(name);
  body.appendChild(bubble);
  body.appendChild(actions);
  group.appendChild(avatarEl);
  group.appendChild(body);
  messages.appendChild(group);

  // Stream tokens
  const tokens = tokenise(markdown);
  let accumulated = '';

  for (const token of tokens) {
    accumulated += token;
    bubble.innerHTML = renderMarkdown(accumulated);
    scrollToBottom();
    await sleep(token.length > 3 ? 15 : 8);
  }

  // ── Render images if any ──
  if (images && images.length > 0) {
    renderImageGrid(body, images);
  }

  // ── Show Me injection (visualizer) ──
  if (window.LawLiteVisualizer) {
    window.LawLiteVisualizer.injectShowMeButton(group, markdown);
    const autoTriggers = ['📋 What Is This Document', '🔴', '🟡', '```html'];
    const shouldAutoShow = autoTriggers.some(t => markdown.includes(t));
    if (shouldAutoShow) {
      setTimeout(() => window.LawLiteVisualizer.analyseAndShow(markdown), 600);
    }
  }

  return group;
}

// ══════════════════════════════════════════════
//  IMAGE GRID RENDERER
//  ChatGPT-style contextual image cards
// ══════════════════════════════════════════════
function renderImageGrid(bodyEl, images) {
  if (!images || images.length === 0) return;

  const grid = document.createElement('div');
  grid.className = 'image-grid';

  images.forEach((img, i) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.animationDelay = `${i * 0.08}s`;

    card.innerHTML = `
      <div class="image-card-img-wrap">
        <img
          src="${img.medium || img.url}"
          alt="${escapeHtml(img.alt || 'Legal context image')}"
          loading="lazy"
          onerror="this.closest('.image-card').style.display='none'"
        />
        <div class="image-card-overlay">
          <a href="${img.pexelsUrl}" target="_blank" rel="noopener" class="image-card-pexels" title="View on Pexels">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2"/></svg>
          </a>
        </div>
      </div>
      <div class="image-card-credit">
        📸 <a href="${img.photographerUrl}" target="_blank" rel="noopener">${escapeHtml(img.photographer)}</a>
        <span>via Pexels</span>
      </div>
    `;

    // Click to expand
    card.querySelector('.image-card-img-wrap').addEventListener('click', (e) => {
      if (e.target.closest('.image-card-pexels')) return;
      openImageLightbox(img);
    });

    grid.appendChild(card);
  });

  bodyEl.appendChild(grid);
  scrollToBottom();
}

// ── Lightbox ──
function openImageLightbox(img) {
  // Remove existing lightbox
  document.getElementById('lawliteLightbox')?.remove();

  const lb = document.createElement('div');
  lb.id = 'lawliteLightbox';
  lb.className = 'lightbox';
  lb.innerHTML = `
    <div class="lightbox-backdrop"></div>
    <div class="lightbox-content">
      <button class="lightbox-close">✕</button>
      <img src="${img.large || img.url}" alt="${escapeHtml(img.alt || '')}" />
      <div class="lightbox-caption">
        Photo by <a href="${img.photographerUrl}" target="_blank" rel="noopener">${escapeHtml(img.photographer)}</a>
        on <a href="${img.pexelsUrl}" target="_blank" rel="noopener">Pexels</a>
      </div>
    </div>
  `;

  lb.querySelector('.lightbox-backdrop').addEventListener('click', () => lb.remove());
  lb.querySelector('.lightbox-close').addEventListener('click', () => lb.remove());
  lb.addEventListener('keydown', e => { if (e.key === 'Escape') lb.remove(); });

  document.body.appendChild(lb);
  requestAnimationFrame(() => lb.classList.add('open'));
}

// ── Typing indicator ──
function appendTyping() {
  const group = document.createElement('div');
  group.className = 'msg-group bot';
  group.style.animation = 'fadeUp 0.2s ease both';

  group.innerHTML = `
    <div class="msg-avatar">⚖</div>
    <div class="msg-body">
      <div class="msg-name">LawLite</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  messages.appendChild(group);
  scrollToBottom();
  return group;
}

// ── Markdown renderer ──
function renderMarkdown(md) {
  let html = escapeHtml(md);

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>|<ol>|<blockquote>|<pre>)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/blockquote>|<\/pre>)<\/p>/g, '$1');
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ── Tokenise for streaming ──
function tokenise(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const match = text.slice(i).match(/^(\S+\s*)/);
    if (match) { tokens.push(match[1]); i += match[1].length; }
    else { tokens.push(text[i]); i++; }
  }
  return tokens;
}

// ── History ──
function addToHistory(text) {
  const title = text.length > 40 ? text.slice(0, 40) + '…' : text;
  const icons = ['📄','⚖','📋','🏛','🔍','✍'];
  const icon = icons[Math.floor(Math.random() * icons.length)];

  const item = document.createElement('div');
  item.className = 'history-item active';
  item.innerHTML = `
    <span class="history-icon">${icon}</span>
    <div class="history-text">
      <div class="history-title">${escapeHtml(title)}</div>
      <div class="history-meta">Just now</div>
    </div>
  `;

  item.addEventListener('click', () => {
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });

  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
  historyList.prepend(item);
}

// ── Action handlers ──
function copyMessage(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  navigator.clipboard.writeText(bubble.innerText).then(() => showToast('Copied to clipboard'));
}

function thumbsUp(btn) { btn.style.color = 'var(--gold)'; showToast('Thanks for the feedback!'); }
function thumbsDown(btn) { btn.style.color = '#ef4444'; showToast("Feedback noted — we'll improve"); }

async function regenerate(btn) {
  if (isGenerating) return;
  btn.closest('.msg-group').remove();
  isGenerating = true;
  sendBtn.disabled = true;
  const typingEl = appendTyping();
  await sleep(900 + Math.random() * 600);
  typingEl.remove();
  await streamBotMessage(sampleResponses[Math.floor(Math.random() * sampleResponses.length)], []);
  isGenerating = false;
  sendBtn.disabled = false;
}

function editMessage(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  userInput.value = bubble.innerText;
  autoResize();
  updateCharCount();
  userInput.focus();
  showToast('Message loaded for editing');
}

async function speakText(text) {
  try {
    const res = await fetch("http://localhost:5000/chat/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      showToast("TTS failed on server ❌");
      return;
    }

    const blob = await res.blob();
    if (blob.size === 0) { showToast("No audio received ❌"); return; }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => showToast("Click again to allow sound 🔊"));
  } catch (err) {
    console.error("TTS error:", err);
    showToast("Voice failed ❌");
  }
}

// ── Toast ──
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ── Read aloud ──
function readAloud(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  const text = bubble.innerText;

  if (speechSynthesis.speaking) { speechSynthesis.cancel(); showToast("⏹ Stopped"); return; }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = speechSynthesis.getVoices();
  const bestVoice =
    voices.find(v => v.name.includes("Google")) ||
    voices.find(v => v.name.includes("Microsoft")) ||
    voices.find(v => v.lang === "en-IN") ||
    voices[0];

  if (bestVoice) utterance.voice = bestVoice;
  showToast("🔊 Reading aloud...");
  speechSynthesis.speak(utterance);
}

speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ── Utilities ──
function scrollToBottom() { chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Send btn state ──
userInput.addEventListener('input', () => {
  sendBtn.disabled = userInput.value.trim().length === 0 && attachedFiles.length === 0;
});
sendBtn.disabled = true;