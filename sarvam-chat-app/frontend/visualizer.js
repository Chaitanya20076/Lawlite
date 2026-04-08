/* ============================================================
   LAWLITE — visualizer.js
   "Show Me" feature — Claude-style artifact panel
   Detects visual/structured content in AI replies and renders
   them as animated artifact panels beside the chat.
   ============================================================ */

'use strict';

// ── Artifact Panel State ──
let artifactOpen   = false;
let artifactHistory = [];   // stack of rendered artifacts
let currentArtifact = null;

// ── Inject artifact shell into DOM (called once on load) ──
function initVisualizer() {
  if (document.getElementById('artifactShell')) return;

  const shell = document.createElement('div');
  shell.id = 'artifactShell';
  shell.className = 'artifact-shell hidden';
  shell.innerHTML = `
    <div class="artifact-header">
      <div class="artifact-header-left">
        <span class="artifact-dot"></span>
        <span class="artifact-title" id="artifactTitle">Preview</span>
        <span class="artifact-badge" id="artifactBadge">LIVE</span>
      </div>
      <div class="artifact-header-right">
        <button class="artifact-icon-btn" id="artifactCopyBtn" title="Copy content">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="artifact-icon-btn" id="artifactExpandBtn" title="Fullscreen">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
        <button class="artifact-icon-btn" id="artifactCloseBtn" title="Close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <div class="artifact-tabs" id="artifactTabs"></div>

    <div class="artifact-body" id="artifactBody">
      <div class="artifact-loading" id="artifactLoading">
        <div class="artifact-spinner"></div>
        <span>Rendering…</span>
      </div>
      <iframe id="artifactFrame" class="artifact-frame" sandbox="allow-scripts allow-same-origin" title="LawLite Preview"></iframe>
      <div class="artifact-code-view hidden" id="artifactCodeView"></div>
    </div>

    <div class="artifact-footer">
      <button class="artifact-footer-btn" id="artifactCodeToggle">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Code
      </button>
      <div class="artifact-footer-center" id="artifactNavigation"></div>
      <button class="artifact-footer-btn" id="artifactNewWindow" title="Open in new tab">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open
      </button>
    </div>
  `;

  document.querySelector('.shell').appendChild(shell);
  bindArtifactEvents();
}

// ── Bind all artifact UI events ──
function bindArtifactEvents() {
  document.getElementById('artifactCloseBtn').addEventListener('click', closeArtifact);
  document.getElementById('artifactExpandBtn').addEventListener('click', toggleFullscreen);
  document.getElementById('artifactCopyBtn').addEventListener('click', copyArtifactContent);
  document.getElementById('artifactCodeToggle').addEventListener('click', toggleCodeView);
  document.getElementById('artifactNewWindow').addEventListener('click', openInNewWindow);
}

// ─────────────────────────────────────────────
//  DETECTION ENGINE
//  Scans AI reply text for renderable content
// ─────────────────────────────────────────────

const DETECTORS = [
  {
    name    : 'HTML',
    badge   : 'HTML',
    icon    : '🌐',
    detect  : text => /```html[\s\S]*?```/i.test(text) || /<(!DOCTYPE|html|table|div|ul|ol|form)[^>]*>/i.test(text),
    extract : text => {
      const fence = text.match(/```html\n?([\s\S]*?)```/i);
      if (fence) return fence[1].trim();
      return null;
    },
    render  : (content, frame) => renderHTML(content, frame),
  },
  {
    name    : 'Table',
    badge   : 'TABLE',
    icon    : '📊',
    detect  : text => {
      const lines = text.split('\n');
      const tableLines = lines.filter(l => l.trim().startsWith('|') && l.includes('|'));
      return tableLines.length >= 3;
    },
    extract : text => {
      const lines = text.split('\n');
      const start = lines.findIndex(l => l.trim().startsWith('|'));
      if (start === -1) return null;
      let end = start;
      while (end < lines.length && (lines[end].trim().startsWith('|') || lines[end].trim() === '')) end++;
      return lines.slice(start, end).join('\n');
    },
    render  : (content, frame) => renderTable(content, frame),
  },
  {
    name    : 'Clause Risk Analysis',
    badge   : 'RISK',
    icon    : '⚠️',
    detect  : text => {
      const hasRisk = (text.match(/🔴|🟡|🟢/g) || []).length >= 2;
      const hasSection = /##\s*(⚠️|Things to Watch|Risk|Clause)/i.test(text);
      return hasRisk && hasSection;
    },
    extract : text => text,
    render  : (content, frame) => renderRiskDashboard(content, frame),
  },
  {
    name    : 'Document Summary',
    badge   : 'DOC',
    icon    : '📋',
    detect  : text => {
      const hasDocFormat = /##\s*📋\s*What Is This Document/i.test(text);
      const hasSections  = (text.match(/^##\s/gm) || []).length >= 3;
      return hasDocFormat || (hasSections && text.length > 800);
    },
    extract : text => text,
    render  : (content, frame) => renderDocSummary(content, frame),
  },
  {
    name    : 'Comparison',
    badge   : 'COMPARE',
    icon    : '⚖️',
    detect  : text => {
      const hasVs = /\bvs\.?\b|\bversus\b|\bcompare\b|\bcomparison\b/i.test(text);
      const hasList = (text.match(/^[\-\*]\s/gm) || []).length >= 4;
      return hasVs && hasList;
    },
    extract : text => text,
    render  : (content, frame) => renderComparison(content, frame),
  },
  {
    name    : 'Step-by-Step',
    badge   : 'STEPS',
    icon    : '📋',
    detect  : text => {
      const numbered = (text.match(/^\d+\.\s/gm) || []).length;
      return numbered >= 4;
    },
    extract : text => text,
    render  : (content, frame) => renderSteps(content, frame),
  },
];

// ── Main: analyse reply and show artifact if warranted ──
function analyseAndShow(replyText) {
  for (const detector of DETECTORS) {
    if (detector.detect(replyText)) {
      const content = detector.extract(replyText);
      if (content) {
        showArtifact(detector, content, replyText);
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────
//  SHOW / HIDE ARTIFACT
// ─────────────────────────────────────────────

function showArtifact(detector, content, rawText) {
  initVisualizer();

  const shell = document.getElementById('artifactShell');
  const title = document.getElementById('artifactTitle');
  const badge = document.getElementById('artifactBadge');
  const frame = document.getElementById('artifactFrame');
  const loading = document.getElementById('artifactLoading');

  // Push to history
  const entry = { detector, content, rawText, timestamp: Date.now() };
  artifactHistory.push(entry);
  currentArtifact = entry;

  // Update header
  title.textContent = detector.name;
  badge.textContent = detector.badge;
  badge.className   = `artifact-badge badge-${detector.badge.toLowerCase()}`;

  // Show shell with animation
  shell.classList.remove('hidden');
  requestAnimationFrame(() => shell.classList.add('visible'));

  // Expand main area
  expandMainForArtifact();

  // Show loading
  loading.style.display = 'flex';
  frame.style.opacity   = '0';

  // Render after tiny delay for animation
  setTimeout(() => {
    detector.render(content, frame);
    updateNavigation();
  }, 300);

  artifactOpen = true;
}

function closeArtifact() {
  const shell = document.getElementById('artifactShell');
  shell.classList.remove('visible');
  setTimeout(() => {
    shell.classList.add('hidden');
    collapseMainFromArtifact();
  }, 350);
  artifactOpen = false;
}

function expandMainForArtifact() {
  const main = document.getElementById('main');
  main.classList.add('artifact-mode');
}

function collapseMainFromArtifact() {
  const main = document.getElementById('main');
  main.classList.remove('artifact-mode');
}

function toggleFullscreen() {
  const shell = document.getElementById('artifactShell');
  shell.classList.toggle('artifact-fullscreen');
}

function openInNewWindow() {
  if (!currentArtifact) return;
  const frame = document.getElementById('artifactFrame');
  const w = window.open('', '_blank');
  w.document.write(frame.srcdoc || '<p>No content</p>');
  w.document.close();
}

function copyArtifactContent() {
  if (!currentArtifact) return;
  navigator.clipboard.writeText(currentArtifact.rawText).then(() => {
    showToast('Content copied');
  });
}

function toggleCodeView() {
  const frame    = document.getElementById('artifactFrame');
  const codeView = document.getElementById('artifactCodeView');
  const btn      = document.getElementById('artifactCodeToggle');

  if (codeView.classList.contains('hidden')) {
    codeView.classList.remove('hidden');
    frame.style.display = 'none';
    btn.style.color = 'var(--gold)';

    const pre = document.createElement('pre');
    pre.textContent = currentArtifact?.content || '';
    codeView.innerHTML = '';
    codeView.appendChild(pre);
  } else {
    codeView.classList.add('hidden');
    frame.style.display = 'block';
    btn.style.color = '';
  }
}

function updateNavigation() {
  const nav = document.getElementById('artifactNavigation');
  if (artifactHistory.length <= 1) {
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = artifactHistory.map((_, i) =>
    `<button class="artifact-nav-dot ${i === artifactHistory.length - 1 ? 'active' : ''}"
      onclick="jumpToArtifact(${i})"></button>`
  ).join('');
}

function jumpToArtifact(index) {
  const entry = artifactHistory[index];
  if (!entry) return;
  currentArtifact = entry;
  const frame = document.getElementById('artifactFrame');
  const title = document.getElementById('artifactTitle');
  const badge = document.getElementById('artifactBadge');
  title.textContent = entry.detector.name;
  badge.textContent = entry.detector.badge;
  entry.detector.render(entry.content, frame);
  document.querySelectorAll('.artifact-nav-dot').forEach((d, i) =>
    d.classList.toggle('active', i === index)
  );
}

// ─────────────────────────────────────────────
//  RENDERERS
// ─────────────────────────────────────────────

function frameReady(frame) {
  const loading = document.getElementById('artifactLoading');
  loading.style.display = 'none';
  frame.style.opacity   = '1';
  frame.style.transition = 'opacity 0.4s ease';
}

// ── HTML Renderer ──
function renderHTML(content, frame) {
  const baseStyles = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'DM Sans', system-ui, sans-serif;
        background: #0d0f11;
        color: #f0ece4;
        padding: 20px;
        line-height: 1.6;
      }
      a { color: #c9a84c; }
      table { border-collapse: collapse; width: 100%; }
      th, td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
      th { background: rgba(201,168,76,0.12); color: #c9a84c; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  `;

  const full = content.toLowerCase().startsWith('<!doctype') || content.toLowerCase().startsWith('<html')
    ? content
    : `<!DOCTYPE html><html><head>${baseStyles}</head><body>${content}</body></html>`;

  frame.srcdoc = full;
  frame.onload = () => frameReady(frame);
}

// ── Table Renderer ──
function renderTable(markdown, frame) {
  const lines = markdown.trim().split('\n').filter(l => l.trim().startsWith('|'));
  const rows  = lines.map(l =>
    l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  ).filter(r => !r.every(c => /^[-:]+$/.test(c)));

  if (rows.length === 0) return;

  const headers = rows[0];
  const body    = rows.slice(1);

  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${body.map((row, i) => `
          <tr style="animation: rowIn 0.3s ease ${0.05 * i}s both">
            ${row.map((cell, ci) => `
              <td>
                ${ci === 0 ? `<span class="row-num">${i + 1}</span>` : ''}
                ${formatCell(cell)}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const html = `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #0d0f11; color: #f0ece4; padding: 24px; }
      @keyframes rowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      thead th {
        background: rgba(201,168,76,0.1);
        color: #c9a84c;
        font-weight: 500;
        padding: 12px 14px;
        text-align: left;
        border-bottom: 1px solid rgba(201,168,76,0.3);
        letter-spacing: 0.04em;
        font-size: 11px;
        text-transform: uppercase;
      }
      tbody tr {
        border-bottom: 1px solid rgba(255,255,255,0.05);
        transition: background 0.15s;
      }
      tbody tr:hover { background: rgba(255,255,255,0.03); }
      td {
        padding: 11px 14px;
        color: #d4d0c8;
        vertical-align: top;
        line-height: 1.5;
        position: relative;
      }
      .row-num {
        display: inline-block;
        width: 20px;
        height: 20px;
        background: rgba(201,168,76,0.12);
        color: #c9a84c;
        border-radius: 4px;
        font-size: 10px;
        text-align: center;
        line-height: 20px;
        margin-right: 8px;
        font-family: 'DM Mono', monospace;
        vertical-align: middle;
      }
      .risk-high   { color: #ef4444; font-weight: 500; }
      .risk-medium { color: #f59e0b; font-weight: 500; }
      .risk-low    { color: #22c55e; font-weight: 500; }
    </style>
  </head><body>${tableHtml}</body></html>`;

  frame.srcdoc = html;
  frame.onload = () => frameReady(frame);
}

function formatCell(cell) {
  if (/high|🔴/i.test(cell))   return `<span class="risk-high">${cell}</span>`;
  if (/medium|🟡/i.test(cell)) return `<span class="risk-medium">${cell}</span>`;
  if (/low|🟢/i.test(cell))    return `<span class="risk-low">${cell}</span>`;
  return cell;
}

// ── Risk Dashboard Renderer ──
function renderRiskDashboard(text, frame) {
  // Extract flagged items (🔴 🟡 🟢)
  const items = [];
  const lines = text.split('\n');

  lines.forEach(line => {
    const highMatch   = line.match(/🔴\s*(.+)/);
    const medMatch    = line.match(/🟡\s*(.+)/);
    const lowMatch    = line.match(/🟢\s*(.+)/);

    if (highMatch)   items.push({ risk: 'high',   label: highMatch[1].trim() });
    else if (medMatch)  items.push({ risk: 'medium', label: medMatch[1].trim() });
    else if (lowMatch)  items.push({ risk: 'low',    label: lowMatch[1].trim() });
  });

  const high   = items.filter(i => i.risk === 'high').length;
  const medium = items.filter(i => i.risk === 'medium').length;
  const low    = items.filter(i => i.risk === 'low').length;
  const total  = items.length;

  const overallRisk = high > 0 ? 'HIGH' : medium > 1 ? 'MEDIUM' : 'LOW';
  const overallColor = high > 0 ? '#ef4444' : medium > 1 ? '#f59e0b' : '#22c55e';

  const itemsHtml = items.map((item, i) => {
    const color = item.risk === 'high' ? '#ef4444' : item.risk === 'medium' ? '#f59e0b' : '#22c55e';
    const bg    = item.risk === 'high' ? 'rgba(239,68,68,0.08)' : item.risk === 'medium' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)';
    const label = item.risk.toUpperCase();
    return `
      <div class="risk-item" style="animation-delay: ${0.06 * i}s; border-left: 3px solid ${color}; background: ${bg};">
        <div class="risk-label" style="color: ${color};">${label}</div>
        <div class="risk-text">${item.label.replace(/\*\*/g, '')}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Fraunces:ital,wght@1,300&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #0d0f11; color: #f0ece4; padding: 20px; min-height: 100vh; }
      @keyframes fadeUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: none; } }
      @keyframes scaleIn { from { opacity:0; transform: scale(0.9); } to { opacity:1; transform: scale(1); } }

      .header { animation: scaleIn 0.4s ease both; }
      .score-ring {
        width: 80px; height: 80px;
        border-radius: 50%;
        border: 3px solid ${overallColor};
        display: flex; align-items: center; justify-content: center;
        flex-direction: column;
        margin: 0 auto 12px;
        box-shadow: 0 0 20px ${overallColor}33;
        animation: scaleIn 0.5s ease both;
      }
      .score-label { font-size: 11px; font-weight: 500; color: ${overallColor}; letter-spacing: 0.08em; margin-top: 16px; text-align: center; text-transform: uppercase; }
      .score-word { font-size: 15px; font-weight: 500; color: ${overallColor}; }

      .stats-row {
        display: flex; gap: 8px; margin: 16px 0;
        animation: fadeUp 0.4s ease 0.1s both;
      }
      .stat {
        flex: 1; background: #13161a; border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px; padding: 10px; text-align: center;
      }
      .stat-num { font-size: 22px; font-weight: 500; line-height: 1; }
      .stat-name { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }

      .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #555; margin: 16px 0 8px; }

      .risk-item {
        border-radius: 8px; padding: 10px 12px; margin-bottom: 7px;
        animation: fadeUp 0.35s ease both;
        display: flex; align-items: flex-start; gap: 10px;
      }
      .risk-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0; margin-top: 2px; min-width: 46px; }
      .risk-text { font-size: 12.5px; color: #c8c4bc; line-height: 1.4; }
    </style>
  </head><body>
    <div class="header">
      <div class="score-ring">
        <div class="score-word">${overallRisk}</div>
      </div>
      <div class="score-label">Overall Risk Level</div>
    </div>

    <div class="stats-row">
      <div class="stat">
        <div class="stat-num" style="color:#ef4444">${high}</div>
        <div class="stat-name">High</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#f59e0b">${medium}</div>
        <div class="stat-name">Medium</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#22c55e">${low}</div>
        <div class="stat-name">Low</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#c9a84c">${total}</div>
        <div class="stat-name">Total</div>
      </div>
    </div>

    <div class="section-label">Flagged Items</div>
    ${itemsHtml || '<div style="color:#555;font-size:13px;padding:12px 0">No specific items flagged</div>'}
  </body></html>`;

  frame.srcdoc = html;
  frame.onload = () => frameReady(frame);
}

// ── Document Summary Renderer ──
function renderDocSummary(text, frame) {
  // Extract sections
  const sections = [];
  const parts    = text.split(/^##\s/m).filter(Boolean);

  parts.forEach(part => {
    const lines   = part.trim().split('\n');
    const heading = lines[0].trim();
    const body    = lines.slice(1).join('\n').trim();
    if (heading && body) sections.push({ heading, body });
  });

  // Emoji icon map
  const iconMap = { '📋': '#3b82f6', '🔍': '#8b5cf6', '⚠️': '#ef4444', '✅': '#22c55e', '💬': '#c9a84c', '🤔': '#f59e0b', '⚡': '#ef4444' };

  const sectionsHtml = sections.map((s, i) => {
    const emoji = (s.heading.match(/[\u{1F300}-\u{1FAFF}]/u) || ['📄'])[0];
    const color = iconMap[emoji] || '#c9a84c';
    const cleanHeading = s.heading.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
    const bodyHtml = s.body
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n/g, '<br>');

    return `
      <div class="section" style="animation-delay: ${0.08 * i}s">
        <div class="section-head">
          <span class="section-emoji">${emoji}</span>
          <span class="section-title" style="color:${color}">${cleanHeading}</span>
        </div>
        <div class="section-body">${bodyHtml}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Fraunces:ital,wght@1,300&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #0d0f11; color: #f0ece4; padding: 20px; }
      @keyframes fadeUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform:none; } }

      .section {
        background: #13161a;
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 10px;
        animation: fadeUp 0.35s ease both;
      }
      .section-head {
        display: flex; align-items: center; gap: 8px;
        margin-bottom: 8px; padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .section-emoji { font-size: 16px; }
      .section-title { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
      .section-body { font-size: 13px; color: #b8b4ac; line-height: 1.65; }
      .section-body ul { padding-left: 16px; margin: 6px 0; }
      .section-body li { margin-bottom: 4px; }
      .section-body strong { color: #f0ece4; font-weight: 500; }
    </style>
  </head><body>${sectionsHtml}</body></html>`;

  frame.srcdoc = html;
  frame.onload = () => frameReady(frame);
}

// ── Comparison Renderer ──
function renderComparison(text, frame) {
  // Try to find two sides being compared
  const lines = text.split('\n');
  const bullets = lines.filter(l => /^[-*]\s/.test(l.trim())).map(l => l.replace(/^[-*]\s/, '').trim());

  // Simple two-column layout for comparisons
  const half = Math.ceil(bullets.length / 2);
  const col1 = bullets.slice(0, half);
  const col2 = bullets.slice(half);

  // Extract title from first heading
  const titleMatch = text.match(/^#{1,3}\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/[#*]/g, '').trim() : 'Comparison';

  const html = `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #0d0f11; color: #f0ece4; padding: 20px; }
      @keyframes fadeUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }

      h2 { font-size: 15px; font-weight: 500; color: #c9a84c; margin-bottom: 16px; letter-spacing: -0.01em; animation: fadeUp 0.3s ease both; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .col { background: #13161a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; animation: fadeUp 0.35s ease both; }
      .col:last-child { animation-delay: 0.08s; }
      .col-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 10px; }
      .item { display: flex; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #c8c4bc; line-height: 1.4; }
      .dot { width: 5px; height: 5px; border-radius: 50%; background: #c9a84c; flex-shrink: 0; margin-top: 7px; }
    </style>
  </head><body>
    <h2>${title}</h2>
    <div class="grid">
      <div class="col">
        <div class="col-title">Points</div>
        ${col1.map(b => `<div class="item"><span class="dot"></span><span>${b}</span></div>`).join('')}
      </div>
      <div class="col">
        <div class="col-title">Points (cont.)</div>
        ${col2.map(b => `<div class="item"><span class="dot"></span><span>${b}</span></div>`).join('')}
      </div>
    </div>
  </body></html>`;

  frame.srcdoc = html;
  frame.onload = () => frameReady(frame);
}

// ── Steps Renderer ──
function renderSteps(text, frame) {
  const stepRegex = /^(\d+)\.\s+(.+)$/gm;
  const steps = [];
  let match;
  while ((match = stepRegex.exec(text)) !== null) {
    steps.push({ num: match[1], text: match[2].trim() });
  }

  const stepsHtml = steps.map((s, i) => `
    <div class="step" style="animation-delay: ${0.07 * i}s">
      <div class="step-num">${s.num}</div>
      <div class="step-content">
        <div class="step-text">${s.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>
        ${i < steps.length - 1 ? '<div class="step-line"></div>' : ''}
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #0d0f11; color: #f0ece4; padding: 20px; }
      @keyframes fadeUp { from { opacity:0; transform: translateX(-10px); } to { opacity:1; transform:none; } }

      .step { display: flex; gap: 14px; animation: fadeUp 0.3s ease both; }
      .step-num {
        width: 28px; height: 28px; flex-shrink: 0;
        background: rgba(201,168,76,0.12);
        border: 1px solid rgba(201,168,76,0.3);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-family: 'DM Mono', monospace;
        font-size: 11px; color: #c9a84c;
        margin-top: 2px;
      }
      .step-content { flex: 1; padding-bottom: 16px; position: relative; }
      .step-text { font-size: 13.5px; color: #c8c4bc; line-height: 1.55; }
      .step-text strong { color: #f0ece4; font-weight: 500; }
      .step-line {
        position: absolute; left: -21px; top: 32px; bottom: 0;
        width: 1px; background: rgba(201,168,76,0.15);
      }
    </style>
  </head><body>${stepsHtml}</body></html>`;

  frame.srcdoc = html;
  frame.onload = () => frameReady(frame);
}

// ─────────────────────────────────────────────
//  SHOW ME BUTTON (injected into each bot message)
// ─────────────────────────────────────────────

function injectShowMeButton(msgGroup, replyText) {
  // Check if content is worth showing
  const worth = DETECTORS.some(d => d.detect(replyText));
  if (!worth) return;

  const actions = msgGroup.querySelector('.msg-actions');
  if (!actions) return;

  // Avoid duplicate
  if (actions.querySelector('.show-me-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'msg-action-btn show-me-btn';
  btn.innerHTML = `
    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
    Show me
  `;
  btn.style.cssText = 'color: var(--gold); border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.06);';

  btn.addEventListener('click', () => {
    analyseAndShow(replyText);
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  });

  // Insert as first button
  actions.insertBefore(btn, actions.firstChild);
}

// ─────────────────────────────────────────────
//  EXPORTS (global, no module system needed)
// ─────────────────────────────────────────────

window.LawLiteVisualizer = {
  analyseAndShow,
  injectShowMeButton,
  closeArtifact,
  initVisualizer,
};