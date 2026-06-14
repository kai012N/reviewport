// The reviewport overlay — a framework-agnostic, ZERO-dependency review sidebar
// that is injected into the page being reviewed. It reads the change manifest
// from `window.__REVIEWPORT__` and walks the reviewer through each change:
// auto-navigate to the route, highlight where the change landed, mark each
// approved / needs-fix (persisted in localStorage), then export the fix-list
// back to the agent.
//
// This function is serialized with `.toString()` by src/inject.js and runs in
// the browser, so it must be fully self-contained (no imports, no closures over
// module scope) and use only browser globals.

export function reviewportOverlay() {
  if (window.__REVIEWPORT_DONE__) return;
  window.__REVIEWPORT_DONE__ = 1;

  var M = window.__REVIEWPORT__ || { changes: [] };
  var CH = Array.isArray(M.changes) ? M.changes : [];
  if (!CH.length) return;

  // Merge top-level defaults into each change (shallow, change wins).
  if (M.defaults && typeof M.defaults === 'object') {
    CH = CH.map(function (c) {
      var merged = {};
      for (var k in M.defaults) merged[k] = M.defaults[k];
      for (var j in c) merged[j] = c[j];
      return merged;
    });
  }

  var KEY = 'reviewport:' + (M.id || 'default');
  var ROUTEBASE = M.routeBase || '';
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY + ':st') || '{}'); } catch (e) {}
  var idx = parseInt(localStorage.getItem(KEY + ':idx') || '0', 10);
  if (isNaN(idx) || idx < 0 || idx >= CH.length) idx = 0;
  var hiList = [];
  var hiSeq = 0;        // bumped on every highlight() so stale (rapid-nav) timeouts no-op
  var notFound = false; // set when the current anchor can't be located on the page

  // ---------- routing ----------
  function norm(p) { return (p || '').replace(/\.html?$/, '').replace(/\/+$/, '') || '/'; }
  function matches(c) {
    if (!c.route || c.route === '.') return true; // current page, no navigation
    var here = norm(location.pathname);
    var target = norm(ROUTEBASE + c.route);
    return here === target || here.endsWith(norm(c.route));
  }
  function navTo(c) { location.assign(ROUTEBASE + c.route); }

  // ---------- highlighting ----------
  function clearHi() { hiList.forEach(function (o) { o.el.style.cssText = o.css; }); hiList = []; }
  function addHi(el, strong) {
    hiList.push({ el: el, css: el.style.cssText });
    el.style.background = strong ? 'rgba(0,161,155,.20)' : 'rgba(0,161,155,.11)';
    el.style.borderRadius = '3px';
    if (strong) { el.style.outline = '2.5px solid #00a19b'; el.style.outlineOffset = '2px'; }
  }
  function findText(value, selector, occurrence) {
    var roots = selector ? document.querySelectorAll(selector) : [document.body];
    var want = occurrence && occurrence > 0 ? occurrence : 1;
    var seen = 0;
    for (var r = 0; r < roots.length; r++) {
      var w = document.createTreeWalker(roots[r], NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (n.textContent.indexOf(value) < 0) return NodeFilter.FILTER_REJECT;
          var pe = n.parentElement; if (!pe) return NodeFilter.FILTER_REJECT;
          if (pe.closest('#__reviewport_panel')) return NodeFilter.FILTER_REJECT;
          var t = pe.tagName; if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (pe.getClientRects().length === 0) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      var n; while ((n = w.nextNode())) { seen++; if (seen === want) return n.parentElement; }
    }
    return null;
  }
  function markCode(marker, selector) {
    if (!marker) return false;
    var scopes = selector ? document.querySelectorAll(selector) : [document];
    var best = null;
    for (var s = 0; s < scopes.length && !(best && best.classList && best.classList.contains('line')); s++) {
      var root = scopes[s];
      var els = root.querySelectorAll ? root.querySelectorAll('.line, pre code, pre, code') : [];
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.getClientRects().length === 0) continue;
        if (el.textContent.indexOf(marker) >= 0) {
          if (!best || (el.classList && el.classList.contains('line'))) best = el;
          if (el.classList && el.classList.contains('line')) break;
        }
      }
    }
    if (!best) return false;
    addHi(best, true);
    if (best.classList && best.classList.contains('line')) {
      var cur = best;
      while ((cur = cur.nextElementSibling)) {
        if (!cur.classList || !cur.classList.contains('line')) break;
        if (cur.textContent.trim() !== '') addHi(cur, false);
      }
    }
    best.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  }
  function highlight(c) {
    var my = ++hiSeq;
    clearHi();
    var a = c.anchor || {};
    setTimeout(function () {
      if (my !== hiSeq) return; // a newer navigation superseded this one
      clearHi();                // drop anything a stale timeout may have applied
      var ok = false;
      if (a.mode === 'code-marker') {
        ok = markCode(a.marker, a.selector);
      } else if (a.mode === 'look-here') {
        if (a.selector) {
          var el = document.querySelector(a.selector);
          if (el) { addHi(el, true); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); ok = true; }
        } else { ok = true; } // hint-only is fine; the panel shows the instruction
      } else {
        var value = a.value || c.after || c.title;
        var found = findText(value, a.selector, a.occurrence);
        if (found) { addHi(found, true); found.scrollIntoView({ block: 'center', behavior: 'smooth' }); ok = true; }
      }
      // Always reflect the actual result in the panel, so a found change never
      // inherits a previous change's "couldn't locate" message (and a successful
      // Re-locate clears a stale one).
      notFound = !ok;
      paint();
    }, 120);
  }

  // ---------- state ----------
  function go(i) {
    idx = (i + CH.length) % CH.length;
    localStorage.setItem(KEY + ':idx', String(idx));
    var c = CH[idx];
    if (!matches(c)) { navTo(c); return; }
    notFound = false; // clear any stale "couldn't locate" before painting the new change
    paint(); highlight(c);
  }
  function setStatus(v) {
    var c = CH[idx];
    if (st[c.id] === v) delete st[c.id]; else st[c.id] = v;
    localStorage.setItem(KEY + ':st', JSON.stringify(st));
    paint();
  }
  function exportRej() {
    var rej = CH.filter(function (c) { return st[c.id] === 'no'; });
    if (!rej.length) { alert('Nothing flagged as "needs fix" yet.'); return; }
    var lines = rej.map(function (c) {
      var expect = c.after || (c.anchor && c.anchor.hint) || '';
      return '#' + c.id + ' [' + (ROUTEBASE + c.route) + '] ' + c.title + (expect ? ' — expected: ' + expect : '');
    });
    var machine = '<!-- reviewport:rejected ' + JSON.stringify({ ids: rej.map(function (c) { return c.id; }) }) + ' -->';
    var txt = 'reviewport: these changes still need fixing (' + rej.length + '):\n\n' + lines.join('\n') + '\n\n' + machine;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        function () { alert('Copied ' + rej.length + ' item(s) to clipboard. Paste back to your agent.'); },
        function () { prompt('Copy this back to your agent:', txt); }
      );
    } else { prompt('Copy this back to your agent:', txt); }
  }
  function esc(s) { return (s || '').replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }); }

  // ---------- panel ----------
  var P = document.createElement('div'); P.id = '__reviewport_panel';
  P.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;max-height:86vh;background:#fff;border:1px solid #cfe0de;border-radius:12px;z-index:2147483647;font-family:system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;display:flex;flex-direction:column;box-shadow:0 8px 28px rgba(0,0,0,.18);overflow:hidden';
  document.documentElement.appendChild(P);
  try {
    var pos = JSON.parse(localStorage.getItem(KEY + ':pos') || 'null');
    if (pos) { P.style.right = 'auto'; P.style.left = pos.left; P.style.top = pos.top; }
  } catch (e) {}

  // drag by the header
  var drag = null;
  P.addEventListener('mousedown', function (e) {
    var h = e.target.closest && e.target.closest('#rv_head'); if (!h) return;
    if (e.target.closest('button')) return;
    var r = P.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    P.style.right = 'auto'; P.style.left = r.left + 'px'; P.style.top = r.top + 'px';
    document.body.style.userSelect = 'none'; e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var x = Math.max(4, Math.min(window.innerWidth - 90, e.clientX - drag.dx));
    var y = Math.max(4, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
    P.style.left = x + 'px'; P.style.top = y + 'px';
  });
  window.addEventListener('mouseup', function () {
    if (!drag) return; drag = null; document.body.style.userSelect = '';
    localStorage.setItem(KEY + ':pos', JSON.stringify({ left: P.style.left, top: P.style.top }));
  });

  function paint() {
    var c = CH[idx], s = st[c.id];
    var done = Object.keys(st).length;
    var ok = Object.values(st).filter(function (x) { return x === 'ok'; }).length;
    var no = Object.values(st).filter(function (x) { return x === 'no'; }).length;
    var a = c.anchor || {};
    P.innerHTML =
      '<div id="rv_head" style="background:#12393b;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:8px;cursor:move">'
      + '<span style="opacity:.5;font-size:14px">⠿</span><b style="font-size:15px">reviewport</b>'
      + '<span style="font-size:12px;color:#9fc7c4">' + (idx + 1) + ' / ' + CH.length + '</span>'
      + '<span style="flex:1"></span>'
      + '<button id="rv_x" style="background:none;border:1px solid #2c5f60;color:#cfe6e4;border-radius:5px;padding:3px 9px;cursor:pointer;font-size:12px">Hide</button></div>'
      + '<div style="height:5px;background:#dde8e7"><div style="height:100%;background:#00a19b;width:' + (done / CH.length * 100) + '%"></div></div>'
      + '<div style="padding:8px 16px;font-size:12px;color:#5f6b70;border-bottom:1px solid #eef3f2">Approved ' + ok + ' Needs fix ' + no + ' Unseen ' + (CH.length - done) + '</div>'
      + '<div style="flex:1;overflow:auto;padding:16px">'
      + '<div style="display:inline-block;font-size:11px;padding:2px 9px;border-radius:6px;background:#e1f1f0;color:#0c6f6a">' + esc(c.category) + '</div>'
      + (c.severity ? '<span style="font-size:11px;margin-left:6px;color:' + (c.severity === 'major' ? '#c0392b' : c.severity === 'minor' ? '#9a6a00' : '#5f6b70') + '">' + esc(c.severity) + '</span>' : '')
      + '<span style="font-size:11px;color:#9aa6a4;margin-left:8px">#' + esc(c.id) + ' ' + esc(ROUTEBASE + c.route) + '</span>'
      + '<div style="font-size:14px;margin:10px 0;color:#1c2526;font-weight:600">' + esc(c.title) + '</div>'
      + (c.description ? '<div style="font-size:13px;margin:-4px 0 8px;color:#5f6b70">' + esc(c.description) + '</div>' : '')
      + (c.before ? '<div style="font-family:ui-monospace,monospace;font-size:12px;background:#fdecea;color:#c0392b;text-decoration:line-through;padding:5px 8px;border-radius:5px;margin:3px 0;word-break:break-all">' + esc(c.before) + '</div>' : '')
      + (c.after ? '<div style="font-family:ui-monospace,monospace;font-size:12px;background:#e7f6ef;color:#0f8a5f;padding:5px 8px;border-radius:5px;margin:3px 0;word-break:break-all">' + esc(c.after) + '</div>' : '')
      + (a.mode === 'look-here' ? '<div style="font-size:13px;background:#fdf3e0;color:#9a6a00;padding:6px 10px;border-radius:5px;margin:6px 0">Look here: ' + esc(a.hint) + '</div>' : '')
      + (a.mode === 'code-marker' ? '<div style="font-size:12px;background:#fdf3e0;color:#9a6a00;padding:6px 10px;border-radius:5px;margin:6px 0">In the code block' + (a.lineHint ? ' (' + esc(a.lineHint) + ')' : '') + ', see the highlighted line.</div>' : '')
      + (notFound ? '<div style="font-size:12px;background:#fdecea;color:#c0392b;padding:6px 10px;border-radius:5px;margin:6px 0">Couldn’t locate this on the page'
        + (c.files && c.files.length ? ' — check: ' + esc(c.files.join(', ')) : '') + '.</div>' : '')
      + '<div style="margin-top:14px"><button id="rv_loc" style="width:100%;background:#00a19b;color:#fff;border:none;padding:9px;border-radius:7px;cursor:pointer;font-size:14px;font-family:inherit">Re-locate / highlight</button></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button id="rv_ok" style="flex:1;padding:9px;border-radius:7px;cursor:pointer;font-size:14px;font-family:inherit;border:1px solid ' + (s === 'ok' ? '#0f8a5f' : '#dfe7e6') + ';background:' + (s === 'ok' ? '#0f8a5f' : '#fff') + ';color:' + (s === 'ok' ? '#fff' : '#1c2526') + '">✓ Looks right</button>'
      + '<button id="rv_no" style="flex:1;padding:9px;border-radius:7px;cursor:pointer;font-size:14px;font-family:inherit;border:1px solid ' + (s === 'no' ? '#c0392b' : '#dfe7e6') + ';background:' + (s === 'no' ? '#c0392b' : '#fff') + ';color:' + (s === 'no' ? '#fff' : '#1c2526') + '">✗ Needs fix</button></div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid #eef3f2">'
      + '<button id="rv_prev" style="flex:1;padding:9px;border:1px solid #dfe7e6;background:#fff;border-radius:7px;cursor:pointer;font-size:14px;font-family:inherit">← Prev</button>'
      + '<button id="rv_next" style="flex:1;padding:9px;border:1px solid #dfe7e6;background:#fff;border-radius:7px;cursor:pointer;font-size:14px;font-family:inherit">Next →</button></div>'
      + '<div style="padding:0 16px 14px"><button id="rv_exp" style="width:100%;padding:8px;border:1px solid #00a19b;background:#fff;color:#00a19b;border-radius:7px;cursor:pointer;font-size:13px;font-family:inherit">Export fix-list</button></div>';
    P.querySelector('#rv_loc').onclick = function () { highlight(c); };
    P.querySelector('#rv_ok').onclick = function () { setStatus('ok'); };
    P.querySelector('#rv_no').onclick = function () { setStatus('no'); };
    P.querySelector('#rv_prev').onclick = function () { go(idx - 1); };
    P.querySelector('#rv_next').onclick = function () { go(idx + 1); };
    P.querySelector('#rv_exp').onclick = exportRej;
    P.querySelector('#rv_x').onclick = function () { P.style.display = 'none'; showFab(); };
  }
  function showFab() {
    var f = document.createElement('button'); f.textContent = 'reviewport';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#00a19b;color:#fff;border:none;border-radius:24px;padding:10px 18px;font-size:14px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2);font-family:system-ui,sans-serif';
    f.onclick = function () { f.remove(); P.style.display = 'flex'; };
    document.body.appendChild(f);
  }

  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key.toLowerCase() === 'y') setStatus('ok');
    else if (e.key.toLowerCase() === 'n') setStatus('no');
  });

  paint();
  setTimeout(function () { var c = CH[idx]; if (matches(c)) highlight(c); }, 700);
}
