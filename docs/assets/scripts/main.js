// js/landing.js — comportamiento de la landing page (navbar + menú móvil)

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const menuBtn = document.getElementById('mobileMenuBtn');

  // Sombra del navbar al hacer scroll
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  // Menú móvil (hamburguesa)
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const isOpen = navbar.classList.toggle('mobile-open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menuBtn.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    // Cierra el menú móvil al elegir un link (ancla o botón de acción)
    navbar.querySelectorAll('.nav-links a, .nav-actions a').forEach(link => {
      link.addEventListener('click', () => {
        if (navbar.classList.contains('mobile-open')) {
          navbar.classList.remove('mobile-open');
          menuBtn.setAttribute('aria-expanded', 'false');
          menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
      });
    });

    // Cierra el menú móvil con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navbar.classList.contains('mobile-open')) {
        navbar.classList.remove('mobile-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        menuBtn.focus();
      }
    });
  }

  // Foco accesible: oculta el anillo de foco para clics de mouse,
  // lo mantiene visible para navegación por teclado (Tab)
  document.body.addEventListener('mousedown', () => {
    document.body.classList.add('using-mouse');
  });
  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.remove('using-mouse');
    }
  });
});
