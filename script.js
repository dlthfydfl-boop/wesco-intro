/* ============================================================
   WESCO Power Reliability Solution - script v2.1
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
    const y = h/2 + Math.sin((x / w) * Math.PI * 6) * 35;
    d += ` L ${x} ${y}`;
  }
  path.setAttribute('d', d);
}
drawHeroWaveform();

/* 도미노 3D — 한 개씩 순차적으로 무너짐 */
const dominoRow = document.getElementById('dominoRow');

function fallDominoes() {
  if (!dominoRow) return;
  const dominoes = dominoRow.querySelectorAll('.domino');
  dominoes.forEach((d, i) => {
    setTimeout(() => d.classList.add('fall'), 600 + i * 700);  // 각 도미노 700ms 간격
  });
}

const dominoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.fell) {
      entry.target.dataset.fell = '1';
      fallDominoes();
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
   03. 작동 원리 - 양방향 인버터 회로 토글
   ============================================================ */
const toggleBtns = document.querySelectorAll('.toggle-btn');
const howStage = document.getElementById('howStage');
const infoMode = document.getElementById('infoMode');
const infoBody = document.getElementById('infoBody');
const metaTime = document.getElementById('metaTime');
const howInfo = document.querySelector('.how-info');

function setLineStyle(id, color, width, dash) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', width);
  el.setAttribute('opacity', 1);
  if (dash) el.setAttribute('stroke-dasharray', dash);
  else el.removeAttribute('stroke-dasharray');
}

const modes = {
  bypass: {
    title: 'STANDBY · 평상시 대기 모드',
    timeText: '상시 운전 · 98% 효율',
    body: [
      ['1', '계통 → SCR 스위치 → <strong>부하 설비 직접 공급</strong>'],
      ['2', '일부 전력으로 양방향 인버터 통해 <strong>EDLC 충전 유지</strong>'],
      ['3', '자체 손실 최소, <strong>98% 고효율</strong> 상시 운전']
    ],
    apply() {
      howStage.classList.remove('storm');
      howInfo.classList.remove('comp');
      // 메인 라인: 계통 → SCR → 부하 (활성)
      setLineStyle('line-1', '#4F926D', 3);
      setLineStyle('line-2', '#4F926D', 3);
      // 충전 라인: SCR → 인버터 → EDLC (서서히 충전)
      setLineStyle('line-3', '#5B7AA8', 1.8, '5 4');
      setLineStyle('line-4', '#5B7AA8', 1.8, '5 4');
      // 인버터 → 부하 라인 (대기, 비활성)
      const l5 = document.getElementById('line-5');
      if (l5) {
        l5.setAttribute('stroke', '#A8A29E');
        l5.setAttribute('stroke-width', 1.5);
        l5.setAttribute('opacity', 0.4);
        l5.removeAttribute('stroke-dasharray');
      }

      document.getElementById('scrIndicator')?.setAttribute('fill', '#4F926D');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#4F926D');
      animateFlow('bypass');
    }
  },
  comp: {
    title: 'COMPENSATION · 사고시 보상 모드 (≤ 2 ms)',
    timeText: '동작 완료 ≤ 2 ms',
    body: [
      ['1', 'SAG 감지 → <strong>SCR 스위치가 계통 차단</strong>'],
      ['2', '<strong>EDLC 저장 에너지</strong> → 양방향 인버터 (DC→AC) → 부하 공급'],
      ['3', '동시에 계통 감시 → 복구 시 <strong>계통 재공급 절체</strong>'],
      ['4', '모든 동작 <strong style="color:#C13816">2 ms 이내 완료</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.add('comp');
      // 메인 라인 차단: 계통 → SCR (점선, 차단)
      setLineStyle('line-1', '#A8A29E', 1.5, '5 4');
      setLineStyle('line-2', '#A8A29E', 1.5, '5 4');
      // EDLC → 인버터 → 부하 (활성, 빨간색)
      // EDLC → 인버터 (방전 방향)
      setLineStyle('line-4', '#C13816', 3);
      // 인버터 → 부하 (line-5 활성화)
      const l5 = document.getElementById('line-5');
      if (l5) {
        l5.setAttribute('stroke', '#C13816');
        l5.setAttribute('stroke-width', 3);
        l5.setAttribute('opacity', 1);
        l5.removeAttribute('stroke-dasharray');
      }
      // line-3 (SCR-인버터 분기) 약화
      setLineStyle('line-3', '#A8A29E', 1.5, '5 4');

      document.getElementById('scrIndicator')?.setAttribute('fill', '#C13816');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#C13816');
      animateFlow('comp');
    }
  }
};

let flowAnim;

function animateFlow(mode) {
  if (flowAnim) cancelAnimationFrame(flowAnim);
  const dot1 = document.getElementById('flowDot1');
  const dot2 = document.getElementById('flowDot2');
  const dot3 = document.getElementById('flowDot3');
  if (!dot1 || !dot2 || !dot3) return;

  // bypass: 계통(20,200) → SCR(290,200) → 부하(820,200)
  // bypass 충전: SCR(430,200) → 인버터(430,300) → EDLC(610,300)
  // comp: EDLC(610,300) → 인버터(430,300) → 부하(820,200)
  const bypassMain = [[20,200],[120,200],[240,200],[340,200],[700,200],[820,200]];
  const bypassCharge = [[430,200],[430,270],[480,300],[560,300],[610,300]];
  const compFlow = [[610,300],[560,300],[480,300],[430,300],[430,270],[430,200],[700,200],[820,200]];

  if (mode === 'bypass') {
    dot1.setAttribute('fill', '#4F926D');
    dot2.setAttribute('fill', '#4F926D');
    dot3.setAttribute('fill', '#5B7AA8');
    dot1.setAttribute('opacity', 1);
    dot2.setAttribute('opacity', 0.7);
    dot3.setAttribute('opacity', 0.7);
  } else {
    dot1.setAttribute('fill', '#C13816');
    dot2.setAttribute('fill', '#C13816');
    dot3.setAttribute('opacity', 0);
    dot1.setAttribute('opacity', 1);
    dot2.setAttribute('opacity', 0.7);
  }

  let t1 = 0, t2 = 0.4, tc = 0;

  function pos(path, t) {
    const idx = Math.floor(t * (path.length - 1));
    const lt = (t * (path.length - 1)) - idx;
    const p0 = path[idx];
    const p1 = path[Math.min(idx + 1, path.length - 1)];
    return [p0[0] + (p1[0] - p0[0]) * lt, p0[1] + (p1[1] - p0[1]) * lt];
  }

  function step() {
    const speed = mode === 'bypass' ? 0.005 : 0.012;
    t1 += speed; if (t1 > 1) t1 = 0;
    t2 += speed; if (t2 > 1) t2 = 0;
    tc += 0.003; if (tc > 1) tc = 0;

    if (mode === 'bypass') {
      const [x1, y1] = pos(bypassMain, t1);
      const [x2, y2] = pos(bypassMain, t2);
      const [xc, yc] = pos(bypassCharge, tc);
      dot1.setAttribute('cx', x1); dot1.setAttribute('cy', y1);
      dot2.setAttribute('cx', x2); dot2.setAttribute('cy', y2);
      dot3.setAttribute('cx', xc); dot3.setAttribute('cy', yc);
    } else {
      const [x1, y1] = pos(compFlow, t1);
      const [x2, y2] = pos(compFlow, t2);
      dot1.setAttribute('cx', x1); dot1.setAttribute('cy', y1);
      dot2.setAttribute('cx', x2); dot2.setAttribute('cy', y2);
    }

    flowAnim = requestAnimationFrame(step);
  }
  step();
}

function setMode(mode) {
  const data = modes[mode];
  if (!data) return;
  if (infoMode) infoMode.textContent = data.title;
  if (metaTime) metaTime.textContent = data.timeText;
  if (infoBody) {
    infoBody.innerHTML = data.body.map(([n, t]) =>
      `<div class="seq-step"><span class="seq-no">${n}</span><span>${t}</span></div>`
    ).join('');
  }
  data.apply();
}

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setMode(btn.dataset.mode);
  });
});

const howObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.init) {
      entry.target.dataset.init = '1';
      setMode('bypass');
    }
  });
}, { threshold: 0.3 });

if (howStage) howObserver.observe(howStage);

/* 키보드 단축키 (11개 섹션) */
const sectionIds = ['hero','about','need','how','products','viewer','why','cases','network','report','contact'];

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

console.log('%c WESCO · Power Reliability Solution ', 'background:#C13816;color:#FDFCF9;font-weight:bold;padding:6px 12px;font-size:13px;');
