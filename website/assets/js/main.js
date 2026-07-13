(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if ('IntersectionObserver' in window) {
    var revealItems = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(function (item) { observer.observe(item); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (item) {
      item.classList.add('is-visible');
    });
  }

  document.querySelectorAll('[data-review-expand]').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-review-expand');
      var body = document.getElementById(id + '-text');
      if (!body) return;
      var expanded = body.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      button.textContent = expanded ? 'Zobrazit méně' : 'Zobrazit více';
    });
  });

  var servicesRoot = document.querySelector('[data-services]');
  if (servicesRoot) {
    var tabs = servicesRoot.querySelectorAll('[data-services-tab]');
    var panels = servicesRoot.querySelectorAll('[data-services-panel]');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-services-tab');
        tabs.forEach(function (entry) {
          var active = entry === tab;
          entry.classList.toggle('is-active', active);
          entry.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(function (panel) {
          var active = panel.getAttribute('data-services-panel') === id;
          panel.classList.toggle('is-active', active);
          if (active) panel.removeAttribute('hidden');
          else panel.setAttribute('hidden', '');
        });
      });
    });

    servicesRoot.querySelectorAll('[data-service-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var item = button.closest('[data-service-item]');
        var details = item && item.querySelector('[data-service-details]');
        if (!details) return;
        var open = !details.classList.contains('is-open');
        if (open) {
          details.removeAttribute('hidden');
          details.classList.add('is-open');
          item.classList.add('is-open');
          details.style.maxHeight = details.scrollHeight + 'px';
          button.setAttribute('aria-expanded', 'true');
          button.textContent = 'Skrýt informace';
        } else {
          details.style.maxHeight = '0';
          details.classList.remove('is-open');
          item.classList.remove('is-open');
          button.setAttribute('aria-expanded', 'false');
          button.textContent = 'Více informací';
          window.setTimeout(function () {
            if (!details.classList.contains('is-open')) details.setAttribute('hidden', '');
          }, 420);
        }
      });
    });
  }

  var galleryDataEl = document.getElementById('gallery-data');
  var gallerySection = document.querySelector('[data-gallery]');
  if (galleryDataEl && gallerySection) {
    var galleryItems = [];
    try { galleryItems = JSON.parse(galleryDataEl.textContent || '[]'); } catch (e) { galleryItems = []; }

    if (galleryItems.length) {
    var carousel = gallerySection.querySelector('[data-gallery-carousel]');
    var slides = carousel ? Array.prototype.slice.call(carousel.querySelectorAll('.gallery-carousel__slide')) : [];
    var dots = carousel ? Array.prototype.slice.call(carousel.querySelectorAll('.gallery-carousel__dot')) : [];
    var prevBtn = carousel && carousel.querySelector('[data-carousel-prev]');
    var nextBtn = carousel && carousel.querySelector('[data-carousel-next]');
    var carouselIndex = 0;
    var autoplayTimer = null;
    var autoplayDelay = 4500;
    var paused = false;
    var dragStartX = 0;
    var dragging = false;

    function preloadCarousel(index) {
      if (!galleryItems.length) return;
      var total = galleryItems.length;
      var prev = galleryItems[(index - 1 + total) % total];
      var next = galleryItems[(index + 1) % total];
      [prev, next].forEach(function (item) {
        if (!item || !item.src) return;
        var img = new Image();
        img.src = item.src;
      });
    }

    function showCarousel(index) {
      if (!slides.length) return;
      var total = slides.length;
      carouselIndex = (index + total) % total;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === carouselIndex);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === carouselIndex);
      });
      preloadCarousel(carouselIndex);
    }

    function nextCarousel(step) {
      showCarousel(carouselIndex + (step || 1));
    }

    function startAutoplay() {
      if (!carousel || slides.length < 2 || paused) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(function () { nextCarousel(1); }, autoplayDelay);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    if (carousel && slides.length > 1) {
      if (prevBtn) prevBtn.addEventListener('click', function () { nextCarousel(-1); startAutoplay(); });
      if (nextBtn) nextBtn.addEventListener('click', function () { nextCarousel(1); startAutoplay(); });
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { showCarousel(i); startAutoplay(); });
      });
      carousel.addEventListener('mouseenter', function () { paused = true; stopAutoplay(); });
      carousel.addEventListener('mouseleave', function () { paused = false; startAutoplay(); });

      carousel.addEventListener('touchstart', function (event) {
        var touch = event.changedTouches[0];
        dragStartX = touch.clientX;
        stopAutoplay();
      }, { passive: true });

      carousel.addEventListener('touchend', function (event) {
        var touch = event.changedTouches[0];
        var deltaX = touch.clientX - dragStartX;
        if (Math.abs(deltaX) >= 40) nextCarousel(deltaX > 0 ? -1 : 1);
        startAutoplay();
      }, { passive: true });

      carousel.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'mouse') return;
        dragging = true;
        dragStartX = event.clientX;
        stopAutoplay();
      });

      carousel.addEventListener('pointerup', function (event) {
        if (!dragging || event.pointerType !== 'mouse') return;
        dragging = false;
        var deltaX = event.clientX - dragStartX;
        if (Math.abs(deltaX) >= 50) nextCarousel(deltaX > 0 ? -1 : 1);
        startAutoplay();
      });

      showCarousel(0);
      startAutoplay();
    }

    var lightbox = gallerySection.querySelector('[data-gallery-lightbox]');
    var lightboxImage = gallerySection.querySelector('[data-gallery-lightbox-image]');
    var metaBlock = gallerySection.querySelector('[data-gallery-meta]');
    var metaCaption = gallerySection.querySelector('[data-gallery-meta-caption]');
    var closeBtn = gallerySection.querySelector('[data-gallery-close]');
    var lightboxPrev = gallerySection.querySelector('[data-gallery-prev]');
    var lightboxNext = gallerySection.querySelector('[data-gallery-next]');
    var stage = gallerySection.querySelector('[data-gallery-stage]');
    var triggers = gallerySection.querySelectorAll('[data-gallery-trigger]');
    var lightboxIndex = 0;
    var touchStartX = 0;
    var touchStartY = 0;

    function updateMeta(item) {
      if (!metaBlock || !metaCaption) return;
      if (!item.caption) {
        metaBlock.setAttribute('hidden', '');
        return;
      }
      metaBlock.removeAttribute('hidden');
      metaCaption.textContent = item.caption;
    }

    function showLightbox(index) {
      if (!lightbox || !lightboxImage) return;
      var total = galleryItems.length;
      lightboxIndex = (index + total) % total;
      var item = galleryItems[lightboxIndex];
      lightboxImage.src = item.src;
      lightboxImage.alt = item.alt || '';
      updateMeta(item);
      if (lightboxPrev) lightboxPrev.hidden = total <= 1;
      if (lightboxNext) lightboxNext.hidden = total <= 1;
      preloadCarousel(lightboxIndex);
    }

    function openLightbox(index) {
      if (!lightbox) return;
      stopAutoplay();
      showLightbox(index);
      lightbox.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
      if (!lightbox || !lightboxImage) return;
      lightbox.setAttribute('hidden', '');
      lightboxImage.removeAttribute('src');
      document.body.style.overflow = '';
      startAutoplay();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        openLightbox(Number(trigger.getAttribute('data-index') || 0));
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', function () { showLightbox(lightboxIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', function () { showLightbox(lightboxIndex + 1); });

    if (lightbox) {
      lightbox.addEventListener('click', function (event) {
        if (event.target === lightbox) closeLightbox();
      });
    }
    if (stage) stage.addEventListener('click', function (event) { event.stopPropagation(); });

    document.addEventListener('keydown', function (event) {
      if (!lightbox || lightbox.hasAttribute('hidden')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
      if (event.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
    });

    if (lightbox) {
      lightbox.addEventListener('touchstart', function (event) {
        var touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true });

      lightbox.addEventListener('touchend', function (event) {
        var touch = event.changedTouches[0];
        var deltaX = touch.clientX - touchStartX;
        var deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) < 40 || Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (deltaX > 0) showLightbox(lightboxIndex - 1);
        else showLightbox(lightboxIndex + 1);
      }, { passive: true });
    }
    }
  }
})();
