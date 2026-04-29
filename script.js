/* ============================================================
   WESCO 사업소개 v2 - script
   ============================================================ */

// ────────────────────────────────────────────
// 사이드바 활성 섹션 + 진행률
// ────────────────────────────────────────────
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

  // 진행률
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = (window.scrollY / docH) * 100;
  progressFill.style.width = `${Math.min(pct, 100)}%`;
}

window.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('load', updateActiveSection);

// ────────────────────────────────────────────
// 모바일 햄버거
// ────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobileToggle');

mobileToggle?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', () => sidebar.classList.remove('open'));
});

// ────────────────────────────────────────────
// 카운터 애니메이션
// ────────────────────────────────────────────
function animateCounter(el, target, duration = 1600) {
  const start = performance.now();
  const startVal = 0;
  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = val.toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = '1';
      const target = parseInt(entry.target.dataset.count, 10);
      animateCounter(entry.target, target);
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// ────────────────────────────────────────────
// 막대 그래프 애니메이션 (산업별 + vs UPS)
// ────────────────────────────────────────────
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.bar-fill, .vs-row-fill').forEach(el => barObserver.observe(el));

// ────────────────────────────────────────────
// Hero 배경 파형 SVG (잔잔한 사인파)
// ────────────────────────────────────────────
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

// ────────────────────────────────────────────
// SAG 파형 애니메이션 (01. 왜 필요한가)
// ────────────────────────────────────────────
function drawSagWaves() {
  const w = 600, h = 240;
  const sagPath = document.getElementById('sagWaveNoTSP');
  const tspPath = document.getElementById('sagWaveTSP');
  if (!sagPath || !tspPath) return;

  // TSP 미설치: 정상 → SAG 발생 → 강하 → 회복
  let d1 = `M 0 ${h/2}`;
  for (let x = 0; x <= w; x += 3) {
    let y;
    if (x < w * 0.35) {
      // 정상
      y = h/2 + Math.sin((x / w) * Math.PI * 16) * 50;
    } else if (x < w * 0.65) {
      // SAG (전압 강하)
      y = h/2 + Math.sin((x / w) * Math.PI * 16) * 12;
    } else {
      // 회복
      y = h/2 + Math.sin((x / w) * Math.PI * 16) * 50;
    }
    d1 += ` L ${x} ${y}`;
  }
  sagPath.setAttribute('d', d1);

  // TSP 적용: 항상 정상 (안정 정현파)
  let d2 = `M 0 ${h/2}`;
  for (let x = 0; x <= w; x += 3) {
    const y = h/2 + Math.sin((x / w) * Math.PI * 16) * 50;
    d2 += ` L ${x} ${y}`;
  }
  tspPath.setAttribute('d', d2);

  // path animation: stroke-dasharray
  const totalLen = sagPath.getTotalLength();
  sagPath.style.strokeDasharray = totalLen;
  sagPath.style.strokeDashoffset = totalLen;

  const tspLen = tspPath.getTotalLength();
  tspPath.style.strokeDasharray = tspLen;
  tspPath.style.strokeDashoffset = tspLen;
}
drawSagWaves();

// SAG 파형 애니메이션 트리거
const sagObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.played) {
      entry.target.dataset.played = '1';
      const sagPath = document.getElementById('sagWaveNoTSP');
      const tspPath = document.getElementById('sagWaveTSP');
      if (sagPath) {
        sagPath.style.transition = 'stroke-dashoffset 2.5s ease-out';
        sagPath.style.strokeDashoffset = '0';
      }
      if (tspPath) {
        setTimeout(() => {
          tspPath.style.transition = 'stroke-dashoffset 2.5s ease-out';
          tspPath.style.strokeDashoffset = '0';
        }, 800);
      }
    }
  });
}, { threshold: 0.4 });

const sagWave = document.querySelector('.sag-wave');
if (sagWave) sagObserver.observe(sagWave);

// ────────────────────────────────────────────
// 02. TSP 회로 다이어그램 토글
// ────────────────────────────────────────────
const toggleBtns = document.querySelectorAll('.toggle-btn');
const diagramInfo = document.getElementById('diagramInfo');
const pathBypass = document.getElementById('pathBypass');
const pathComp = document.getElementById('pathComp');
const flowDot = document.getElementById('flowDot');

const modeData = {
  bypass: {
    title: '평상시 운전 모드',
    body: '입력 전원이 <strong>By-Pass SCR을 통해 부하로 직결</strong>됩니다.<br>전력 소비 ≈ 2%, 자체 손실 최소화. <strong>98% 고효율</strong> 운전.',
    bypassColor: '#4F926D', bypassWidth: 3, bypassDash: 'none',
    compColor: '#A8A29E', compWidth: 2, compDash: '6 4'
  },
  comp: {
    title: '사고 시 보상 동작 (2ms 이내)',
    body: 'SAG 발생 감지 → <strong>By-Pass 차단 → EDLC 에너지 방전 → 인버터 보상</strong>.<br>2ms 이내 보상 완료, 부하 측 무중단 가동.',
    bypassColor: '#A8A29E', bypassWidth: 2, bypassDash: '6 4',
    compColor: '#E1431B', compWidth: 3, compDash: 'none'
  }
};

let flowAnimId = null;

function setMode(mode) {
  const data = modeData[mode];
  diagramInfo.innerHTML = `<div class="info-mode">${data.title}</div><p>${data.body}</p>`;

  if (pathBypass) {
    pathBypass.setAttribute('stroke', data.bypassColor);
    pathBypass.setAttribute('stroke-width', data.bypassWidth);
    if (data.bypassDash === 'none') {
      pathBypass.removeAttribute('stroke-dasharray');
    } else {
      pathBypass.setAttribute('stroke-dasharray', data.bypassDash);
    }
  }
  if (pathComp) {
    pathComp.setAttribute('stroke', data.compColor);
    pathComp.setAttribute('stroke-width', data.compWidth);
    if (data.compDash === 'none') {
      pathComp.removeAttribute('stroke-dasharray');
    } else {
      pathComp.setAttribute('stroke-dasharray', data.compDash);
    }
  }

  // 흐름 점 애니메이션
  if (flowAnimId) cancelAnimationFrame(flowAnimId);
  if (flowDot) {
    flowDot.style.opacity = '1';
    let t = 0;
    const path = mode === 'bypass'
      ? [[100,180],[180,180],[180,80],[400,80],[600,80],[600,180],[700,180]]
      : [[100,180],[180,180],[180,280],[260,280],[360,280],[460,280],[600,280],[600,180],[700,180]];

    function animate() {
      t += 0.008;
      if (t > 1) t = 0;
      const idx = Math.floor(t * (path.length - 1));
      const lt = (t * (path.length - 1)) - idx;
      const p0 = path[idx];
      const p1 = path[Math.min(idx + 1, path.length - 1)];
      const x = p0[0] + (p1[0] - p0[0]) * lt;
      const y = p0[1] + (p1[1] - p0[1]) * lt;
      flowDot.setAttribute('cx', x);
      flowDot.setAttribute('cy', y);
      flowDot.setAttribute('fill', mode === 'bypass' ? '#4F926D' : '#E1431B');
      flowAnimId = requestAnimationFrame(animate);
    }
    animate();
  }
}

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setMode(btn.dataset.mode);
  });
});

// 초기 모드 + 다이어그램 진입 시 애니메이션 시작
const diagObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.init) {
      entry.target.dataset.init = '1';
      setMode('bypass');
    }
  });
}, { threshold: 0.3 });

const diagStage = document.getElementById('diagramStage');
if (diagStage) diagObserver.observe(diagStage);

// ────────────────────────────────────────────
// 키보드 네비게이션 (1~9 + ↑↓)
// ────────────────────────────────────────────
const sectionIds = ['hero','need','how','products','tech','cases','industry','network','roi','contact'];

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const num = parseInt(e.key);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    const target = document.getElementById(sectionIds[num]);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }

  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    const current = sectionIds.findIndex(id =>
      document.getElementById(id)?.getBoundingClientRect().top > -100 &&
      document.getElementById(id)?.getBoundingClientRect().top < window.innerHeight * 0.5
    );
    const next = sectionIds[Math.min(current + 1, sectionIds.length - 1)];
    document.getElementById(next)?.scrollIntoView({ behavior: 'smooth' });
  }

  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    const current = sectionIds.findIndex(id =>
      document.getElementById(id)?.getBoundingClientRect().top > -100 &&
      document.getElementById(id)?.getBoundingClientRect().top < window.innerHeight * 0.5
    );
    const prev = sectionIds[Math.max(current - 1, 0)];
    document.getElementById(prev)?.scrollIntoView({ behavior: 'smooth' });
  }
});

console.log('%c WESCO TSP® · Smart POWER Vaccine™ ', 'background:#E1431B;color:#FDFCF9;font-weight:bold;padding:6px 12px;font-size:13px;');
