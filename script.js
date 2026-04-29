/* ============================================================
   WESCO v5 - script
   ============================================================ */

const main = document.querySelector('.main');
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');
const progressFill = document.getElementById('progressFill');

function updateActiveSection() {
  const scrollY = main.scrollTop + window.innerHeight * 0.3;
  let current = 'hero';
  sections.forEach(sec => { if (sec.offsetTop <= scrollY) current = sec.id; });
  navItems.forEach(item => { item.classList.toggle('active', item.getAttribute('href') === '#' + current); });
  const docH = main.scrollHeight - window.innerHeight;
  progressFill.style.width = `${Math.min((main.scrollTop / docH) * 100, 100)}%`;
  const currentEl = document.getElementById(current);
  document.body.classList.toggle('cursor-active', currentEl?.dataset.dark !== undefined);
}

main.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('load', updateActiveSection);

navItems.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    main.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    sidebar.classList.remove('open');
  });
});

const sidebar = document.getElementById('sidebar');
document.getElementById('mobileToggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));

/* Cursor Glow */
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
function animateGlow() {
  glowX += (mouseX - glowX) * 0.10;
  glowY += (mouseY - glowY) * 0.10;
  if (cursorGlow) cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateGlow);
}
animateGlow();

/* Magnetic */
document.querySelectorAll('[data-magnetic]').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0, 0)'; });
});

/* Reveal */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
}, { root: main, threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(el => revealObserver.observe(el));

/* 카운터 */
function animateCounter(el, target, duration = 2000) {
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
}, { root: main, threshold: 0.4 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* SAG dots reveal */
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
}, { root: main, threshold: 0.3 });

document.querySelectorAll('#sagDots').forEach(el => barObserver.observe(el));

/* Hero 파형 */
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

/* ============================================================
   03. 작동 원리 - 회로 토글
   ============================================================ */
const toggleBtns = document.querySelectorAll('.toggle-btn');
const howStage = document.getElementById('howStage');
const infoMode = document.getElementById('infoMode');
const infoBody = document.getElementById('infoBody');
const howInfo = document.querySelector('.how-info');

function setLineStyle(id, color, width, dash) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'stroke 0.6s ease, stroke-width 0.6s ease, opacity 0.6s ease';
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', width);
  el.setAttribute('opacity', 1);
  if (dash) el.setAttribute('stroke-dasharray', dash);
  else el.removeAttribute('stroke-dasharray');
}

const modes = {
  bypass: {
    title: 'STANDBY · 평상시 대기 모드',
    body: [
      ['1', '계통 → SCR → <strong>부하 직접 공급</strong>'],
      ['2', '일부 전력으로 <strong>EDLC 충전 유지</strong>'],
      ['3', '자체 손실 최소, <strong>98% 고효율</strong> 운전']
    ],
    apply() {
      howStage.classList.remove('storm');
      howInfo.classList.remove('comp');
      // 평상시 - 메인 흐름 (녹색 실선)
      setLineStyle('line-1', '#4F926D', 3);
      setLineStyle('line-2', '#4F926D', 3);
      // 충전 (점선)
      setLineStyle('line-3', '#5B7AA8', 1.8, '5 4');
      setLineStyle('line-4', '#5B7AA8', 1.8, '5 4');
      // 인버터→부하 (대기, 흐릿)
      const l5 = document.getElementById('line-5');
      if (l5) {
        l5.style.transition = 'stroke 0.6s ease, opacity 0.6s ease';
        l5.setAttribute('stroke', '#A8A29E');
        l5.setAttribute('stroke-width', 1.5);
        l5.setAttribute('opacity', 0.4);
        l5.removeAttribute('stroke-dasharray');
      }
      // 출력 라인 (항상 실선)
      const lo = document.getElementById('line-output');
      if (lo) {
        lo.style.transition = 'stroke 0.6s ease';
        lo.setAttribute('stroke', '#4F926D');
        lo.setAttribute('stroke-width', 2.5);
        lo.removeAttribute('stroke-dasharray');
      }
      document.getElementById('scrIndicator')?.setAttribute('fill', '#4F926D');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#4F926D');
      animateFlow('bypass');
    }
  },
  comp: {
    title: 'COMPENSATION · 사고시 보상 모드 (≤ 2 ms)',
    body: [
      ['1', 'SAG 감지 → <strong>SCR 계통 차단</strong>'],
      ['2', '<strong>EDLC 에너지</strong> → 양방향 인버터(DC→AC) → 부하'],
      ['3', '동시에 계통 감시 → 복구 시 <strong>재절체</strong>'],
      ['4', '모든 동작 <strong style="color:#C13816">2 ms 이내</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.add('comp');
      // 계통 차단 (희미)
      setLineStyle('line-1', '#A8A29E', 1.5, '5 4');
      // SCR 첫 부분 차단
      const l2 = document.getElementById('line-2');
      if (l2) {
        l2.style.transition = 'stroke 0.6s ease, stroke-width 0.6s ease';
        // 사고시: SCR(300) → 분기점(380) 까지는 차단(점선), 380 → 부하(600)는 인버터 보상 흐름(실선)
        // 실제로는 분기점 이후는 인버터 출력이므로 line-2 전체를 빨간 실선 처리 (인버터 → 부하 흐름)
        l2.setAttribute('stroke', '#C13816');
        l2.setAttribute('stroke-width', 3);
        l2.removeAttribute('stroke-dasharray');
      }
      // 인버터 → EDLC → 인버터 → 부하 우회 흐름 (모두 빨간 실선)
      setLineStyle('line-3', '#A8A29E', 1.5, '5 4');  // SCR-인버터 분기 (사용 안함)
      setLineStyle('line-4', '#C13816', 3);
      const l5 = document.getElementById('line-5');
      if (l5) {
        l5.style.transition = 'stroke 0.6s ease, opacity 0.6s ease';
        l5.setAttribute('stroke', '#C13816');
        l5.setAttribute('stroke-width', 3);
        l5.setAttribute('opacity', 1);
        l5.removeAttribute('stroke-dasharray');
      }
      // 출력 라인 (인버터에서 보상 전원이 부하로 - 빨간 실선)
      const lo = document.getElementById('line-output');
      if (lo) {
        lo.style.transition = 'stroke 0.6s ease, stroke-width 0.6s ease';
        lo.setAttribute('stroke', '#C13816');
        lo.setAttribute('stroke-width', 3);
        lo.removeAttribute('stroke-dasharray');
      }
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

  // bypass 메인: 계통(50,160) → SCR(260,160) → 부하(610,160)
  // bypass 충전: SCR(380,160) → 인버터(380,243) → EDLC(510,243)
  // comp: EDLC(510,243) → 인버터(380,243) → line-5(380→160) → line-2(380→600) → 부하(610,160)
  const bypassMain = [[10,160],[90,160],[190,160],[300,160],[600,160],[610,160]];
  const bypassCharge = [[380,160],[380,220],[420,243],[470,243],[510,243]];
  const compFlow = [[510,243],[470,243],[420,243],[380,243],[380,220],[380,160],[600,160],[610,160]];

  if (mode === 'bypass') {
    dot1.setAttribute('fill', '#4F926D');
    dot2.setAttribute('fill', '#4F926D');
    dot3.setAttribute('fill', '#5B7AA8');
    dot1.setAttribute('opacity', 1);
    dot2.setAttribute('opacity', 0.6);
    dot3.setAttribute('opacity', 0.6);
  } else {
    dot1.setAttribute('fill', '#C13816');
    dot2.setAttribute('fill', '#C13816');
    dot3.setAttribute('opacity', 0);
    dot1.setAttribute('opacity', 1);
    dot2.setAttribute('opacity', 0.65);
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
    // 천천히 고급스럽게
    const speed = mode === 'bypass' ? 0.0028 : 0.005;
    t1 += speed; if (t1 > 1) t1 = 0;
    t2 += speed; if (t2 > 1) t2 = 0;
    tc += 0.0018; if (tc > 1) tc = 0;

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
}, { root: main, threshold: 0.3 });

if (howStage) howObserver.observe(howStage);

/* ============================================================
   05. Sag-VIEWER - 메뉴 클릭 (매뉴얼 정확 매핑)
   ============================================================ */
const vfItems = document.querySelectorAll('.vf-item');
const screenImg = document.getElementById('screenImg');
const screenTitle = document.getElementById('screenTitle');
const screenCap = document.getElementById('screenCap');

vfItems.forEach(item => {
  item.addEventListener('click', () => {
    const img = item.dataset.img;
    const title = item.dataset.title;
    const cap = item.dataset.cap;
    if (!img || !screenImg) return;

    vfItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    screenImg.classList.add('fading');
    setTimeout(() => {
      screenImg.src = img;
      if (screenTitle) screenTitle.textContent = `Sag-VIEWER™ · ${title}`;
      if (screenCap && cap) screenCap.textContent = cap;
      screenImg.classList.remove('fading');
    }, 280);
  });
});

/* 키보드 (11 섹션) */
const sectionIds = ['hero','about','need','how','products','viewer','cases','network','report','qa','contact'];

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const num = parseInt(e.key);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    const target = document.getElementById(sectionIds[num]);
    if (target) main.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    const cur = sectionIds.findIndex(id => {
      const el = document.getElementById(id);
      return el && el.offsetTop > main.scrollTop + 50;
    });
    const next = cur >= 0 ? cur : sectionIds.length - 1;
    main.scrollTo({ top: document.getElementById(sectionIds[next]).offsetTop, behavior: 'smooth' });
  }
  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    let cur = sectionIds.length - 1;
    for (let i = sectionIds.length - 1; i >= 0; i--) {
      const el = document.getElementById(sectionIds[i]);
      if (el && el.offsetTop < main.scrollTop - 50) { cur = i; break; }
    }
    main.scrollTo({ top: document.getElementById(sectionIds[cur]).offsetTop, behavior: 'smooth' });
  }
});

console.log('%c WESCO · Power Reliability Solution ', 'background:#C13816;color:#FDFCF9;font-weight:bold;padding:6px 12px;font-size:13px;');
