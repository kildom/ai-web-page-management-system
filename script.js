const slides = [...document.querySelectorAll('.slide')];
const dots = [...document.querySelectorAll('.slide-dot')];
const title = document.querySelector('#artwork-title');
const meta = document.querySelector('#artwork-meta');
const showcase = document.querySelector('.showcase');
let activeIndex = 0;
let autoplayTimer;

if (slides.length && dots.length === slides.length && title && meta && showcase) {
  const titleCopy = [
    'Kształt <em>emocji</em>',
    'Poza <em>schematem</em>',
    'Cichszy rodzaj <em>zachwytu</em>',
  ];
  const metaCopy = [
    'Mara Solis <span>·</span> Do 28 września',
    'Jules Ardent <span>·</span> Do 28 września',
    'Nina Vale <span>·</span> Do 28 września',
  ];

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === activeIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      dots[i].classList.toggle('is-active', active);
      dots[i].setAttribute('aria-pressed', String(active));
    });
    title.innerHTML = titleCopy[activeIndex];
    meta.innerHTML = metaCopy[activeIndex];
  }

  function stopAutoplay() {
    window.clearInterval(autoplayTimer);
  }

  function startAutoplay() {
    stopAutoplay();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden) {
      autoplayTimer = window.setInterval(() => showSlide(activeIndex + 1), 5500);
    }
  }

  document.querySelector('.previous').addEventListener('click', () => showSlide(activeIndex - 1));
  document.querySelector('.next').addEventListener('click', () => showSlide(activeIndex + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
  showcase.addEventListener('mouseenter', stopAutoplay);
  showcase.addEventListener('mouseleave', startAutoplay);
  showcase.addEventListener('focusin', stopAutoplay);
  showcase.addEventListener('focusout', (event) => {
    if (!showcase.contains(event.relatedTarget)) startAutoplay();
  });
  document.addEventListener('visibilitychange', startAutoplay);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showSlide(activeIndex - 1);
    if (event.key === 'ArrowRight') showSlide(activeIndex + 1);
  });
  startAutoplay();
}

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
if (menuToggle && navigation) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('is-open', !isOpen);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menuToggle.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
    }
  });
}

const photoButtons = [...document.querySelectorAll('.photo-open')];
const photoLightbox = document.querySelector('.photo-lightbox');
if (photoButtons.length && photoLightbox) {
  const lightboxImage = photoLightbox.querySelector('.lightbox-image');
  const lightboxCaption = photoLightbox.querySelector('.lightbox-caption');
  const highResolutionPhotos = new Map();
  let currentPhoto = 0;

  function loadPhoto(index, priority = 'low') {
    const photoIndex = (index + photoButtons.length) % photoButtons.length;
    if (!highResolutionPhotos.has(photoIndex)) {
      const thumbnail = photoButtons[photoIndex].querySelector('img');
      const imageUrl = new URL(thumbnail.currentSrc || thumbnail.src);
      imageUrl.searchParams.set('w', '1800');
      imageUrl.searchParams.set('q', '90');
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = priority;
      image.src = imageUrl.href;
      highResolutionPhotos.set(photoIndex, image);
    }
    return highResolutionPhotos.get(photoIndex);
  }

  function showPhoto(index) {
    currentPhoto = (index + photoButtons.length) % photoButtons.length;
    const button = photoButtons[currentPhoto];
    const thumbnail = button.querySelector('img');
    const caption = button.closest('figure').querySelector('figcaption span').textContent;
    const photoIndex = currentPhoto;
    const captionText = `${String(currentPhoto + 1).padStart(2, '0')} / ${photoButtons.length} · ${caption}`;
    const fullResolutionImage = loadPhoto(photoIndex, 'high');
    lightboxImage.src = thumbnail.currentSrc || thumbnail.src;
    lightboxImage.alt = thumbnail.alt;
    lightboxCaption.textContent = `${captionText} · Ładowanie zdjęcia w wysokiej rozdzielczości…`;
    photoLightbox.classList.add('is-loading');
    photoLightbox.classList.remove('has-error');

    function showFullResolution() {
      if (currentPhoto === photoIndex && photoLightbox.open) {
        lightboxImage.src = fullResolutionImage.src;
        lightboxCaption.textContent = captionText;
        photoLightbox.classList.remove('is-loading');
      }
    }

    function showLoadError() {
      if (currentPhoto === photoIndex && photoLightbox.open) {
        lightboxImage.removeAttribute('src');
        lightboxCaption.textContent = `${captionText} · Nie udało się załadować zdjęcia.`;
        photoLightbox.classList.remove('is-loading');
        photoLightbox.classList.add('has-error');
      }
    }

    if (fullResolutionImage.complete && fullResolutionImage.naturalWidth > 0) {
      showFullResolution();
    } else if (fullResolutionImage.complete) {
      showLoadError();
    } else {
      fullResolutionImage.addEventListener('load', showFullResolution, { once: true });
      fullResolutionImage.addEventListener('error', showLoadError, { once: true });
    }

    loadPhoto(photoIndex + 1);
    loadPhoto(photoIndex - 1);
  }

  photoButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      photoLightbox.showModal();
      showPhoto(index);
    });
  });
  photoLightbox.querySelector('.lightbox-close').addEventListener('click', () => photoLightbox.close());
  photoLightbox.querySelector('.lightbox-previous').addEventListener('click', () => showPhoto(currentPhoto - 1));
  photoLightbox.querySelector('.lightbox-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
  photoLightbox.addEventListener('click', (event) => {
    if (event.target === photoLightbox) photoLightbox.close();
  });
  photoLightbox.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      photoLightbox.close();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(currentPhoto - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(currentPhoto + 1);
    }
  });
}
