/* ============================================================
   WESCO v5 - script
   ============================================================ */

// 페이지 진입 시 항상 Hero부터 (브라우저 스크롤 복원 끄기)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const main = document.querySelector('.main');

// URL hash 없으면 강제로 최상단 Hero로 이동
window.addEventListener('load', () => {
  if (!location.hash || location.hash === '#hero') {
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }
});
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

/* ======= 사인파 모션 — 회로 라인에 살아있는 전력 흐름 표현 ======= */
let waveAnim = null;
let wavePhase = 0;
let waveMode = 'bypass';

function drawCircuitWaves(phase, mode) {
  const w1 = document.getElementById('wave-1');   // 계통 → SCR
  const w2 = document.getElementById('wave-2');   // SCR → 부하
  const wOut = document.getElementById('wave-out'); // TSP 출력
  if (!w1 || !w2 || !wOut) return;

  const period = 30;     // 한 주기 길이 (px)
  const amp = 12;        // 진폭 (px)
  const baseY = 185;

  // ▣ wave-1 (계통 → SCR, x: 100~220) — 5단계 모드별
  let d1 = '';
  for (let x = 100; x <= 220; x += 2) {
    let curAmp;
    if (mode === 'detect') {
      // 감지 — 진폭 절반, 약간 왜곡
      curAmp = 7 + Math.sin((x - 100) * 0.1 + phase * 0.5) * 2;
    } else if (mode === 'switch' || mode === 'compensate') {
      // 절체/보상 — 거의 끊긴 상태
      curAmp = 2.5 + Math.sin((x - 100) * 0.12 + phase * 0.4) * 1;
    } else {
      // standby / recovery — 정상
      curAmp = amp;
    }
    const y = baseY + Math.sin((x - 100) * (Math.PI * 2 / period) + phase) * curAmp;
    d1 += (x === 100 ? 'M' : 'L') + ` ${x} ${y} `;
  }
  w1.setAttribute('d', d1);

  // ▣ wave-2 (SCR → 부하, x: 350~640)
  // 사고시(switch/compensate)에는 분기점(430)부터만 그림 → SCR에서 안 가는 것 표현
  // EDLC → 인버터 → 분기점 → 부하 흐름을 시각화
  const startX = (mode === 'switch' || mode === 'compensate') ? 430 : 350;
  let d2 = '';
  for (let x = startX; x <= 640; x += 2) {
    const y = baseY + Math.sin((x - startX) * (Math.PI * 2 / period) + phase) * amp;
    d2 += (x === startX ? 'M' : 'L') + ` ${x} ${y} `;
  }
  w2.setAttribute('d', d2);

  // ▣ wave-out (TSP 출력 → 부하 외부, x: 620~700)
  let dO = '';
  for (let x = 620; x <= 700; x += 2) {
    const y = baseY + Math.sin((x - 620) * (Math.PI * 2 / period) + phase) * amp;
    dO += (x === 620 ? 'M' : 'L') + ` ${x} ${y} `;
  }
  wOut.setAttribute('d', dO);
}

function startWaveLoop() {
  if (waveAnim) cancelAnimationFrame(waveAnim);
  function loop() {
    wavePhase -= 0.08;  // 흐르는 방향
    drawCircuitWaves(wavePhase, waveMode);
    waveAnim = requestAnimationFrame(loop);
  }
  loop();
}

// ▣ 5단계 동작 시퀀스
function setLine5(stroke, width, opacity = 1, dash = null) {
  const l = document.getElementById('line-5');
  if (!l) return;
  l.style.transition = 'stroke 0.6s ease, opacity 0.6s ease, stroke-width 0.6s ease';
  l.setAttribute('stroke', stroke);
  l.setAttribute('stroke-width', width);
  l.setAttribute('opacity', opacity);
  if (dash) l.setAttribute('stroke-dasharray', dash);
  else l.removeAttribute('stroke-dasharray');
}

const modes = {
  standby: {
    title: '① STANDBY · 평상시',
    body: [
      ['1', '계통전원 → <strong>BYPASS (SCR)</strong> → 부하 공급'],
      ['2', '일부 전력으로 <strong>EDLC 충전 유지</strong>'],
      ['3', '자체 손실 최소, <strong>98% 고효율</strong> 운전']
    ],
    apply() {
      howStage.classList.remove('storm');
      howInfo.classList.remove('comp');
      waveMode = 'standby';
      // 메인 라인 정상 (계통 → SCR → 부하)
      const l2s = document.getElementById('line-2');
      if (l2s) {
        l2s.style.transition = 'stroke 0.6s ease, opacity 0.6s ease, stroke-width 0.6s ease';
        l2s.setAttribute('stroke', '#22d3ee');
        l2s.setAttribute('stroke-width', 2.5);
        l2s.setAttribute('opacity', 1);
      }
      setLineStyle('line-3', '#0d9488', 1.8, '5 4');
      setLineStyle('line-4', '#0d9488', 1.8, '5 4');
      setLine5('#475569', 1.5, 0.3);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#22d3ee');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#22d3ee');
      animateFlow('standby');
    }
  },
  detect: {
    title: '② DETECT · 순간정전 감지',
    body: [
      ['1', '<strong>계통 측 전압 강하 (SAG)</strong> 발생'],
      ['2', 'TSP 내부 검출 회로 — <strong>μs 단위 즉시 감지</strong>'],
      ['3', '계통 입력 사인파 <strong>왜곡 시작</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.remove('comp');
      waveMode = 'detect';
      // 아직 SCR 활성, 부하 정상 공급 중
      const l2d = document.getElementById('line-2');
      if (l2d) {
        l2d.style.transition = 'stroke 0.6s ease';
        l2d.setAttribute('stroke', '#22d3ee');
        l2d.setAttribute('stroke-width', 2.5);
        l2d.setAttribute('opacity', 1);
      }
      setLineStyle('line-3', '#0d9488', 1.8, '5 4');
      setLineStyle('line-4', '#0d9488', 1.8, '5 4');
      setLine5('#475569', 1.5, 0.3);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#fbbf24');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#22d3ee');
    }
  },
  switch: {
    title: '③ SWITCH · 절체 (SCR 차단)',
    body: [
      ['1', '<strong>SCR 즉시 차단</strong> — 계통 측 격리'],
      ['2', '부하는 EDLC 보상 회로로 <strong>전환 준비</strong>'],
      ['3', '전환 시간 <strong style="color:#22d3ee">≤ 2 ms</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.add('comp');
      waveMode = 'switch';
      // SCR 비활성, 인버터 측 활성화 시작
      const l2 = document.getElementById('line-2');
      if (l2) {
        l2.style.transition = 'stroke 0.6s ease, opacity 0.6s ease';
        l2.setAttribute('stroke', '#475569');
        l2.setAttribute('opacity', 0.4);
      }
      setLineStyle('line-3', '#475569', 1.5, '5 4');
      setLineStyle('line-4', '#22d3ee', 2.5);
      setLine5('#22d3ee', 2.5, 1);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#dc2626');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#22d3ee');
    }
  },
  compensate: {
    title: '④ COMPENSATE · 보상 공급',
    body: [
      ['1', '<strong>EDLC → 양방향 인버터 (DC→AC)</strong>'],
      ['2', '<strong>인버터 → 부하</strong> 정상 사인파 공급'],
      ['3', '<strong style="color:#22d3ee">부하는 끊김 없이 정상 운전 지속</strong>']
    ],
    apply() {
      howStage.classList.add('storm');
      howInfo.classList.add('comp');
      waveMode = 'compensate';
      // SCR 차단 상태, 인버터 → 부하 라인 강조
      const l2 = document.getElementById('line-2');
      if (l2) {
        l2.style.transition = 'stroke 0.6s ease, opacity 0.6s ease';
        l2.setAttribute('stroke', '#22d3ee');  // 보상 흐름 (분기점 이후)
        l2.setAttribute('stroke-width', 3);
        l2.setAttribute('opacity', 1);
      }
      setLineStyle('line-3', '#475569', 1.5, '5 4');
      setLineStyle('line-4', '#22d3ee', 3);
      setLine5('#22d3ee', 3, 1);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#dc2626');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#22d3ee');
    }
  },
  recovery: {
    title: '⑤ RECOVERY · 계통 복귀 + EDLC 재충전',
    body: [
      ['1', '계통 정상화 감지 → <strong>BYPASS 재절체</strong>'],
      ['2', '계통 → 부하 직접 공급 복귀'],
      ['3', '동시에 <strong>EDLC 재충전</strong> — 다음 사고 대비']
    ],
    apply() {
      howStage.classList.remove('storm');
      howInfo.classList.remove('comp');
      waveMode = 'recovery';
      // 메인 라인 복귀
      const l2r = document.getElementById('line-2');
      if (l2r) {
        l2r.style.transition = 'stroke 0.6s ease, opacity 0.6s ease, stroke-width 0.6s ease';
        l2r.setAttribute('stroke', '#22d3ee');
        l2r.setAttribute('stroke-width', 2.5);
        l2r.setAttribute('opacity', 1);
      }
      setLineStyle('line-3', '#0d9488', 2, '4 3');  // 재충전 중 - 약간 두껍게
      setLineStyle('line-4', '#0d9488', 2, '4 3');
      setLine5('#475569', 1.5, 0.3);
      document.getElementById('scrIndicator')?.setAttribute('fill', '#22d3ee');
      document.getElementById('edlcLevel')?.setAttribute('fill', '#fbbf24');  // 충전 중
    }
  }
};

// 흐름 점 — anime.js 기반 motion path + opacity/size 트윈
let _flowAnims = [];
let flowAnim; // legacy rAF fallback

function animateFlow(mode) {
  // 모든 기존 애니메이션 정리
  _flowAnims.forEach(a => a.pause());
  _flowAnims = [];
  if (flowAnim) cancelAnimationFrame(flowAnim);

  const dots = ['flowDot1', 'flowDot2', 'flowDot3'].map(id => document.getElementById(id));
  if (dots.some(d => !d)) return;

  // 비활성 단계 — 부드럽게 페이드 아웃
  if (mode !== 'switch' && mode !== 'compensate') {
    if (window.anime) {
      anime({
        targets: dots,
        opacity: 0,
        duration: 350,
        easing: 'easeOutQuad'
      });
    } else {
      dots.forEach(d => d.setAttribute('opacity', 0));
    }
    return;
  }

  // 색상·크기 기본값
  dots[0].setAttribute('fill', '#22d3ee'); dots[0].setAttribute('r', 5);
  dots[1].setAttribute('fill', '#22d3ee'); dots[1].setAttribute('r', 4);
  dots[2].setAttribute('fill', '#22d3ee'); dots[2].setAttribute('r', 3.5);

  // 경로: EDLC(575, 267) → 인버터 우측(480, 267) → 인버터 좌측(430, 267) → line-5 끝(430, 185)
  const compPath = [[575, 267], [525, 267], [480, 267], [430, 267], [430, 220], [430, 185]];

  function posOnPath(path, t) {
    const wt = ((t % 1) + 1) % 1;
    const idx = Math.floor(wt * (path.length - 1));
    const lt = (wt * (path.length - 1)) - idx;
    const p0 = path[idx];
    const p1 = path[Math.min(idx + 1, path.length - 1)];
    return [p0[0] + (p1[0] - p0[0]) * lt, p0[1] + (p1[1] - p0[1]) * lt];
  }

  if (window.anime) {
    // 페이드 인 — 점별로 다른 최종 opacity
    [
      [dots[0], 1.0],
      [dots[1], 0.75],
      [dots[2], 0.5]
    ].forEach(([d, op]) => {
      anime({
        targets: d,
        opacity: op,
        duration: 320,
        easing: 'easeOutQuad'
      });
    });

    // 각 점 시간차로 motion path 따라 무한 루프
    [0, 0.33, 0.66].forEach((startOffset, i) => {
      const obj = { t: startOffset };
      const anim = anime({
        targets: obj,
        t: startOffset + 1,
        easing: 'linear',
        duration: 1700,
        loop: true,
        update: () => {
          const [x, y] = posOnPath(compPath, obj.t);
          dots[i].setAttribute('cx', x);
          dots[i].setAttribute('cy', y);
        }
      });
      _flowAnims.push(anim);
    });
    return;
  }

  // Fallback — 기존 rAF 로직
  dots[0].setAttribute('opacity', 1);
  dots[1].setAttribute('opacity', 0.7);
  dots[2].setAttribute('opacity', 0.5);
  let t1 = 0, t2 = 0.33, t3 = 0.66;
  function step() {
    const speed = 0.006;
    t1 += speed; if (t1 > 1) t1 = 0;
    t2 += speed; if (t2 > 1) t2 = 0;
    t3 += speed; if (t3 > 1) t3 = 0;
    const [x1, y1] = posOnPath(compPath, t1);
    const [x2, y2] = posOnPath(compPath, t2);
    const [x3, y3] = posOnPath(compPath, t3);
    dots[0].setAttribute('cx', x1); dots[0].setAttribute('cy', y1);
    dots[1].setAttribute('cx', x2); dots[1].setAttribute('cy', y2);
    dots[2].setAttribute('cx', x3); dots[2].setAttribute('cy', y3);
    flowAnim = requestAnimationFrame(step);
  }
  step();
}

// ▣ 모드별 시각적 메타 (EDLC 레벨 + 화살표)
const modeMeta = {
  standby:    { edlc: 100, recharging: false, dischargeArrow: false, compArrow: false },
  detect:     { edlc: 100, recharging: false, dischargeArrow: false, compArrow: false },
  switch:     { edlc: 92,  recharging: false, dischargeArrow: true,  compArrow: true  },
  compensate: { edlc: 65,  recharging: false, dischargeArrow: true,  compArrow: true  },
  recovery:   { edlc: 100, recharging: true,  dischargeArrow: false, compArrow: false }
};

// EDLC 현재값 — anime.js 카운터 기준점
let _edlcCurrent = 100;
let _edlcAnim = null;

function setEDLCLevel(percent, recharging = false) {
  const lv = document.getElementById('edlcLevel');
  const pc = document.getElementById('edlcPercent');
  const fillColor = recharging ? '#fbbf24' : '#22d3ee';

  if (lv) lv.setAttribute('fill', fillColor);
  if (pc) pc.setAttribute('fill', fillColor);

  // anime.js 사용 가능 시 부드러운 트윈
  if (window.anime && lv && pc) {
    if (_edlcAnim) _edlcAnim.pause();

    const fromVal = _edlcCurrent;
    const obj = { val: fromVal };

    _edlcAnim = anime({
      targets: obj,
      val: percent,
      easing: recharging ? 'easeOutCubic' : 'easeOutQuart',
      duration: recharging ? 1600 : 1100,
      update: () => {
        const v = obj.val;
        pc.textContent = Math.round(v) + '%';
        lv.setAttribute('width', 0.89 * v);
      },
      complete: () => {
        pc.textContent = percent + '%';
        lv.setAttribute('width', 0.89 * percent);
        _edlcCurrent = percent;
      }
    });
    _edlcCurrent = percent;
    return;
  }

  // Fallback (anime.js 미로드 시)
  if (lv) {
    lv.style.transition = 'width 1.4s cubic-bezier(0.4,0,0.2,1), fill 0.4s ease';
    lv.setAttribute('width', 0.89 * percent);
  }
  if (pc) pc.textContent = percent + '%';
  _edlcCurrent = percent;
}

function setArrowVisible(id, visible) {
  const el = document.getElementById(id);
  if (el) {
    el.style.transition = 'opacity 0.5s ease';
    el.setAttribute('opacity', visible ? 1 : 0);
  }
}

// SCR 절체 splash — anime.timeline 기반 3중 shockwave
let _splashAnim = null;
function triggerSCRSplash() {
  const splash = document.getElementById('scrSplash');
  if (!splash) return;

  splash.setAttribute('opacity', '1');

  // anime.js 사용 가능 시 자연스러운 shockwave 시퀀스
  if (window.anime) {
    if (_splashAnim) _splashAnim.pause();

    // 3개 shock circle 초기화
    ['scrShock1', 'scrShock2', 'scrShock3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.setAttribute('r', 0); el.setAttribute('opacity', 0); }
    });

    const tl = anime.timeline({
      easing: 'easeOutExpo',
      complete: () => splash.setAttribute('opacity', '0')
    });

    // 1차 shockwave — 빨강 (가장 큼)
    tl.add({
      targets: '#scrShock1',
      r: [{ value: 5, duration: 0 }, { value: 75, duration: 900 }],
      opacity: [{ value: 1, duration: 0 }, { value: 0, duration: 900, easing: 'easeOutQuart' }]
    }, 0);

    // 2차 shockwave — 노랑 (중간) — 100ms 지연
    tl.add({
      targets: '#scrShock2',
      r: [{ value: 3, duration: 0 }, { value: 50, duration: 800 }],
      opacity: [{ value: 1, duration: 0 }, { value: 0, duration: 800, easing: 'easeOutQuart' }]
    }, 100);

    // 3차 shockwave — 흰색 코어 (작음) — 0ms (즉시)
    tl.add({
      targets: '#scrShock3',
      r: [{ value: 2, duration: 0 }, { value: 30, duration: 600 }],
      opacity: [{ value: 1, duration: 0 }, { value: 0, duration: 600, easing: 'easeOutQuart' }]
    }, 0);

    // "계통 차단" 라벨 — 페이드 in → hold → 페이드 out
    tl.add({
      targets: '#scrSplashLabel',
      opacity: [
        { value: 0.95, duration: 150 },
        { value: 0.95, duration: 500 },
        { value: 0, duration: 350 }
      ],
      translateY: [
        { value: -4, duration: 150, easing: 'easeOutBack' },
        { value: -4, duration: 500 },
        { value: -10, duration: 350, easing: 'easeInQuad' }
      ]
    }, 0);

    _splashAnim = tl;
    return;
  }

  // Fallback — 단순 페이드
  setTimeout(() => splash.setAttribute('opacity', '0'), 800);
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

  // 메타 정보 적용
  const meta = modeMeta[mode];
  if (meta) {
    setEDLCLevel(meta.edlc, meta.recharging);
    setArrowVisible('edlcDischargeArrow', meta.dischargeArrow);
    setArrowVisible('invToLoadArrow', meta.compArrow);
  }

  // 절체 순간 splash
  if (mode === 'switch') triggerSCRSplash();

  // 진행 바 업데이트
  document.querySelectorAll('.seq-progress-step').forEach(el => {
    el.classList.toggle('active', el.dataset.step === mode);
  });
  // 진행 단계 표시 (지나간 단계는 done)
  const order = ['standby','detect','switch','compensate','recovery'];
  const currentIdx = order.indexOf(mode);
  document.querySelectorAll('.seq-progress-step').forEach(el => {
    const idx = order.indexOf(el.dataset.step);
    el.classList.toggle('done', idx < currentIdx);
  });
}

/* ============================================================
   자동 시퀀스 재생 — 5단계 자연스러운 타이밍
   ============================================================ */
let autoSeqTimer = null;
let autoSeqRunning = false;
const playSeqBtn = document.getElementById('playSeqBtn');
const playBtnText = document.getElementById('playBtnText');

const SEQ_TIMINGS = [
  { mode: 'standby',    duration: 3000 },  // 평상시 3초
  { mode: 'detect',     duration: 800  },  // 감지 0.8초
  { mode: 'switch',     duration: 700  },  // 절체 0.7초
  { mode: 'compensate', duration: 4000 },  // 보상 4초
  { mode: 'recovery',   duration: 2500 }   // 복귀 2.5초
];

function playSequence(stepIdx = 0) {
  if (!autoSeqRunning) return;
  const step = SEQ_TIMINGS[stepIdx];
  if (!step) {
    // 완료 → 처음부터 반복
    playSequence(0);
    return;
  }
  setMode(step.mode);
  // 토글 버튼도 업데이트
  document.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === step.mode);
  });
  autoSeqTimer = setTimeout(() => playSequence(stepIdx + 1), step.duration);
}

function stopSequence() {
  autoSeqRunning = false;
  if (autoSeqTimer) clearTimeout(autoSeqTimer);
  autoSeqTimer = null;
  if (playBtnText) playBtnText.textContent = '자동 재생';
  playSeqBtn?.classList.remove('playing');
}

function startSequence() {
  autoSeqRunning = true;
  if (playBtnText) playBtnText.textContent = '정지';
  playSeqBtn?.classList.add('playing');
  playSequence(0);
}

if (playSeqBtn) {
  playSeqBtn.addEventListener('click', () => {
    if (autoSeqRunning) stopSequence();
    else startSequence();
  });
}

// 토글 버튼 수동 클릭 시 자동 시퀀스 정지
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (autoSeqRunning) stopSequence();
  });
});

// 진행 바 클릭으로도 모드 전환
document.querySelectorAll('.seq-progress-step').forEach(step => {
  step.addEventListener('click', () => {
    if (autoSeqRunning) stopSequence();
    const mode = step.dataset.step;
    document.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    setMode(mode);
  });
});

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
      setMode('standby');
    }
  });
}, { root: main, threshold: 0.3 });

if (howStage) howObserver.observe(howStage);

// 사인파 애니메이션 시작
startWaveLoop();

/* ============================================================
   05. Sag-VIEWER - 메뉴 클릭 + GRAPH/REPORT/SCADA 모달
   ============================================================ */
const vfItems = document.querySelectorAll('.vf-item');
const screenImg = document.getElementById('screenImg');
const screenTitle = document.getElementById('screenTitle');
const screenCap = document.getElementById('screenCap');
const screenActionBtn = document.getElementById('screenActionBtn');
const scadaScreen = document.getElementById('scadaScreen');
const screenFrame = document.querySelector('.screen-frame');

vfItems.forEach(item => {
  item.addEventListener('click', () => {
    const img = item.dataset.img;
    const title = item.dataset.title;
    const cap = item.dataset.cap;
    const isGraph = item.dataset.graph === 'true';
    const isReport = item.dataset.report === 'true';
    const isScada = item.dataset.scada === 'true';

    vfItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // SCADA 메뉴 — SVG SCADA 화면 표시 (이미지 대신)
    if (isScada && scadaScreen && screenImg) {
      screenImg.style.display = 'none';
      scadaScreen.style.display = 'block';
      // 스크린 프레임 안에 SCADA SVG 삽입
      if (!screenFrame.contains(scadaScreen)) {
        screenFrame.appendChild(scadaScreen);
      }
      if (screenTitle) screenTitle.textContent = `Sag-VIEWER™ · ${title}`;
      if (screenCap && cap) screenCap.textContent = cap;
      if (screenActionBtn) screenActionBtn.style.display = 'none';
      return;
    } else if (scadaScreen) {
      scadaScreen.style.display = 'none';
      if (screenImg) screenImg.style.display = '';
    }

    if (!img || !screenImg) return;

    screenImg.classList.add('fading');
    setTimeout(() => {
      screenImg.src = img;
      if (screenTitle) screenTitle.textContent = `Sag-VIEWER™ · ${title}`;
      if (screenCap && cap) screenCap.textContent = cap;
      screenImg.classList.remove('fading');
    }, 280);

    // GRAPH 또는 REPORT 메뉴면 액션 버튼 표시
    if (screenActionBtn) {
      if (isReport) {
        screenActionBtn.style.display = 'inline-flex';
        screenActionBtn.dataset.target = 'reportModal';
        screenActionBtn.firstElementChild.nextSibling.textContent = ' REPORT';
      } else {
        screenActionBtn.style.display = 'none';
      }
    }
  });
});

// GRAPH/REPORT 버튼 클릭 → 모달 오픈
if (screenActionBtn) {
  screenActionBtn.addEventListener('click', () => {
    const target = screenActionBtn.dataset.target;
    const modal = document.getElementById(target);
    if (modal) modal.classList.add('open');
  });
}

// 모달 닫기
document.querySelectorAll('[data-close-modal]').forEach(el => {
  el.addEventListener('click', () => {
    el.closest('.vf-modal')?.classList.remove('open');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.vf-modal.open').forEach(m => m.classList.remove('open'));
  }
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




/* ============================================================
   ★ HOW V2 JS — 산업 솔루션 톤 모션 (v6.20)
   생산라인 연속 운전 강조, 단순 4 씬 토글
   ============================================================ */
(function () {
  'use strict';

  const stages = ['normal', 'detection', 'compensation', 'return'];
  let current = 'normal';

  const els = {
    statusMain:  () => document.getElementById('hvStateMain'),
    lineState:   () => document.getElementById('hvLineState'),
    tspState:    () => document.getElementById('hvTspState'),
    copy:        () => document.getElementById('hvCopy'),
    tspLed:      () => document.getElementById('hv-tsp-led'),
    flowLine:    () => document.getElementById('hv-flow-line'),
    gridAlert:   () => document.getElementById('hv-grid-alert'),
    tspGlow:     () => document.getElementById('hv-tsp-glow'),
    cellDText:   () => document.getElementById('hv-cell-d-text'),
    lineBar:     () => document.getElementById('hv-line-bar'),
    lineBarText: () => document.getElementById('hv-line-bar-text'),
    tabs:        () => document.querySelectorAll('.hv-tab'),
  };

  const SCENES = {
    normal: {
      statusMain: '정상 운전',
      lineState: 'RUNNING',
      lineStateClass: 'hv-status-val-ok',
      tspState: '대기',
      tspStateClass: '',
      copy: '평상시 — 생산라인이 정상적으로 운전됩니다. WESCO TSP는 전력을 그대로 통과시키며 뒤에서 조용히 대기합니다.',
      tspLed: '#10B981',
      flowOpacity: 0,
      gridAlert: 0,
      tspGlow: 0,
      cellD: 'OK',
      cellDColor: '#10B981',
      lineBar: '#10B981',
      lineBarText: '100% RUNNING',
      lineBarTextColor: '#10B981',
    },
    detection: {
      statusMain: '순간정전 감지',
      lineState: 'RUNNING',
      lineStateClass: 'hv-status-val-ok',
      tspState: '감지 · 1ms',
      tspStateClass: 'hv-status-val-alert',
      copy: '계통에서 순간정전이 발생했습니다. WESCO TSP가 1ms 이내에 감지하지만 — 생산라인은 멈추지 않습니다.',
      tspLed: '#F97316',
      flowOpacity: 0,
      gridAlert: 1,
      tspGlow: 0,
      cellD: 'OK',
      cellDColor: '#10B981',
      lineBar: '#10B981',
      lineBarText: '100% RUNNING',
      lineBarTextColor: '#10B981',
    },
    compensation: {
      statusMain: 'TSP 자동 보호 작동',
      lineState: 'RUNNING',
      lineStateClass: 'hv-status-val-ok',
      tspState: '보호 중 · <2ms',
      tspStateClass: 'hv-status-val-active',
      copy: 'TSP가 자동으로 전원을 우회 공급합니다. 생산설비는 영향 없이 계속 동작합니다 — 보호 동작 시간 2ms 이내.',
      tspLed: '#3B82F6',
      flowOpacity: 1,
      gridAlert: 1,
      tspGlow: 1,
      cellD: 'OK',
      cellDColor: '#10B981',
      lineBar: '#3B82F6',
      lineBarText: '100% PROTECTED',
      lineBarTextColor: '#3B82F6',
    },
    return: {
      statusMain: '정상 복귀 완료',
      lineState: 'RUNNING',
      lineStateClass: 'hv-status-val-ok',
      tspState: '대기 복귀',
      tspStateClass: '',
      copy: '계통이 안정화되었습니다. TSP는 자동으로 정상 모드로 복귀합니다 — 생산은 한 번도 멈추지 않았습니다.',
      tspLed: '#10B981',
      flowOpacity: 0,
      gridAlert: 0,
      tspGlow: 0,
      cellD: 'OK',
      cellDColor: '#10B981',
      lineBar: '#10B981',
      lineBarText: '100% RUNNING',
      lineBarTextColor: '#10B981',
    }
  };

  function setScene(name) {
    if (!SCENES[name]) return;
    const s = SCENES[name];
    current = name;

    if (els.statusMain())  els.statusMain().textContent = s.statusMain;
    if (els.lineState())   {
      els.lineState().textContent = s.lineState;
      els.lineState().className = 'hv-status-val ' + s.lineStateClass;
    }
    if (els.tspState())    {
      els.tspState().textContent = s.tspState;
      els.tspState().className = 'hv-status-val ' + s.tspStateClass;
    }
    if (els.copy())        els.copy().textContent = s.copy;
    if (els.tspLed())      els.tspLed().setAttribute('fill', s.tspLed);
    if (els.flowLine())    els.flowLine().setAttribute('opacity', s.flowOpacity);
    if (els.gridAlert())   els.gridAlert().setAttribute('opacity', s.gridAlert);
    if (els.tspGlow())     els.tspGlow().setAttribute('opacity', s.tspGlow);
    if (els.cellDText())   {
      els.cellDText().textContent = s.cellD;
      els.cellDText().setAttribute('fill', s.cellDColor);
    }
    if (els.lineBar())     els.lineBar().setAttribute('fill', s.lineBar);
    if (els.lineBarText()) {
      els.lineBarText().textContent = s.lineBarText;
      els.lineBarText().setAttribute('fill', s.lineBarTextColor);
    }

    els.tabs().forEach(t => {
      t.classList.toggle('active', t.dataset.scene === name);
    });
  }

  function init() {
    if (!document.getElementById('howMotion')) return;
    els.tabs().forEach(t => {
      t.addEventListener('click', () => setScene(t.dataset.scene));
    });
    setScene('normal');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HowV2 = { setScene };
})();
