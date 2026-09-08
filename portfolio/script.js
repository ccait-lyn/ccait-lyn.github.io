// Makes each folder button draggable within its own section container
// (it scrolls away with that section), and still clickable (a plain
// click, without dragging, fires the action).

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Keep page content flush against the fixed nav bar ----------
  // The CSS derives the body's top padding and scroll offset from the
  // `--nav-height` custom property. Sync it to the nav's real rendered
  // height so content stays stuck to its edge no matter what changes the
  // nav's size (a new height value, the responsive wrap, font loading).
  const navBar = document.querySelector('.nav-bar');
  if (navBar) {
    const syncNavHeight = () => {
      document.documentElement.style.setProperty(
        '--nav-height',
        `${navBar.offsetHeight}px`
      );
    };

    syncNavHeight();
    window.addEventListener('load', syncNavHeight);
    window.addEventListener('resize', syncNavHeight);

    if ('ResizeObserver' in window) {
      new ResizeObserver(syncNavHeight).observe(navBar);
    }
  }

  const folders = document.querySelectorAll('.folder-button');

  folders.forEach((folder) => {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    // The folder is only allowed to be dragged inside this element's box.
    // Landing-page folders are penned into `.container`; the About-page
    // folders fall back to `.about-content`, then to their parent.
    const bounds =
      folder.closest('.container, .about-content') || folder.parentElement;

    // Keep a value between a lower and upper limit.
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const onPointerDown = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const rect = folder.getBoundingClientRect();

      const boundsRect = bounds.getBoundingClientRect();

      isDragging = true;
      hasMoved = false;
      startX = point.clientX;
      startY = point.clientY;
      // Position relative to the container, so the folder scrolls away
      // with its section instead of floating over the whole page.
      originLeft = rect.left - boundsRect.left + bounds.scrollLeft;
      originTop = rect.top - boundsRect.top + bounds.scrollTop;

      // Switch to absolute positioning (the container is `position: relative`)
      // at the current visual spot so the folder can be dragged inside it.
      folder.style.position = 'absolute';
      folder.style.left = `${originLeft}px`;
      folder.style.top = `${originTop}px`;
      folder.style.margin = '0';
      folder.classList.add('dragging');

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      // Clamp within the container's own box (coordinates are now
      // relative to the container, so the range starts at 0).
      const maxLeft = bounds.clientWidth - folder.offsetWidth;
      const maxTop = bounds.clientHeight - folder.offsetHeight;

      folder.style.left = `${clamp(originLeft + dx, 0, maxLeft)}px`;
      folder.style.top = `${clamp(originTop + dy, 0, maxTop)}px`;
    };

    const onPointerUp = () => {
      isDragging = false;
      folder.classList.remove('dragging');

      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    };

    folder.addEventListener('mousedown', onPointerDown);
    folder.addEventListener('touchstart', onPointerDown, { passive: true });

    // Prevent the click/navigation action from firing right after a drag.
    folder.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
        return;
      }

      const target = folder.getAttribute('data-target');
      const section = target && document.getElementById(target);

      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.log(`Opened folder: ${target}`);
      }
    });
  });

  // ---------- Photo carousel (About Me page) ----------
  let carouselImageEl = document.getElementById('carousel-image');
  const carouselFilenameEl = document.getElementById('carousel-filename');
  const prevBtn = document.querySelector('.carousel-arrow.prev');
  const nextBtn = document.querySelector('.carousel-arrow.next');

  if (carouselImageEl && prevBtn && nextBtn) {
    // Add more { src, filename } entries here as more photos are added.
    const photos = [
      { src: 'assets/matchas.jpg', filename: 'yummy-matcha.jpg' },
      { src: 'assets/caitlyn-pic.jpg', filename: 'caitlyn-pic.jpg' },
      { src: 'assets/pottery-painting.JPG', filename: 'pottery-painting.jpg' },
    ];

    const imageArea = carouselImageEl.parentElement;
    const SLIDE_MS = 450;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let currentPhoto = 0;
    let isSwitching = false;

    const setFilename = (photo) => {
      carouselImageEl.alt = photo.filename;
      if (carouselFilenameEl) carouselFilenameEl.textContent = photo.filename;
    };

    // Slide to `photos[currentPhoto]`. direction === 1 (next): the new photo
    // enters from the right and slides left; the old one exits to the left.
    // direction === -1 (previous): the new photo enters from the left and
    // slides right; the old one exits to the right.
    const slideToPhoto = (direction) => {
      const photo = photos[currentPhoto];

      if (prefersReducedMotion || !direction) {
        carouselImageEl.src = photo.src;
        setFilename(photo);
        return;
      }

      isSwitching = true;

      // Preload so the incoming photo is fully painted before it slides in.
      const preloaded = new Image();
      preloaded.onload = preloaded.onerror = () => {
        const outgoing = carouselImageEl;
        const incoming = outgoing.cloneNode(false);
        incoming.removeAttribute('id');
        incoming.src = photo.src;
        incoming.style.transition = 'none';
        incoming.style.transform = `translateX(${direction * 100}%)`;
        imageArea.insertBefore(incoming, outgoing.nextSibling);

        // Force a reflow so the starting transform is committed before we
        // switch the transition back on and animate to the resting position.
        void incoming.offsetWidth;

        incoming.style.transition = `transform ${SLIDE_MS}ms ease`;
        outgoing.style.transition = `transform ${SLIDE_MS}ms ease`;
        incoming.style.transform = 'translateX(0)';
        outgoing.style.transform = `translateX(${-direction * 100}%)`;

        carouselImageEl = incoming;
        setFilename(photo);

        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          outgoing.remove();
          incoming.id = 'carousel-image';
          incoming.style.transition = '';
          incoming.style.transform = '';
          isSwitching = false;
        };
        incoming.addEventListener('transitionend', done, { once: true });
        setTimeout(done, SLIDE_MS + 80);
      };
      preloaded.src = photo.src;
    };

    const step = (direction) => {
      if (isSwitching) return;
      currentPhoto =
        (currentPhoto + direction + photos.length) % photos.length;
      slideToPhoto(direction);
    };

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));

    slideToPhoto(0);
  }
});
