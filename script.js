/* ============================================================
   WESCO 사업소개 v2 - script
   ============================================================ */

const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');
const progressFill = document.getElementById('progressFill');

function updateActiveSection() {
  let current = 'hero';
  const scrollY = window.scrollY + window.innerHeight * 0.3;
  sections.forEach(sec => {
    if (sec.offsetTop <= scrollY) current = sec.id;
  });
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('href') === '#' + current);
  });
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = (window.scrollY / docH) * 100;
  progressFill.style.width = `${Math.min(pct, 100)}%`;
}

window.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('load', updateActiveSection);

const sidebar = document.getElementById('sidebar');
document.getElementById('mobileToggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', () => sidebar.classList.remove('open')));

/* 카운터 */
function animateCounter(el, target, duration = 1600) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = '1';
      animateCounter(entry.target, parseInt(entry.target.dataset.count, 10));
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* 막대 그래프 */
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.3 });

document.querySelectorAll('.bar-fill').forEach(el => barObserver.observe(el));

/* Hero 배경 파형 */
function drawHeroWaveform() {
  const path = document.getElementById('wavePath');
  if (!path) return;
  const w = 1200, h = 400;
  let d = `M 0 ${h/2}`;
  for (let x = 0; x <= w; x += 6) {
    const y = h/2 + Math.sin((x / w) * Math.PI * 6) * 40;
    d += ` L ${x} ${y}`;
  }
  path.setAttribute('d', d);
}
drawHeroWaveform();

/* 도미노 효과 */
const dominoRow = document.getElementById('dominoRow');
const dominoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.fell) {
      entry.target.dataset.fell = '1';
      setTimeout(() => entry.target.classList.add('fall'), 300);
    }
  });
}, { threshold: 0.4 });

if (dominoRow) dominoObserver.observe(dominoRow);

/* SAG 산점도 점 */
const sagDots = document.getElementById('sagDots');
const sagObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.3 });

if (sagDots) sagObserver.observe(sagDots);

/* ============================================================
   02. 작동 원리 - 토글
   ============================================================ */
const toggleBtns = document.querySelectorAll('.toggle-btn');
const howStage = document.getElementById('howStage');
const infoMode = document.getElementById('infoMode');
const infoBody = document.getElementById('infoBody');
const howInfo = document.querySelector('.how-info');

const lineIds = ['line-1', 'line-2', 'line-3', 'line-4', 'line-5', 'line-6'];

function setLineStyle(id, color, width, dash) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', width);
  if (dash) el.setAttribute('stroke-dasharray', dash);
  else el.removeAttribute('stroke-dasharray');
}

const modes = {
  bypass: {
    title: '평상시 대기 모드',
    body: [
      ['1', '계통 전원 → SCR 스위치 → 부하 설비로 직접 공급'],
      ['2', '일부 전력으로 EDLC 충전 유지 (대기 상태)'],
      ['3', '자체 손실 최소, <strong>98% 고효율</strong> 운전']
    ],
    apply() {
      howStage.classList.remove('storm');
      howInfo.classList.remove('comp');
      // 계통 → SCR → 부하 (활성)
      setLineStyle('line-1', '#4F926D', 3);
      setLineStyle('line-2', '#4F926D', 3);
      // SCR → EDLC (느린 충전)
      setLineStyle('line-3', '#5B7AA8', 1.5, '4 4');
      setLineStyle('line-4', '#A8A29E', 1.5, '4 4');
      setLineStyle('line-5', '#A8A29E', 1.5, '4 4');
      setLineStyle('line-6', '#A8A29E', 1.5, '4 4');
      document.getElementById('scrIndicator')?.setAttribute('fill', '#4F926D');
      document.getElementById('comp-overlay')?.setAttribute('opacity', '0');
      animateFlow('bypass');
    }
  },
  comp: {
    title: '사고시 보상 모드 (2 ms 이내)',
    body: [
      ['1', 'SAG 감지 → SCR 스위치가 <strong>계통 전원 차단</strong>'],
      ['2', 'EDLC 저장 에너지 → <strong>인버터 인버팅 동작</strong> → 부하 공급'],
      ['3', '동시에 계통 감시 → 복구 시 <strong>계통 재공급 절체</strong>'],
      ['4', '모든 동작 <strong style="color:#E1431B">2 ms 이내 완료</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.add('comp');
      // 계통 → SCR (차단)
      setLineStyle('line-1', '#A8A29E', 1.5, '4 4');
      setLineStyle('line-2', '#A8A29E', 1.5, '4 4');
      // SCR → EDLC → 인버터 → 부하 (활성)
      setLineStyle('line-3', '#E1431B', 3);
      setLineStyle('line-4', '#E1431B', 3);
      setLineStyle('line-5', '#E1431B', 3);
      setLineStyle('line-6', '#E1431B', 3);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#E1431B');
      document.getElementById('comp-overlay')?.setAttribute('opacity', '1');
      animateFlow('comp');
    }
  }
};

let flowAnim;

function animateFlow(mode) {
  if (flowAnim) cancelAnimationFrame(flowAnim);
  const dot1 = document.getElementById('flowDot1');
  const dot2 = document.getElementById('flowDot2');
  if (!dot1 || !dot2) return;

  // bypass: 계통 → SCR → 부하 (위쪽 라인)
  // comp: SCR → EDLC → 인버터 → 부하 (아래쪽 우회)
  const bypassPath = [[20,180],[140,180],[280,180],[400,180],[700,180]];
  const compPath = [[280,180],[340,210],[340,270],[400,300],[510,300],[600,300],[600,180],[700,180]];

  const path = mode === 'bypass' ? bypassPath : compPath;
  const color = mode === 'bypass' ? '#4F926D' : '#E1431B';

  dot1.setAttribute('fill', color);
  dot2.setAttribute('fill', color);
  dot1.setAttribute('opacity', '1');
  dot2.setAttribute('opacity', '0.6');

  let t1 = 0, t2 = 0.5;

  function step() {
    t1 += 0.006; if (t1 > 1) t1 = 0;
    t2 += 0.006; if (t2 > 1) t2 = 0;

    function pos(t) {
      const idx = Math.floor(t * (path.length - 1));
      const lt = (t * (path.length - 1)) - idx;
      const p0 = path[idx];
      const p1 = path[Math.min(idx + 1, path.length - 1)];
      return [p0[0] + (p1[0] - p0[0]) * lt, p0[1] + (p1[1] - p0[1]) * lt];
    }

    const [x1, y1] = pos(t1);
    const [x2, y2] = pos(t2);
    dot1.setAttribute('cx', x1); dot1.setAttribute('cy', y1);
    dot2.setAttribute('cx', x2); dot2.setAttribute('cy', y2);

    flowAnim = requestAnimationFrame(step);
  }
  step();
}

function setMode(mode) {
  const data = modes[mode];
  if (!data) return;
  infoMode.textContent = data.title;
  infoBody.innerHTML = data.body.map(([n, t]) =>
    `<div class="seq-step"><span class="seq-no">${n}</span><span>${t}</span></div>`
  ).join('');
  data.apply();
}

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setMode(btn.dataset.mode);
  });
});

// 다이어그램 진입 시 초기 모드 설정
const howObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.init) {
      entry.target.dataset.init = '1';
      setMode('bypass');
    }
  });
}, { threshold: 0.3 });

if (howStage) howObserver.observe(howStage);

/* 키보드 단축키 */
const sectionIds = ['hero','need','how','products','viewer','why','cases','network','report','contact'];

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const num = parseInt(e.key);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    document.getElementById(sectionIds[num])?.scrollIntoView({ behavior: 'smooth' });
  }
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    const cur = sectionIds.findIndex(id => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return r && r.top > -100 && r.top < window.innerHeight * 0.5;
    });
    document.getElementById(sectionIds[Math.min(cur + 1, sectionIds.length - 1)])?.scrollIntoView({ behavior: 'smooth' });
  }
  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    const cur = sectionIds.findIndex(id => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return r && r.top > -100 && r.top < window.innerHeight * 0.5;
    });
    document.getElementById(sectionIds[Math.max(cur - 1, 0)])?.scrollIntoView({ behavior: 'smooth' });
  }
});

console.log('%c WESCO TSP® · Smart POWER Vaccine™ ', 'background:#E1431B;color:#FDFCF9;font-weight:bold;padding:6px 12px;font-size:13px;');
