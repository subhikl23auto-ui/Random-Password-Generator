// ── Character sets ──────────────────────────────────────────
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS  = '0123456789';
const SYMS  = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// ── State ─────────────────────────────────────────────────────
let st = { l:true, u:true, n:true, s:false, len:16, inc:'', exc:'' };
let pw = '', hist = [], samplePw = '', scramT = null;

// ── Helpers ───────────────────────────────────────────────────
function charset() {
  let c = '';
  if (st.l) c += LOWER;
  if (st.u) c += UPPER;
  if (st.n) c += NUMS;
  if (st.s) c += SYMS;
  if (!c) c = LOWER;
  return st.exc ? c.split('').filter(ch => !st.exc.includes(ch)).join('') : c;
}

function typeOf(c) {
  if (LOWER.includes(c)) return 'l';
  if (UPPER.includes(c)) return 'u';
  if (NUMS.includes(c))  return 'n';
  return 's';
}

function mkPw(cs, len, inc) {
  const incChars = (inc || '').split('').filter(c => c.trim());
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let base = Array.from(arr, v => cs[v % cs.length]);
  incChars.forEach((c, i) => {
    const pos = Math.floor(Math.random() * (len - i));
    base.splice(pos, 0, c);
  });
  base = base.slice(0, len);
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join('');
}

function entropy(p, cs) { return p.length * Math.log2(Math.max(cs.length, 1)); }

function crackStr(bits) {
  const s = Math.pow(2, bits) / 1e12;
  if (s < 60)       return '< 1 min';
  if (s < 3600)     return Math.round(s / 60) + ' min';
  if (s < 86400)    return Math.round(s / 3600) + ' hrs';
  if (s < 2592000)  return Math.round(s / 86400) + ' days';
  if (s < 31536000) return Math.round(s / 2592000) + ' months';
  if (s < 1e9)      return Math.round(s / 31536000) + ' yrs';
  return 'centuries';
}

// ── Render password with color spans ─────────────────────────
function renderPw(p, el, forced) {
  if (!el) return;
  if (!p) { el.innerHTML = '<span class="pw-placeholder">Hit Generate to start…</span>'; return; }
  const fc = new Set((forced || '').split(''));
  el.innerHTML = p.split('').map(c =>
    `<span class="c-${fc.has(c) ? 'f' : typeOf(c)}">${c}</span>`
  ).join('');
}

// ── Metrics ───────────────────────────────────────────────────
function updateMetrics(p) {
  if (!p) {
    document.getElementById('evalEl').textContent = '—';
    document.getElementById('ecrack').textContent = '—';
    document.getElementById('stag').textContent = '——';
    setSegs(0, '#555'); setRing(0, '#555'); setComp(null);
    return;
  }
  const cs = charset();
  const bits = entropy(p, cs);
  document.getElementById('evalEl').textContent = Math.round(bits);
  document.getElementById('ecrack').textContent = '~' + crackStr(bits) + ' to crack';
  const score = bits < 28 ? 1 : bits < 36 ? 2 : bits < 60 ? 3 : bits < 80 ? 4 : 5;
  const cols  = ['#E24B4A','#EF9F27','#5BA3F5','#2EC4A0','#9d97e8'];
  const tags  = ['Very Weak','Weak','Fair','Strong','Very Strong'];
  setSegs(score, cols[score - 1]);
  setRing(Math.min(100, Math.round(bits / 128 * 100)), cols[score - 1]);
  const stag = document.getElementById('stag');
  stag.textContent = tags[score - 1];
  stag.style.color = cols[score - 1];
  setComp(p);
}

function setSegs(n, col) {
  for (let i = 0; i < 5; i++) {
    const s = document.getElementById('sg' + i);
    s.style.background = i < n ? col : 'var(--bg3)';
    s.classList.toggle('lit', i < n);
    s.style.transitionDelay = (i * 55) + 'ms';
  }
}

function setRing(pct, col) {
  const fg = document.getElementById('ringFg');
  fg.style.strokeDashoffset = 125.6 - (pct / 100 * 125.6);
  fg.style.stroke = col;
  document.getElementById('ringPct').textContent = pct + '%';
}

function setComp(p) {
  const types = ['l','u','n','s'];
  const total = p ? p.length : 0;
  types.forEach(t => {
    const count = p ? p.split('').filter(c => typeOf(c) === t).length : 0;
    document.getElementById('cp-' + t).textContent = p ? count : '—';
    const bar = document.getElementById('bar-' + t);
    if (bar) bar.style.width = (total ? (count / total * 100) : 0) + '%';
  });
  const prev = document.getElementById('segPrev');
  if (!p) { prev.innerHTML = ''; return; }
  const inc = new Set((st.inc || '').split(''));
  prev.innerHTML = p.slice(0, 40).split('').map(c =>
    `<span class="sc t-${inc.has(c) ? 'f' : typeOf(c)}">${c}</span>`
  ).join('');
}

// ── Robot Mascot state ───────────────────────────────────────
function setMascot(state) {
  const wrap    = document.getElementById('mascotWrap');
  const think   = document.getElementById('thinkBubbles');
  const stars   = document.getElementById('stars');
  const sweat   = document.getElementById('sweatDrop');
  const bubble  = document.getElementById('bubble');
  const pupilL  = document.getElementById('pupilL');
  const pupilR  = document.getElementById('pupilR');
  const ledBar  = document.getElementById('ledBar');
  const antDot  = document.getElementById('antennaDot');
  // mouth grid segments
  const mgs = [0,1,2,3,4].map(i => document.getElementById('mg'+i));

  wrap.style.animation = 'none';
  think.style.opacity  = '0';
  stars.style.opacity  = '0';
  sweat.style.opacity  = '0';
  bubble.classList.remove('show');
  // reset eyes to blue
  if (pupilL) { pupilL.setAttribute('fill','#5BA3F5'); pupilL.style.animation=''; }
  if (pupilR) { pupilR.setAttribute('fill','#5BA3F5'); pupilR.style.animation=''; }
  if (ledBar)  ledBar.setAttribute('fill','#5BA3F5');
  if (antDot)  antDot.style.animation='';
  mgs.forEach(m => m && m.setAttribute('fill','#5BA3F5'));

  if (state === 'idle') {
    wrap.style.animation = 'bob 2.5s ease-in-out infinite';
    if (antDot) antDot.style.animation = 'pulse-dot 2s infinite';
  } else if (state === 'thinking') {
    think.style.opacity = '1';
    bubble.textContent  = 'Processing…';
    bubble.classList.add('show');
    wrap.style.animation = 'shake 0.4s ease-in-out infinite';
    // yellow eyes for thinking
    if (pupilL) pupilL.setAttribute('fill','#EF9F27');
    if (pupilR) pupilR.setAttribute('fill','#EF9F27');
    if (ledBar)  ledBar.setAttribute('fill','#EF9F27');
    mgs.forEach(m => m && m.setAttribute('fill','#EF9F27'));
  } else if (state === 'celebrate') {
    stars.style.opacity = '1';
    bubble.textContent  = 'Copied! 🎉';
    bubble.classList.add('show');
    wrap.style.animation = 'bounce 0.6s ease-in-out 3';
    // green eyes for celebrate
    if (pupilL) pupilL.setAttribute('fill','#2EC4A0');
    if (pupilR) pupilR.setAttribute('fill','#2EC4A0');
    if (ledBar)  ledBar.setAttribute('fill','#2EC4A0');
    mgs.forEach(m => m && m.setAttribute('fill','#2EC4A0'));
    spawnConfetti();
    setTimeout(() => { bubble.classList.remove('show'); setMascot('idle'); }, 3000);
  }
}

function spawnConfetti() {
  const box = document.getElementById('confettiBox');
  box.innerHTML = '';
  const colors = ['#5BA3F5','#2EC4A0','#F0A030','#E06090','#9d97e8','#FFFFFF'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    const size = 4 + Math.random() * 7;
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:${Math.random()>0.5?'50%':'2px'};background:${colors[Math.floor(Math.random()*colors.length)]};left:${5+Math.random()*80}px;top:${15+Math.random()*25}px;animation:confetti-fall ${0.7+Math.random()*0.9}s ${Math.random()*0.3}s ease-in forwards`;
    box.appendChild(el);
  }
  setTimeout(() => box.innerHTML = '', 2800);
}

// ── Scramble animation ────────────────────────────────────────
function scramble(final) {
  const cs = charset() || LOWER;
  let elapsed = 0;
  const dur = 500, step = 30;
  const d = document.getElementById('pwOut');
  d.classList.add('fl');
  clearInterval(scramT);
  setMascot('thinking');
  scramT = setInterval(() => {
    elapsed += step;
    const prog = elapsed / dur;
    const fix = Math.floor(prog * final.length);
    let disp = '';
    for (let i = 0; i < final.length; i++)
      disp += i < fix ? final[i] : cs[Math.floor(Math.random() * cs.length)];
    d.innerHTML = disp.split('').map(c => `<span class="c-${typeOf(c)}">${c}</span>`).join('');
    if (elapsed >= dur) {
      clearInterval(scramT);
      renderPw(final, d, st.inc);
      d.classList.remove('fl');
      updateMetrics(final);
      setMascot('idle');
      updateLengthBadge(final.length);
    }
  }, step);
}

function updateLengthBadge(len) {
  const strip  = document.getElementById('pwHeaderStrip');
  const lenTxt = document.getElementById('pwLenText');
  if (!strip || !lenTxt) return;
  lenTxt.textContent = len + ' CHARS';
  strip.style.display = 'flex';
}

// ── Core actions ──────────────────────────────────────────────
function generate() {
  const cs = charset();
  pw = mkPw(cs, st.len, st.inc);
  scramble(pw);
  addHist(pw);
  const btn = document.getElementById('genBtn');
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => btn.style.transform = '', 140);
}

function copyPw() {
  if (!pw) return;
  navigator.clipboard.writeText(pw).then(() => {
    const b = document.getElementById('copyBtn');
    b.classList.add('copied');
    b.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l3 3 7-7"/></svg> Copied!`;
    setMascot('celebrate');
    setTimeout(() => {
      b.classList.remove('copied');
      b.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 011-1h8"/></svg> Copy`;
    }, 2200);
  });
}

function refreshOne() {
  if (!pw) return;
  const cs = charset();
  const i = Math.floor(Math.random() * pw.length);
  pw = pw.slice(0, i) + cs[Math.floor(Math.random() * cs.length)] + pw.slice(i + 1);
  renderPw(pw, document.getElementById('pwOut'), st.inc);
  updateMetrics(pw);
}

// ── Config handlers ───────────────────────────────────────────
function onLen(v) {
  st.len = parseInt(v);
  document.getElementById('lenVal').textContent = v;
  if (pw) generate();
}

function onInclude() {
  st.inc = document.getElementById('includeInp').value;
  document.getElementById('includeHint').innerHTML = st.inc
    ? `"${st.inc}" will always appear (<span style="color:#9d97e8;font-weight:600">purple</span>).`
    : `Characters shown in <span style="color:#9d97e8;font-weight:600">purple</span> — guaranteed to appear.`;
  if (pw) generate();
}

function onExclude() {
  st.exc = document.getElementById('excludeInp').value;
  if (pw) generate();
}

function toggleChip(t) {
  const active = ['l','u','n','s'].filter(k => st[k]).length;
  if (st[t] && active <= 1) return; // keep at least one
  st[t] = !st[t];
  document.getElementById('ch-' + t).className = 'chip' + (st[t] ? ' on-' + t : '');
  if (pw) generate();
}

function preset(p) {
  const ps = {
    pin: { l:false, u:false, n:true,  s:false, len:6  },
    web: { l:true,  u:true,  n:true,  s:false, len:16 },
    api: { l:true,  u:true,  n:true,  s:true,  len:32 },
    max: { l:true,  u:true,  n:true,  s:true,  len:64 }
  };
  Object.assign(st, ps[p]);
  document.getElementById('lenSlider').value = st.len;
  document.getElementById('lenVal').textContent = st.len;
  ['l','u','n','s'].forEach(t => {
    document.getElementById('ch-' + t).className = 'chip' + (st[t] ? ' on-' + t : '');
  });
  generate();
}

// ── History ───────────────────────────────────────────────────
function addHist(p) {
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  hist.unshift({ pw:p, time });
  if (hist.length > 8) hist.pop();
  renderHist();
}

function renderHist() {
  const el = document.getElementById('histList');
  if (!hist.length) { el.innerHTML = '<div class="hempty">No history yet — generate a password to get started.</div>'; return; }
  el.innerHTML = hist.map(h =>
    `<div class="hi">
       <span class="hpw">${h.pw}</span>
       <span class="ht">${h.time}</span>
       <button class="hcopy" onclick="copyText('${h.pw}',this)">Copy</button>
     </div>`
  ).join('');
}

function copyText(t, b) {
  navigator.clipboard.writeText(t).then(() => {
    b.textContent = 'Done ✓';
    setTimeout(() => b.textContent = 'Copy', 1600);
  });
}

function clearHist() { hist = []; renderHist(); }

// ── User-string Refine (new flow) ────────────────────────────
let userOriginalString = '';

function onUserStringChange() {
  const val = document.getElementById('userStringInp').value;
  const btn = document.getElementById('refineGoBtn');
  btn.disabled = val.trim().length === 0;
  // if user clears input while result is shown, collapse
  if (!val.trim() && document.getElementById('sampleWrap').style.display !== 'none') {
    discardSample();
  }
}

// Strengthen a user-provided string:
// 1. Keep original chars, ensuring excluded chars are removed
// 2. Randomly capitalise some letters
// 3. Apply basic l33t substitutions on a few chars
// 4. Insert random chars from active charset to reach a minimum length
// 5. Append a short random suffix of numbers/symbols
function strengthenString(raw) {
  const l33tMap = { a:'@', e:'3', i:'!', o:'0', s:'$', t:'+', l:'1', g:'9', b:'8', z:'2' };
  const cs = charset() || LOWER;
  let arr = raw.split('').filter(c => !st.exc.includes(c));

  // Random capitalise ~40% of lowercase letters
  arr = arr.map(c => {
    if (LOWER.includes(c) && Math.random() < 0.4) return c.toUpperCase();
    return c;
  });

  // Apply l33t substitution on ~35% of eligible lowercase chars
  arr = arr.map(c => {
    const lc = c.toLowerCase();
    if (l33tMap[lc] && Math.random() < 0.35) return l33tMap[lc];
    return c;
  });

  // Pad to at least 12 chars with random charset chars
  const minLen = Math.max(12, arr.length + 3);
  while (arr.length < minLen) {
    const ra = new Uint32Array(1); crypto.getRandomValues(ra);
    arr.splice(Math.floor(Math.random() * (arr.length + 1)), 0, cs[ra[0] % cs.length]);
  }

  // Fisher-Yates partial shuffle (only shuffle the inserted characters, keep feel)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}

function loadUserString() {
  const raw = document.getElementById('userStringInp').value.trim();
  if (!raw) return;
  userOriginalString = raw;
  samplePw = strengthenString(raw);
  document.getElementById('sampleEmpty').style.display = 'none';
  document.getElementById('sampleWrap').style.display  = 'block';
  document.getElementById('refineOriginal').textContent = raw;
  renderPw(samplePw, document.getElementById('samplePw'), st.inc);
  setMascot('thinking');
  setTimeout(() => setMascot('idle'), 1200);
}

function reRefine() {
  if (!userOriginalString) return;
  samplePw = strengthenString(userOriginalString);
  renderPw(samplePw, document.getElementById('samplePw'), st.inc);
  setMascot('thinking');
  setTimeout(() => setMascot('idle'), 900);
}

function discardSample() {
  samplePw = '';
  userOriginalString = '';
  document.getElementById('sampleWrap').style.display  = 'none';
  document.getElementById('sampleEmpty').style.display = 'block';
  document.getElementById('userStringInp').value = '';
  const btn = document.getElementById('refineGoBtn');
  if (btn) btn.disabled = false;
}

function useSample() {
  if (!samplePw) return;
  pw = samplePw;
  renderPw(pw, document.getElementById('pwOut'), st.inc);
  updateMetrics(pw);
  const bits = pw.length * Math.log2(Math.max(charset().length, 1));
  updateLengthBadge(pw.length);
  addHist(pw);
  discardSample();
}

function refine(action) {
  if (!samplePw) return;
  let p = samplePw.split('');
  const randFrom = s => s[Math.floor(Math.random() * s.length)];
  const replaceType = (from, to) => {
    const idxs = p.map((c, i) => typeOf(c) === from ? i : -1).filter(i => i >= 0);
    if (idxs.length > 0) { const i = idxs[Math.floor(Math.random() * idxs.length)]; p[i] = randFrom(to); }
  };
  if      (action === 'more-upper') p[Math.floor(Math.random()*p.length)] = randFrom(UPPER);
  else if (action === 'more-lower') p[Math.floor(Math.random()*p.length)] = randFrom(LOWER);
  else if (action === 'more-num')   p[Math.floor(Math.random()*p.length)] = randFrom(NUMS);
  else if (action === 'more-sym')   p[Math.floor(Math.random()*p.length)] = randFrom(SYMS);
  else if (action === 'less-upper') replaceType('u', LOWER);
  else if (action === 'less-num')   replaceType('n', LOWER);
  else if (action === 'less-sym')   replaceType('s', LOWER + UPPER);
  else if (action === 'longer') {
    const cs = charset();
    const add = new Uint32Array(4); crypto.getRandomValues(add);
    Array.from(add, v => p.push(cs[v % cs.length]));
    st.len = p.length;
    document.getElementById('lenSlider').value = st.len;
    document.getElementById('lenVal').textContent = st.len;
  } else if (action === 'shorter') {
    p = p.slice(0, Math.max(6, p.length - 4));
    st.len = p.length;
    document.getElementById('lenSlider').value = st.len;
    document.getElementById('lenVal').textContent = st.len;
  } else if (action === 'memorable') {
    const v = 'aeiou', co = 'bcdfghjklmnpqrstvwxyz';
    p = p.map((c, i) => typeOf(c) === 'l' ? (i % 2 === 0 ? randFrom(co) : randFrom(v)) : c);
  } else if (action === 'l33t') {
    const map = { a:'@',e:'3',i:'!',o:'0',s:'$',t:'+',l:'1',g:'9',b:'8',z:'2' };
    p = p.map(c => { const k=c.toLowerCase(); return (map[k] && Math.random()<0.6) ? map[k] : c; });
  } else if (action === 'pad-sym') {
    const syms = '!@#$%^&*';
    p.unshift(randFrom(syms));
    p.push(randFrom(syms));
  }
  samplePw = p.join('');
  renderPw(samplePw, document.getElementById('samplePw'), st.inc);
}

// ── Theme ─────────────────────────────────────────────────────
function toggleTheme() {
  const root = document.documentElement;
  const isLight = root.getAttribute('data-theme') === 'light';
  root.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('kf-theme', isLight ? 'dark' : 'light');
  updateThemeIcon(!isLight);
}

function updateThemeIcon(isLight) {
  const icon = document.getElementById('themeIcon');
  icon.innerHTML = isLight
    ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
}

// ── Init ──────────────────────────────────────────────────────
(function init() {
  const saved = localStorage.getItem('kf-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme === 'light');
  setTimeout(() => { setMascot('idle'); generate(); }, 180);
})();
