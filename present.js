/**
 * WESCO 사업소개 — Presentation Mode
 * 한 섹션씩 풀스크린으로 보여주고 클릭/키보드/휠로 전환.
 *
 * 활성화 방법:
 *  - 우상단 PRESENT 버튼 클릭
 *  - URL: ?present=1
 *  - 키보드: 일반 모드에서 'p' 키 (옵션)
 *
 * 발표 모드 단축키:
 *  - 다음: → / Space / N / PageDown / 화면 우측 클릭 / 마우스 휠 down / 스와이프 ←
 *  - 이전: ← / P / PageUp / 화면 좌측 클릭 / 마우스 휠 up / 스와이프 →
 *  - 종료: ESC
 *  - 풀스크린: F
 *  - 처음/끝: Home / End
 *  - 점프: 1~9 (해당 번호 슬라이드)
 *  - 메뉴 토글: M
 */
(function () {
  const SLIDES_SELECTOR = '.section';
  const PRESENT_KEY = 'wesco-present';
  let current = 0;
  let slides = [];
  let isOn = false;

  function getSlides() {
    return Array.from(document.querySelectorAll(SLIDES_SELECTOR));
  }

  function indexFromHash() {
    const h = (location.hash || '').replace('#', '');
    if (!h) return 0;
    const idx = slides.findIndex((s) => s.id === h);
    return idx >= 0 ? idx : 0;
  }

  function updateNavActive(idx) {
    const slideId = slides[idx] && slides[idx].id;
    if (!slideId) return;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('href') === '#' + slideId);
    });
  }

  function showSlide(idx) {
    if (!slides.length) slides = getSlides();
    if (!slides.length) return;
    idx = ((idx % slides.length) + slides.length) % slides.length;
    current = idx;
    slides.forEach((s, i) => s.classList.toggle('is-present', i === idx));
    updateNavActive(idx);
    const counter = document.querySelector('.pc-count');
    if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
    // Reset internal scroll
    if (slides[idx]) slides[idx].scrollTop = 0;
    // Sync URL hash without scrolling
    const slideId = slides[idx] && slides[idx].id;
    if (slideId && history.replaceState) {
      history.replaceState(null, '', '#' + slideId);
    }
  }

  function next() { showSlide(current + 1); }
  function prev() { showSlide(current - 1); }

  function forceFinalizeCounters() {
    // [data-count] elements are counted up via IntersectionObserver in script.js.
    // In present mode IO doesn't fire (position:fixed), so freeze them at the final value.
    document.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (!isNaN(target)) {
        el.textContent = target.toLocaleString();
      }
    });
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function turnOn() {
    // Present mode is desktop-only — mobile uses normal scroll.
    if (isMobile()) {
      localStorage.removeItem(PRESENT_KEY);
      return;
    }
    slides = getSlides();
    if (!slides.length) return;
    isOn = true;
    document.body.classList.add('present-mode');
    forceFinalizeCounters();
    // Pick initial slide from hash or stored
    const initial = indexFromHash();
    showSlide(initial);
    const btn = document.getElementById('presentToggle');
    if (btn) btn.textContent = 'EXIT';
    localStorage.setItem(PRESENT_KEY, '1');
  }

  function turnOff() {
    isOn = false;
    document.body.classList.remove('present-mode');
    slides.forEach((s) => s.classList.remove('is-present'));
    const btn = document.getElementById('presentToggle');
    if (btn) btn.textContent = 'PRESENT';
    localStorage.removeItem(PRESENT_KEY);
    // Scroll into view of current section in normal flow
    if (slides[current]) {
      slides[current].scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  function toggle() { isOn ? turnOff() : turnOn(); }

  // === Event handlers ============================================

  let wheelLock = false;
  function onWheel(e) {
    if (!isOn) return;
    const active = slides[current];
    if (active) {
      // Only treat as internally-scrollable when content overflows by a clear amount.
      // Otherwise tiny layout margins (10-50px) would block slide transitions.
      const SCROLL_THRESHOLD = 100;
      const scrollable = active.scrollHeight > active.clientHeight + SCROLL_THRESHOLD;
      const atTop = active.scrollTop <= 0;
      const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 2;
      if (scrollable) {
        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }
    }
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(() => (wheelLock = false), 450);
    if (e.deltaY > 25) next();
    else if (e.deltaY < -25) prev();
  }

  function onKeyDown(e) {
    // Ignore typing in inputs. e.target may be document/window, so check it's an Element first.
    const t = e.target;
    const isElement = t && t.nodeType === 1 && typeof t.matches === 'function';
    if (isElement && t.matches('input, textarea, select, [contenteditable]')) return;

    if (!isOn) {
      // Quick enter via 'p' in normal mode
      if (e.key === 'p' || e.key === 'P') {
        // Only if not focused in an interactive element
        if (!isElement || !t.matches('a, button, input, textarea, select')) {
          e.preventDefault();
          turnOn();
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
      case 'n':
      case 'N':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
      case 'p':
      case 'P':
        e.preventDefault(); prev(); break;
      case 'Escape':
        e.preventDefault(); turnOff(); break;
      case 'Home':
        e.preventDefault(); showSlide(0); break;
      case 'End':
        e.preventDefault(); showSlide(slides.length - 1); break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        document.body.classList.toggle('present-show-sidebar');
        break;
      default:
        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < slides.length) {
            e.preventDefault();
            showSlide(idx);
          }
        }
    }
  }

  function onClick(e) {
    if (!isOn) return;
    const t = e.target;
    if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
    // Don't advance on interactive elements or controls
    if (t.closest('a, button, input, select, textarea, label, [data-no-advance]')) return;
    if (t.closest('.sidebar')) return;
    if (t.closest('.present-controls')) return;
    if (t.closest('.lang-toggle')) return;
    if (t.closest('.present-toggle')) return;
    const x = e.clientX;
    const w = window.innerWidth;
    if (x > w / 2) next(); else prev();
  }

  // Sidebar nav links → jump to slide in present mode
  function onNavClick(e) {
    const t = e.target;
    if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
    const link = t.closest('.sidebar-nav .nav-item');
    if (!link || !isOn) return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const idx = slides.findIndex((s) => s.id === href.slice(1));
    if (idx >= 0) showSlide(idx);
  }

  // Touch swipe
  let tStartX = 0;
  let tStartY = 0;
  function onTouchStart(e) {
    if (!isOn) return;
    tStartX = e.touches[0].clientX;
    tStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (!isOn) return;
    const dx = e.changedTouches[0].clientX - tStartX;
    const dy = e.changedTouches[0].clientY - tStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? next() : prev();
    }
  }

  // === Init ======================================================
  function init() {
    slides = getSlides();

    const btn = document.getElementById('presentToggle');
    if (btn) btn.addEventListener('click', toggle);

    document.querySelectorAll('.present-controls [data-action]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = b.getAttribute('data-action');
        if (action === 'prev') prev();
        else if (action === 'next') next();
        else if (action === 'exit') turnOff();
      });
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('click', onClick, true);
    document.addEventListener('click', onNavClick);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    // Auto-activate via URL or saved state
    const params = new URLSearchParams(location.search);
    if (params.get('present') === '1' || localStorage.getItem(PRESENT_KEY) === '1') {
      turnOn();
    }
  }

  window.WescoPresent = { on: turnOn, off: turnOff, toggle, next, prev, go: showSlide };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
