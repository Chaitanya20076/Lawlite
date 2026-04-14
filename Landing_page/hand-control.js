/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         LAWLITE — HAND GESTURE CONTROL  v4  (FINAL)                 ║
 * ║                                                                      ║
 * ║  Architecture: FSM gesture classifier + motion tracker              ║
 * ║  Gestures NEVER bleed into scroll — shape is classified first,      ║
 * ║  motion is only used inside specific gesture states.                ║
 * ║                                                                      ║
 * ║  GESTURE MAP (from reference repo, adapted for browser):            ║
 * ║  ┌─────────────────────────────┬───────────────────────────────┐    ║
 * ║  │ All 5 fingers up + move     │ SCROLL (pan)                  │    ║
 * ║  │ Thumb closed, 4 up          │ FREEZE  (cursor stops)        │    ║
 * ║  │ Only index up               │ RIGHT-CLICK                   │    ║
 * ║  │ Only middle up              │ LEFT-CLICK                    │    ║
 * ║  │ Index + middle up           │ DOUBLE-CLICK                  │    ║
 * ║  │ Fist (all closed)           │ DRAG mode                     │    ║
 * ║  │ Pinch (thumb+index close)   │ ZOOM toggle                   │    ║
 * ║  │   while pinching + move up  │ ZOOM IN                       │    ║
 * ║  │   while pinching + move dn  │ ZOOM OUT                      │    ║
 * ║  └─────────────────────────────┴───────────────────────────────┘    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     TUNING CONSTANTS
  ═══════════════════════════════════════════════════════ */
  var C = {
    INTERVAL_MS:     40,    // run detection every N ms (~25fps)
    HOLD_FRAMES:     5,     // gesture must be same for N frames to activate
    DEAD_ZONE:       0.018, // normalised palm movement below this = ignored
    SCROLL_Y:        14,    // scroll sensitivity vertical
    SCROLL_X:        8,     // scroll sensitivity horizontal
    SMOOTH:          0.30,  // velocity smoothing (higher = more responsive)
    PINCH_RATIO:     0.32,  // thumb-index dist / palm-width threshold
    CLICK_CD_MS:     600,   // min ms between clicks
    DBLCLICK_MS:     350,   // window for double-click detection
    ZOOM_STEP:       0.018, // zoom per frame while pinching+moving
    ZOOM_MIN:        0.55,
    ZOOM_MAX:        2.2,
    SCROLL_V_THRESH: 0.006, // min velocity to actually scroll
  };

  /* ═══════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════ */
  var S = {
    active: false,
    model: null,
    video: null,
    rafId: null,
    lastMs: 0,

    /* gesture FSM */
    gesture: 'none',       // current classified gesture
    prevGesture: 'none',
    holdCount: 0,          // frames current gesture has been stable
    confirmedGesture: 'none', // gesture after debounce

    /* motion */
    prevPalm: null,
    velX: 0, velY: 0,

    /* clicks */
    lastClickMs: 0,
    lastClickType: '',

    /* zoom */
    zoom: 1,
    pinchMoveAccum: 0,

    /* drag */
    dragging: false,
  };

  /* ═══════════════════════════════════════════════════════
     FINGER STATE CLASSIFIER
     Returns array of 5 booleans [thumb, index, middle, ring, pinky]
     true = finger is UP / extended
  ═══════════════════════════════════════════════════════ */
  function fingersUp(lm) {
    // lm[i] = [x, y, z]
    // Tip ids:   4,  8, 12, 16, 20
    // MCP ids:   2,  5,  9, 13, 17  (joint below tip direction)
    // For fingers 1-4: tip.y < pip.y means extended (y increases downward in image space)
    // For thumb: compare tip.x vs mcp.x (left/right hand aware via wrist x)

    var thumb  = false;
    var index  = lm[8][1]  < lm[6][1];   // tip vs PIP
    var middle = lm[12][1] < lm[10][1];
    var ring   = lm[16][1] < lm[14][1];
    var pinky  = lm[20][1] < lm[18][1];

    // Thumb: is tip to the right of IP joint? (works for right hand facing camera)
    // Use wrist x to detect hand orientation
    var wristX = lm[0][0];
    var mcpX   = lm[5][0];   // index MCP
    if (wristX < mcpX) {
      // right hand (palm facing camera)
      thumb = lm[4][0] > lm[3][0];
    } else {
      thumb = lm[4][0] < lm[3][0];
    }

    return [thumb, index, middle, ring, pinky];
  }

  /* ═══════════════════════════════════════════════════════
     PINCH DETECTOR
  ═══════════════════════════════════════════════════════ */
  function getPinchRatio(lm) {
    var palmW = dist(lm[0], lm[9]) || 1;
    return dist(lm[4], lm[8]) / palmW;
  }

  function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ═══════════════════════════════════════════════════════
     GESTURE CLASSIFIER
     Priority order matters — specific beats general
  ═══════════════════════════════════════════════════════ */
  function classifyGesture(lm) {
    var f = fingersUp(lm);  // [thumb, index, middle, ring, pinky]
    var thumb = f[0], idx = f[1], mid = f[2], ring = f[3], pinky = f[4];
    var pinchR = getPinchRatio(lm);
    var pinching = pinchR < C.PINCH_RATIO;

    // Count extended fingers (excluding thumb for some gestures)
    var extCount = (idx ? 1 : 0) + (mid ? 1 : 0) + (ring ? 1 : 0) + (pinky ? 1 : 0);
    var allFour = (idx && mid && ring && pinky);

    // PINCH (zoom gesture) — detected by ratio, overrides almost everything
    if (pinching && !allFour) return 'pinch';

    // RIGHT-CLICK: only index up, others closed
    if (idx && !mid && !ring && !pinky && !thumb) return 'right_click';

    // LEFT-CLICK: only middle up, others closed
    if (mid && !idx && !ring && !pinky && !thumb) return 'left_click';

    // DOUBLE-CLICK: index + middle up, ring + pinky + thumb closed
    if (idx && mid && !ring && !pinky && !thumb) return 'double_click';

    // FREEZE: thumb closed, all 4 fingers up
    if (!thumb && allFour) return 'freeze';

    // SCROLL/MOVE: all 5 up
    if (thumb && allFour) return 'scroll';

    // FIST: all closed (extCount 0 or 1)
    if (extCount <= 1 && !thumb) return 'fist';

    return 'neutral';
  }

  /* ═══════════════════════════════════════════════════════
     PALM CENTRE
  ═══════════════════════════════════════════════════════ */
  function palmCenter(lm) {
    var ids = [0, 5, 9, 13, 17], x = 0, y = 0;
    ids.forEach(function (i) { x += lm[i][0]; y += lm[i][1]; });
    return { x: x / ids.length, y: y / ids.length };
  }

  /* ═══════════════════════════════════════════════════════
     CLICK DISPATCHER
  ═══════════════════════════════════════════════════════ */
  function fireClick(vx, vy, type) {
    var now = Date.now();
    if (now - S.lastClickMs < C.CLICK_CD_MS) return;
    S.lastClickMs = now;

    var el = document.elementFromPoint(vx, vy);
    if (!el) return;

    if (type === 'left' || type === 'double') {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: vx, clientY: vy }));
      if (type === 'double') el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: vx, clientY: vy }));
    } else if (type === 'right') {
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: vx, clientY: vy }));
    }

    ripple(vx, vy, type);
    var label = { left: 'Left Click', right: 'Right Click', double: 'Double Click' }[type] || '';
    toast(label, 1400);
    sv('i-m', label);
  }

  function ripple(vx, vy, type) {
    var colors = { left: 'rgba(240,192,64,.45)', right: 'rgba(248,113,113,.4)', double: 'rgba(74,222,128,.4)' };
    var r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: vx + 'px', top: vy + 'px',
      width: '24px', height: '24px', marginLeft: '-12px', marginTop: '-12px',
      borderRadius: '50%', background: colors[type] || colors.left,
      pointerEvents: 'none', zIndex: '99994',
      transition: 'transform .38s ease,opacity .38s ease',
      transform: 'scale(.15)', opacity: '1',
    });
    document.body.appendChild(r);
    requestAnimationFrame(function () { r.style.transform = 'scale(3.4)'; r.style.opacity = '0'; });
    setTimeout(function () { r.remove(); }, 420);
  }

  /* ═══════════════════════════════════════════════════════
     MAIN FRAME HANDLER
  ═══════════════════════════════════════════════════════ */
  function processFrame(lm) {
    var vid = S.video;
    var cur = document.getElementById('lwCur');

    /* palm in normalised 0-1 coords */
    var raw = palmCenter(lm);
    var nx  = raw.x / vid.videoWidth;
    var ny  = raw.y / vid.videoHeight;

    /* viewport coords (mirror x because webcam is mirrored) */
    var vpx = (1 - nx) * window.innerWidth;
    var vpy = ny * window.innerHeight;

    /* update cursor position */
    if (cur) {
      cur.style.display = 'block';
      cur.style.left = vpx + 'px';
      cur.style.top  = vpy + 'px';
    }

    /* ── CLASSIFY gesture this frame ── */
    var rawGesture = classifyGesture(lm);

    /* ── DEBOUNCE: gesture must hold for HOLD_FRAMES ── */
    if (rawGesture === S.gesture) {
      S.holdCount++;
    } else {
      S.gesture = rawGesture;
      S.holdCount = 1;
    }

    var confirmed = (S.holdCount >= C.HOLD_FRAMES) ? S.gesture : S.confirmedGesture;

    /* detect gesture transition for one-shot triggers */
    var justConfirmed = (confirmed !== S.confirmedGesture);
    S.confirmedGesture = confirmed;

    /* update cursor style */
    if (cur) {
      var cls = '';
      if (confirmed === 'pinch')       cls = 'p';
      else if (confirmed === 'fist')   cls = 'f';
      else if (confirmed === 'freeze') cls = 'z';
      else if (confirmed === 'right_click' || confirmed === 'left_click' || confirmed === 'double_click') cls = 'c';
      cur.className = cls;
    }

    sv('i-h', 'detected');
    sv('i-g', confirmed.replace('_', ' '));
    sv('i-s', Math.round(window.scrollY));

    /* ── MOTION delta ── */
    var dxRaw = 0, dyRaw = 0;
    if (S.prevPalm) {
      dxRaw = nx - S.prevPalm.x;
      dyRaw = ny - S.prevPalm.y;
    }
    S.prevPalm = { x: nx, y: ny };

    /* smooth velocity */
    S.velX = S.velX * (1 - C.SMOOTH) + dxRaw * C.SMOOTH;
    S.velY = S.velY * (1 - C.SMOOTH) + dyRaw * C.SMOOTH;

    /* ═══ GESTURE ACTIONS ═══ */

    if (confirmed === 'freeze') {
      /* cursor position is shown but no scroll */
      S.velX = 0; S.velY = 0;
      sv('i-m', 'freeze');
      return;
    }

    if (confirmed === 'scroll') {
      /* move: dead zone filter so resting hand doesn't scroll */
      var absX = Math.abs(S.velX), absY = Math.abs(S.velY);
      if (absY > C.SCROLL_V_THRESH || absX > C.SCROLL_V_THRESH) {
        window.scrollBy({
          left: -S.velX * C.SCROLL_X * window.innerWidth,
          top:  -S.velY * C.SCROLL_Y * window.innerHeight,
          behavior: 'auto',
        });
        var dir = absY > absX
          ? (S.velY < 0 ? '↑ scroll up' : '↓ scroll down')
          : (S.velX < 0 ? '→ right' : '← left');
        sv('i-m', dir);
      } else {
        sv('i-m', 'hovering');
      }
      return;
    }

    if (confirmed === 'pinch') {
      /* ZOOM: use vertical motion while pinching */
      if (Math.abs(S.velY) > C.SCROLL_V_THRESH * 0.5) {
        S.zoom = Math.min(C.ZOOM_MAX, Math.max(C.ZOOM_MIN, S.zoom - S.velY * 8));
        document.body.style.zoom = S.zoom;
        sv('i-z', Math.round(S.zoom * 100) + '%');
        sv('i-m', S.velY < 0 ? 'zoom in' : 'zoom out');
      } else {
        sv('i-m', 'pinch – ready');
      }
      return;
    }

    if (confirmed === 'fist') {
      sv('i-m', 'drag');
      /* fist + move = drag scroll (alternate scroll method) */
      if (Math.abs(S.velY) > C.SCROLL_V_THRESH) {
        window.scrollBy({ top: -S.velY * C.SCROLL_Y * 1.4 * window.innerHeight, behavior: 'auto' });
      }
      return;
    }

    /* click gestures — fire once on first confirmed frame */
    if (justConfirmed) {
      if (confirmed === 'left_click')   fireClick(vpx, vpy, 'left');
      if (confirmed === 'right_click')  fireClick(vpx, vpy, 'right');
      if (confirmed === 'double_click') fireClick(vpx, vpy, 'double');
    }
  }

  /* ═══════════════════════════════════════════════════════
     DETECTION LOOP
  ═══════════════════════════════════════════════════════ */
  function loop() {
    if (!S.active) return;
    S.rafId = requestAnimationFrame(loop);

    var now = Date.now();
    if (now - S.lastMs < C.INTERVAL_MS) return;
    S.lastMs = now;

    var vid = S.video;
    var cvs = document.getElementById('lwCvs');
    var cur = document.getElementById('lwCur');
    if (!vid || vid.readyState < 2) return;

    S.model.estimateHands(vid).then(function (preds) {
      if (!preds || preds.length === 0) {
        S.prevPalm = null;
        S.velX = 0; S.velY = 0;
        S.gesture = 'none';
        S.confirmedGesture = 'none';
        S.holdCount = 0;
        if (cur) cur.style.display = 'none';
        sv('i-h', 'none'); sv('i-m', 'idle'); sv('i-g', '—');
        if (cvs) cvs.getContext('2d').clearRect(0, 0, cvs.width, cvs.height);
        return;
      }

      var lm = preds[0].landmarks;
      if (cvs) drawSkeleton(lm, cvs, vid.videoWidth, vid.videoHeight);
      processFrame(lm);
    }).catch(function () {});
  }

  /* ═══════════════════════════════════════════════════════
     SKELETON DRAW
  ═══════════════════════════════════════════════════════ */
  var CONN = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
  ];

  function drawSkeleton(lm, cvs, vw, vh) {
    cvs.width  = cvs.offsetWidth  || 116;
    cvs.height = cvs.offsetHeight || 78;
    var cx = cvs.getContext('2d');
    cx.clearRect(0, 0, cvs.width, cvs.height);
    var sx = cvs.width / vw, sy = cvs.height / vh;
    var px = function (x) { return cvs.width - x * sx; };
    var py = function (y) { return y * sy; };
    cx.strokeStyle = 'rgba(201,168,76,.7)';
    cx.lineWidth   = 1;
    CONN.forEach(function (c) {
      cx.beginPath();
      cx.moveTo(px(lm[c[0]][0]), py(lm[c[0]][1]));
      cx.lineTo(px(lm[c[1]][0]), py(lm[c[1]][1]));
      cx.stroke();
    });
    lm.forEach(function (k) {
      cx.beginPath();
      cx.arc(px(k[0]), py(k[1]), 2, 0, Math.PI * 2);
      cx.fillStyle = '#F0C040';
      cx.fill();
    });
  }

  /* ═══════════════════════════════════════════════════════
     UI
  ═══════════════════════════════════════════════════════ */
  function buildUI() {
    if (document.getElementById('lwHC')) return;

    var css = [
      '#lwHC{position:fixed;bottom:24px;right:24px;z-index:99990;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:"DM Sans",sans-serif}',
      '#lwBtn{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#F0C040,#C9A84C);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(201,168,76,.35),0 8px 28px rgba(0,0,0,.55);transition:transform .2s,box-shadow .2s;position:relative}',
      '#lwBtn:hover{transform:scale(1.1)}',
      '#lwBtn.on{background:linear-gradient(135deg,#4ADE80,#16a34a)}',
      '#lwBtn .ring{position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(74,222,128,.4);animation:lwR 1.3s ease-out infinite;pointer-events:none}',
      '@keyframes lwR{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.55);opacity:0}}',
      '#lwBtn svg{width:24px;height:24px;fill:#07060A;pointer-events:none}',
      /* legend toggle button */
      '#lwLegBtn{width:32px;height:32px;border-radius:50%;border:1px solid rgba(201,168,76,.3);background:rgba(7,6,10,.85);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:14px;backdrop-filter:blur(8px);transition:background .2s}',
      '#lwLegBtn:hover{background:rgba(201,168,76,.12)}',
      '#lwInfo{background:rgba(7,6,10,.95);border:1px solid rgba(201,168,76,.22);border-radius:11px;padding:11px 15px;font-size:11px;color:#C8B88A;min-width:188px;backdrop-filter:blur(16px);display:none;line-height:1.85}',
      '#lwInfo.show{display:block}',
      '#lwInfo b{color:#F0C040;font-weight:600}',
      '#lwInfo .d{color:#7A6024;min-width:52px;display:inline-block}',
      '#lwInfo .sep{height:1px;background:rgba(201,168,76,.1);margin:7px 0}',
      '#lwInfo .gtitle{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#7A6024;margin-bottom:5px}',
      '#lwInfo .grow{display:flex;gap:6px;align-items:baseline;margin-bottom:2px}',
      '#lwInfo .gkey{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:4px;padding:1px 6px;font-size:9px;color:#C9A84C;white-space:nowrap}',
      '#lwInfo .gdesc{font-size:10px;color:#7A6E5A}',
      '#lwV{width:116px;height:78px;border-radius:8px;overflow:hidden;border:1px solid rgba(201,168,76,.18);display:none;position:relative}',
      '#lwV.show{display:block}',
      '#lwV video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);filter:brightness(.65)}',
      '#lwV canvas{position:absolute;inset:0;width:100%;height:100%}',
      /* cursor */
      '#lwCur{position:fixed;width:20px;height:20px;border:2px solid #F0C040;border-radius:50%;pointer-events:none;z-index:99992;transform:translate(-50%,-50%);display:none;box-shadow:0 0 10px rgba(240,192,64,.3);transition:width .07s,height .07s,border-color .07s,background .07s}',
      '#lwCur.p{width:11px;height:11px;background:rgba(240,192,64,.28)}',
      '#lwCur.f{border-color:#F87171;box-shadow:0 0 10px rgba(248,113,113,.4)}',
      '#lwCur.z{border-color:#60A5FA;border-style:dashed}',
      '#lwCur.c{border-color:#4ADE80;width:14px;height:14px;background:rgba(74,222,128,.15)}',
      /* toast */
      '#lwT{position:fixed;bottom:88px;right:26px;background:rgba(7,6,10,.92);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:7px 13px;font-size:11px;color:#C8B88A;z-index:99993;display:none;pointer-events:none;backdrop-filter:blur(10px)}',
      '#lwT.show{display:block;animation:lwF .22s ease}',
      '@keyframes lwF{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
    ].join('');

    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var html = [
      '<div id="lwHC">',
        '<div id="lwInfo">',
          '<div><span class="d">Hand </span><b id="i-h">—</b></div>',
          '<div><span class="d">Gesture </span><b id="i-g">—</b></div>',
          '<div><span class="d">Mode </span><b id="i-m">idle</b></div>',
          '<div><span class="d">Scroll </span><b id="i-s">0</b></div>',
          '<div><span class="d">Zoom </span><b id="i-z">100%</b></div>',
          '<div class="sep"></div>',
          '<div class="gtitle">Gesture Guide</div>',
          '<div class="grow"><span class="gkey">✋ all up + move</span><span class="gdesc">scroll page</span></div>',
          '<div class="grow"><span class="gkey">🤚 4 up, no thumb</span><span class="gdesc">freeze cursor</span></div>',
          '<div class="grow"><span class="gkey">☝️ index only</span><span class="gdesc">right-click</span></div>',
          '<div class="grow"><span class="gkey">🖕 middle only</span><span class="gdesc">left-click</span></div>',
          '<div class="grow"><span class="gkey">✌️ index+middle</span><span class="gdesc">double-click</span></div>',
          '<div class="grow"><span class="gkey">✊ fist + move</span><span class="gdesc">drag scroll</span></div>',
          '<div class="grow"><span class="gkey">🤏 pinch + move</span><span class="gdesc">zoom in/out</span></div>',
        '</div>',
        '<div id="lwV"><video id="lwVid" autoplay playsinline muted></video><canvas id="lwCvs"></canvas></div>',
        '<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">',
          '<button id="lwLegBtn" title="Show gesture guide">?</button>',
          '<button id="lwBtn" title="Hand Control"><svg viewBox="0 0 24 24"><path d="M9 2a1 1 0 0 1 1 1v5.586l-.293-.293a1 1 0 0 0-1.414 1.414l2 2 .707.707.707-.707 2-2a1 1 0 0 0-1.414-1.414L12 8.586V3a1 1 0 0 1 2 0v4a1 1 0 0 1 2 0V5a1 1 0 0 1 2 0v6a7 7 0 0 1-7 7H9A7 7 0 0 1 2 11V7a1 1 0 0 1 2 0v4a1 1 0 0 0 2 0V3a1 1 0 0 1 1-1z"/></svg></button>',
        '</div>',
      '</div>',
      '<div id="lwCur"></div>',
      '<div id="lwT"></div>',
    ].join('');

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('lwBtn').addEventListener('click', toggle);
    document.getElementById('lwLegBtn').addEventListener('click', function () {
      document.getElementById('lwInfo').classList.toggle('show');
    });
  }

  var tTimer;
  function toast(msg, ms) {
    var el = document.getElementById('lwT');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 2200);
  }
  function sv(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  /* ═══════════════════════════════════════════════════════
     SCRIPT LOADER
  ═══════════════════════════════════════════════════════ */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function loadLibs() {
    toast('Loading hand AI…', 12000);
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@0.0.7/dist/handpose.min.js');
    await window.tf.setBackend('webgl');
    await window.tf.ready();
  }

  /* ═══════════════════════════════════════════════════════
     START / STOP
  ═══════════════════════════════════════════════════════ */
  async function start() {
    var btn = document.getElementById('lwBtn');
    var info = document.getElementById('lwInfo');
    var vw = document.getElementById('lwV');
    btn.innerHTML = '<div class="ring"></div><svg viewBox="0 0 24 24"><path d="M9 2a1 1 0 0 1 1 1v5.586l-.293-.293a1 1 0 0 0-1.414 1.414l2 2 .707.707.707-.707 2-2a1 1 0 0 0-1.414-1.414L12 8.586V3a1 1 0 0 1 2 0v4a1 1 0 0 1 2 0V5a1 1 0 0 1 2 0v6a7 7 0 0 1-7 7H9A7 7 0 0 1 2 11V7a1 1 0 0 1 2 0v4a1 1 0 0 0 2 0V3a1 1 0 0 1 1-1z"/></svg>';
    btn.classList.add('on');
    info.classList.add('show');
    vw.classList.add('show');

    try { await loadLibs(); }
    catch (e) { toast('Failed to load AI: ' + e.message, 5000); stop(); return; }

    toast('Building model (first load ~5s)…', 12000);
    try { S.model = await window.handpose.load({ maxContinuousChecks: 8, detectionConfidence: 0.8, iouThreshold: 0.3, scoreThreshold: 0.75 }); }
    catch (e) { toast('Model error: ' + e.message, 5000); console.error('[HC]', e); stop(); return; }

    var vid = document.getElementById('lwVid');
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
      vid.srcObject = stream;
      await new Promise(function (r) { vid.onloadedmetadata = r; });
      vid.play();
    } catch (e) { toast('Camera denied.', 4000); stop(); return; }

    S.video = vid;
    S.active = true;
    toast('Hand control ON — raise all fingers to scroll!', 3800);
    loop();
  }

  function stop() {
    S.active = false;
    cancelAnimationFrame(S.rafId);
    var vid = document.getElementById('lwVid');
    if (vid && vid.srcObject) { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); vid.srcObject = null; }
    if (S.model) { try { S.model.dispose(); } catch (_) {} S.model = null; }
    S.prevPalm = null; S.velX = 0; S.velY = 0;
    S.gesture = 'none'; S.confirmedGesture = 'none'; S.holdCount = 0;
    S.zoom = 1; document.body.style.zoom = '';

    var btn = document.getElementById('lwBtn');
    if (btn) {
      btn.classList.remove('on');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 2a1 1 0 0 1 1 1v5.586l-.293-.293a1 1 0 0 0-1.414 1.414l2 2 .707.707.707-.707 2-2a1 1 0 0 0-1.414-1.414L12 8.586V3a1 1 0 0 1 2 0v4a1 1 0 0 1 2 0V5a1 1 0 0 1 2 0v6a7 7 0 0 1-7 7H9A7 7 0 0 1 2 11V7a1 1 0 0 1 2 0v4a1 1 0 0 0 2 0V3a1 1 0 0 1 1-1z"/></svg>';
    }
    document.getElementById('lwInfo').classList.remove('show');
    document.getElementById('lwV').classList.remove('show');
    var cur = document.getElementById('lwCur');
    if (cur) cur.style.display = 'none';
    toast('Hand control off.');
  }

  function toggle() { S.active ? stop() : start(); }

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();