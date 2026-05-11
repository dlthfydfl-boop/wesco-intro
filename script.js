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
   ★ HOW MOTION JS — 작동원리 4씬 모션 (v6.19)
   네임스페이스 'HowMotion' 으로 분리 (기존 startWaveLoop/setMode와 충돌 방지)
   ============================================================ */

const HowMotion = (() => {
  'use strict';

  /* ---- 상수 ---- */
  const SCENES = ['normal', 'detection', 'compensation', 'return'];

  const SCENE_TIMINGS = {
    normal:       3000,
    detection:    1500,
    compensation: 3000,
    return:       2500
  };

  const SCENE_META = {
    normal: {
      hudGrid:  { text: 'NORMAL',      color: '#10B981' },
      hudTsp:   { text: 'STANDBY',     color: '#22D3EE' },
      hudLoad:  { text: 'RUNNING',     color: '#10B981' },
      hudTitle: 'NORMAL OPERATION',
      caption:  'Normal Mode · <span class="accent">효율 98%</span> · 충전 유지',
      capLevel: 100,
      waveColor: '#22D3EE',
      waveAmp:   11,
      waveDash:  null,
      swStatus:  'CLOSED · BYPASS',
      swColor:   '#10B981',
      swOpen:    false
    },
    detection: {
      hudGrid:  { text: 'VOLTAGE SAG', color: '#EF4444' },
      hudTsp:   { text: 'DETECTING',   color: '#F97316' },
      hudLoad:  { text: 'RUNNING',     color: '#10B981' },
      hudTitle: 'VOLTAGE SAG DETECTED',
      caption:  '<span class="danger">Voltage Sag Detected</span> · Detection Time <span class="accent">&lt; 1ms</span>',
      capLevel: 100,
      waveColor: '#EF4444',
      waveAmp:   5,
      waveDash:  '6 3',
      swStatus:  'DETECTING...',
      swColor:   '#F97316',
      swOpen:    false
    },
    compensation: {
      hudGrid:  { text: 'DISCONNECTED',  color: '#475569' },
      hudTsp:   { text: 'COMPENSATING',  color: '#8B5CF6' },
      hudLoad:  { text: 'RUNNING',       color: '#10B981' },
      hudTitle: 'ULTRA FAST COMPENSATION',
      caption:  '<span class="plasma">Ultra Fast Compensation</span> · Battery-less Energy · Complete <span class="accent">&lt; 2ms</span>',
      capLevel: 65,
      waveColor: '#8B5CF6',
      waveAmp:   11,
      waveDash:  null,
      swStatus:  'OPEN · ISOLATED',
      swColor:   '#EF4444',
      swOpen:    true
    },
    return: {
      hudGrid:  { text: 'RESTORING',   color: '#F59E0B' },
      hudTsp:   { text: 'SYNCING',     color: '#22D3EE' },
      hudLoad:  { text: 'RUNNING',     color: '#10B981' },
      hudTitle: 'PHASE SYNCHRONIZATION',
      caption:  'Phase Synchronization · <span class="ok">Seamless Return</span> · Automatic Recovery',
      capLevel: 100,
      waveColor: '#22D3EE',
      waveAmp:   11,
      waveDash:  null,
      swStatus:  'CLOSED · SYNC',
      swColor:   '#10B981',
      swOpen:    false
    }
  };

  /* ---- 상태 ---- */
  let currentScene  = 'normal';
  let autoPlaying   = false;
  let autoTimer     = null;
  let wavePhase     = 0;
  let waveRaf       = null;
  let partOffsets   = [0, 90, 190, 280];  // 컨베이어 위 파트 x 오프셋
  let partRaf       = null;
  let capCurrentPct = 100;
  let capAnimFrame  = null;

  /* ---- DOM 참조 ---- */
  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';

  const els = {
    hudGridDot:    $('hud-grid-dot'),
    hudGridText:   $('hud-grid-text'),
    hudTspDot:     $('hud-tsp-dot'),
    hudTspText:    $('hud-tsp-text'),
    hudLoadDot:    $('hud-load-dot'),
    hudLoadText:   $('hud-load-text'),
    hudTitle:      $('hud-scene-title'),
    waveGrid:      $('wave-grid'),
    waveOut:       $('wave-out'),
    syncA:         $('sync-wave-a'),
    syncB:         $('sync-wave-b'),
    plasmaInvSw:   $('plasma-inv-sw'),
    plasmaCapInv:  $('plasma-cap-inv'),
    plasmaOut:     $('plasma-out'),
    capBar:        $('cap-level-bar'),
    capPct:        $('cap-percent'),
    dspScan:       $('dsp-scan'),
    swBox:         $('sw-box'),
    swBlade:       $('sw-blade'),
    swIndicator:   $('sw-indicator'),
    swStatus:      $('sw-status'),
    svgCaption:    $('svg-caption'),
    lightningFx:   $('lightning-fx'),
    sceneDetOver:  $('scene-detection-overlay'),
    sceneCompOver: $('scene-compensation-overlay'),
    sceneRetOver:  $('scene-return-overlay'),
    playBtn:       $('hmPlayBtn'),
    playText:      $('hmPlayText'),
    playIcon:      $('hmPlayIcon'),
    ariaLive:      $('hmAriaLive'),
    invSw:         $('inv-sw-line'),
    invCap:        $('inv-cap-line'),
    invIndicator:  $('inv-indicator'),
    gridBox:       $('grid-box')
  };

  /* ---- 사인파 그리기 ---- */
  function buildWavePath(x0, x1, baseY, amp, phase, period, dash) {
    let d = '';
    for (let x = x0; x <= x1; x += 2) {
      const y = baseY + Math.sin((x - x0) * (Math.PI * 2 / period) + phase) * amp;
      d += (x === x0 ? 'M' : 'L') + ` ${x} ${y} `;
    }
    return d;
  }

  function buildDistortedWavePath(x0, x1, baseY, amp, phase, period) {
    // 감지 모드: 진폭이 불규칙하게 흔들림
    let d = '';
    for (let x = x0; x <= x1; x += 2) {
      const distort = 0.4 + Math.sin((x - x0) * 0.15 + phase * 0.7) * 0.4;
      const y = baseY + Math.sin((x - x0) * (Math.PI * 2 / period) + phase) * (amp * distort);
      d += (x === x0 ? 'M' : 'L') + ` ${x} ${y} `;
    }
    return d;
  }

  function renderWaves() {
    const meta = SCENE_META[currentScene];
    const baseY = 243;
    const period = 28;

    if (!els.waveGrid || !els.waveOut) return;

    // Grid 입력 사인파 (x: 120 → 185)
    if (currentScene === 'detection') {
      const d = buildDistortedWavePath(120, 185, baseY, 8, wavePhase, period);
      els.waveGrid.setAttribute('d', d);
      els.waveGrid.setAttribute('stroke', '#EF4444');
      els.waveGrid.setAttribute('stroke-width', '2');
      els.waveGrid.removeAttribute('stroke-dasharray');
    } else if (currentScene === 'compensation') {
      // 끊긴 상태
      els.waveGrid.setAttribute('d', '');
    } else if (currentScene === 'return') {
      const d = buildWavePath(120, 185, baseY, 10, wavePhase, period, null);
      els.waveGrid.setAttribute('d', d);
      els.waveGrid.setAttribute('stroke', '#F59E0B');
      els.waveGrid.setAttribute('stroke-width', '1.8');
      els.waveGrid.setAttribute('stroke-dasharray', '8 4');
    } else {
      const d = buildWavePath(120, 185, baseY, 11, wavePhase, period, null);
      els.waveGrid.setAttribute('d', d);
      els.waveGrid.setAttribute('stroke', '#22D3EE');
      els.waveGrid.setAttribute('stroke-width', '2');
      els.waveGrid.removeAttribute('stroke-dasharray');
    }

    // 출력 사인파 (x: 405 → 420+)
    if (currentScene === 'compensation') {
      // 플라즈마 색상의 깨끗한 파형
      const d = buildWavePath(405, 770, baseY, 11, wavePhase * 1.05, period, null);
      els.waveOut.setAttribute('d', d);
      els.waveOut.setAttribute('stroke', '#8B5CF6');
      els.waveOut.setAttribute('stroke-width', '2.5');
      els.waveOut.setAttribute('filter', 'url(#glow-plasma)');
      els.waveOut.removeAttribute('stroke-dasharray');
    } else if (currentScene === 'return') {
      // 두 파형: sync-wave-a (grid), sync-wave-b (tsp) — 점점 겹침
      const d = buildWavePath(405, 770, baseY, 11, wavePhase, period, null);
      els.waveOut.setAttribute('d', d);
      els.waveOut.setAttribute('stroke', '#22D3EE');
      els.waveOut.setAttribute('stroke-width', '2.5');
      els.waveOut.removeAttribute('filter');
      els.waveOut.removeAttribute('stroke-dasharray');

      if (els.syncA && els.syncB) {
        const dA = buildWavePath(185, 405, baseY, 9, wavePhase * 0.95, period, null);
        const dB = buildWavePath(185, 405, baseY, 9, wavePhase, period, null);
        els.syncA.setAttribute('d', dA);
        els.syncB.setAttribute('d', dB);
        els.syncA.setAttribute('opacity', '0.7');
        els.syncB.setAttribute('opacity', '0.5');
      }
    } else {
      const d = buildWavePath(405, 770, baseY, 11, wavePhase, period, null);
      els.waveOut.setAttribute('d', d);
      els.waveOut.setAttribute('stroke', '#22D3EE');
      els.waveOut.setAttribute('stroke-width', '2.5');
      els.waveOut.removeAttribute('filter');
      els.waveOut.removeAttribute('stroke-dasharray');

      if (els.syncA && els.syncB) {
        els.syncA.setAttribute('opacity', '0');
        els.syncB.setAttribute('opacity', '0');
      }
    }
  }

  function startWaveLoop() {
    if (waveRaf) cancelAnimationFrame(waveRaf);
    function loop() {
      wavePhase -= 0.07;
      renderWaves();
      waveRaf = requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---- 컨베이어 파트 이동 ---- */
  function startConveyorLoop() {
    if (partRaf) cancelAnimationFrame(partRaf);
    const ids = ['part-a', 'part-b', 'part-c', 'part-d'];
    const maxX = 380;

    function loop() {
      for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (!el) continue;
        partOffsets[i] -= 0.5;
        if (partOffsets[i] < -30) partOffsets[i] = maxX;
        el.setAttribute('transform', `translate(${partOffsets[i]}, 0)`);
      }
      partRaf = requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---- 에너지 저장소 레벨 애니메이션 ---- */
  function animateCapLevel(targetPct, isCharging) {
    if (capAnimFrame) cancelAnimationFrame(capAnimFrame);

    const startPct = capCurrentPct;
    const startTime = performance.now();
    const duration = isCharging ? 1800 : 1200;

    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = isCharging
        ? 1 - Math.pow(1 - t, 3)   // easeOutCubic
        : 1 - Math.pow(1 - t, 4);  // easeOutQuart
      const pct = startPct + (targetPct - startPct) * eased;

      if (els.capBar) {
        const w = (pct / 100) * 72;
        els.capBar.setAttribute('width', Math.max(0, w));
        const color = isCharging ? '#F59E0B' :
                      (pct > 70 ? '#3B82F6' : pct > 40 ? '#8B5CF6' : '#EF4444');
        els.capBar.setAttribute('fill', color);
      }
      if (els.capPct) {
        const textColor = isCharging ? '#F59E0B' : '#22D3EE';
        els.capPct.setAttribute('fill', textColor);
        els.capPct.textContent = Math.round(pct) + '%';
      }

      if (t < 1) capAnimFrame = requestAnimationFrame(tick);
      else capCurrentPct = targetPct;
    }

    capAnimFrame = requestAnimationFrame(tick);
  }

  /* ---- HUD 업데이트 ---- */
  function updateHUD(meta) {
    if (!meta) return;

    // GRID
    if (els.hudGridDot) {
      els.hudGridDot.setAttribute('fill', meta.hudGrid.color);
      els.hudGridDot.setAttribute('filter', meta.hudGrid.color === '#EF4444'
        ? 'url(#glow-red)' : meta.hudGrid.color === '#10B981'
        ? 'url(#glow-green)' : 'url(#glow-orange)');
    }
    if (els.hudGridText) {
      els.hudGridText.textContent = meta.hudGrid.text;
      els.hudGridText.setAttribute('fill', meta.hudGrid.color);
    }

    // TSP
    if (els.hudTspDot) {
      const tspFilter = meta.hudTsp.color === '#8B5CF6'
        ? 'url(#glow-plasma)'
        : meta.hudTsp.color === '#F97316'
        ? 'url(#glow-orange)'
        : 'url(#glow-blue)';
      els.hudTspDot.setAttribute('fill', meta.hudTsp.color);
      els.hudTspDot.setAttribute('filter', tspFilter);
    }
    if (els.hudTspText) {
      els.hudTspText.textContent = meta.hudTsp.text;
      els.hudTspText.setAttribute('fill', meta.hudTsp.color);
    }

    // LOAD
    if (els.hudLoadDot) {
      els.hudLoadDot.setAttribute('fill', meta.hudLoad.color);
    }
    if (els.hudLoadText) {
      els.hudLoadText.textContent = meta.hudLoad.text;
      els.hudLoadText.setAttribute('fill', meta.hudLoad.color);
    }

    // Scene title
    if (els.hudTitle) els.hudTitle.textContent = meta.hudTitle;

    // Caption
    if (els.svgCaption) {
      // SVG text 내에서 span을 쓸 수 없으므로 plain text로 변환
      const plain = meta.caption.replace(/<[^>]+>/g, '');
      els.svgCaption.textContent = plain;
    }
  }

  /* ---- 스위치 박스 업데이트 ---- */
  function updateSwitch(meta) {
    if (!meta) return;
    const color = meta.swColor;
    if (els.swBox)       els.swBox.setAttribute('stroke', color);
    if (els.swIndicator) {
      els.swIndicator.setAttribute('fill', color);
      els.swIndicator.setAttribute('filter',
        color === '#10B981' ? 'url(#glow-green)' :
        color === '#EF4444' ? 'url(#glow-red)' : 'url(#glow-orange)');
    }
    if (els.swStatus) {
      els.swStatus.textContent = meta.swStatus;
      els.swStatus.setAttribute('fill', color);
    }
    // 스위치 블레이드 (open/close)
    if (els.swBlade) {
      if (meta.swOpen) {
        // 열린 상태 — 칼날이 위쪽으로 비스듬히
        els.swBlade.setAttribute('x2', '44');
        els.swBlade.setAttribute('y2', '6');
        els.swBlade.setAttribute('stroke', '#EF4444');
      } else {
        // 닫힌 상태
        els.swBlade.setAttribute('x2', '44');
        els.swBlade.setAttribute('y2', '20');
        els.swBlade.setAttribute('stroke', color);
      }
    }
  }

  /* ---- 씬별 오버레이 토글 ---- */
  function updateOverlays(scene) {
    // 번개 효과
    const showLightning = (scene === 'detection' || scene === 'compensation');
    if (els.lightningFx) {
      els.lightningFx.style.display = showLightning ? 'block' : 'none';
    }

    // 씬별 오버레이
    if (els.sceneDetOver)  els.sceneDetOver.style.display  = scene === 'detection'    ? 'block' : 'none';
    if (els.sceneCompOver) els.sceneCompOver.style.display = scene === 'compensation' ? 'block' : 'none';
    if (els.sceneRetOver)  els.sceneRetOver.style.display  = scene === 'return'       ? 'block' : 'none';

    // 플라즈마 에너지 흐름
    const showPlasma = scene === 'compensation';
    const plasmaOpacity = showPlasma ? '1' : '0';
    if (els.plasmaInvSw)  els.plasmaInvSw.setAttribute('opacity',  plasmaOpacity);
    if (els.plasmaCapInv) els.plasmaCapInv.setAttribute('opacity', plasmaOpacity);
    if (els.plasmaOut)    els.plasmaOut.setAttribute('opacity',    plasmaOpacity);

    // 인버터 인디케이터
    if (els.invIndicator) {
      if (showPlasma) {
        els.invIndicator.setAttribute('fill', '#8B5CF6');
        els.invIndicator.setAttribute('opacity', '1');
        els.invIndicator.setAttribute('filter', 'url(#glow-plasma)');
      } else {
        els.invIndicator.setAttribute('fill', '#3B82F6');
        els.invIndicator.setAttribute('opacity', '0.5');
        els.invIndicator.removeAttribute('filter');
      }
    }

    // DSP 스캔 라인 (씬 2에서만)
    if (els.dspScan) {
      if (scene === 'detection') {
        els.dspScan.style.animationPlayState = 'running';
        els.dspScan.setAttribute('opacity', '0.9');
      } else {
        els.dspScan.style.animationPlayState = 'paused';
        els.dspScan.setAttribute('opacity', '0');
      }
    }

    // Grid 박스 강조
    if (els.gridBox) {
      if (scene === 'detection') {
        els.gridBox.setAttribute('stroke', '#EF4444');
        els.gridBox.setAttribute('filter', 'url(#glow-red)');
      } else if (scene === 'compensation') {
        els.gridBox.setAttribute('stroke', '#475569');
        els.gridBox.removeAttribute('filter');
      } else {
        els.gridBox.setAttribute('stroke', '#22D3EE');
        els.gridBox.removeAttribute('filter');
      }
    }
  }

  /* ---- 메인 씬 전환 ---- */
  function setScene(scene) {
    if (!SCENES.includes(scene)) return;
    currentScene = scene;

    const meta = SCENE_META[scene];

    updateHUD(meta);
    updateSwitch(meta);
    updateOverlays(scene);

    // 에너지 저장소 레벨
    const isCharging = (scene === 'return' || scene === 'normal');
    animateCapLevel(meta.capLevel, isCharging);

    // 토글 버튼 업데이트
    document.querySelectorAll('.hm-btn[data-scene]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scene === scene);
    });

    // 진행 점 업데이트
    document.querySelectorAll('.hm-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.scene === scene);
    });

    // aria live
    if (els.ariaLive) {
      els.ariaLive.textContent = `씬 전환: ${meta.hudTitle}`;
    }
  }

  /* ---- 자동 재생 ---- */
  function stopAuto() {
    autoPlaying = false;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    if (els.playText) els.playText.textContent = 'AUTO PLAY';
    if (els.playBtn)  els.playBtn.classList.remove('playing');
    if (els.playIcon) els.playIcon.innerHTML = '<polygon points="2,1 11,6 2,11"/>';
  }

  function playStep(idx) {
    if (!autoPlaying) return;
    const scene = SCENES[idx % SCENES.length];
    setScene(scene);
    const dur = SCENE_TIMINGS[scene] || 2000;
    autoTimer = setTimeout(() => playStep(idx + 1), dur);
  }

  function startAuto() {
    autoPlaying = true;
    if (els.playText) els.playText.textContent = 'STOP';
    if (els.playBtn)  els.playBtn.classList.add('playing');
    if (els.playIcon) els.playIcon.innerHTML = '<rect x="2" y="1" width="3" height="10"/><rect x="7" y="1" width="3" height="10"/>';
    playStep(0);
  }

  /* ---- 이벤트 바인딩 ---- */
  function bindEvents() {
    // 씬 버튼
    document.querySelectorAll('.hm-btn[data-scene]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (autoPlaying) stopAuto();
        setScene(btn.dataset.scene);
      });
    });

    // 진행 점 클릭
    document.querySelectorAll('.hm-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        if (autoPlaying) stopAuto();
        setScene(dot.dataset.scene);
      });
    });

    // 자동 재생 버튼
    if (els.playBtn) {
      els.playBtn.addEventListener('click', () => {
        if (autoPlaying) stopAuto();
        else startAuto();
      });
    }

    // 키보드 ←/→
    document.addEventListener('keydown', (e) => {
      const container = document.getElementById('howMotion');
      if (!container) return;
      // how 섹션이 뷰포트에 있을 때만
      const rect = container.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const idx = SCENES.indexOf(currentScene);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (autoPlaying) stopAuto();
        setScene(SCENES[(idx + 1) % SCENES.length]);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (autoPlaying) stopAuto();
        setScene(SCENES[(idx - 1 + SCENES.length) % SCENES.length]);
      }
    });

    // prefers-reduced-motion 감지
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && waveRaf) {
      cancelAnimationFrame(waveRaf);
    }
    mq.addEventListener('change', () => {
      if (mq.matches) {
        if (waveRaf)  cancelAnimationFrame(waveRaf);
        if (partRaf)  cancelAnimationFrame(partRaf);
        if (autoPlaying) stopAuto();
      } else {
        startWaveLoop();
        startConveyorLoop();
      }
    });
  }

  /* ---- 초기화 ---- */
  function init() {
    // 초기 씬 설정
    setScene('normal');
    // 루프 시작
    startWaveLoop();
    startConveyorLoop();
    // 이벤트
    bindEvents();
  }

  /* ---- 공개 API ---- */
  return { init, setScene, startAuto, stopAuto };

})();

/* 페이지 로드 시 초기화 */
window.HowMotion = HowMotion;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HowMotion.init());
} else {
  HowMotion.init();
}

/* ============================================================
   ★ MOTION JS — 블록 끝
   ============================================================ */
