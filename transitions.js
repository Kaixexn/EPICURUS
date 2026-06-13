const curtain = document.createElement('div');
curtain.id = 'page-curtain';
document.body.appendChild(curtain);

const style = document.createElement('style');
style.textContent = `
  #page-curtain {
    position: fixed;
    inset: 0;
    background: #1a0a00;
    z-index: 99999;
    transform: translateY(100%);
    transition: transform 0.5s cubic-bezier(0.76, 0, 0.24, 1);
    pointer-events: none;
  }

  #page-curtain.slide-in {
    transform: translateY(0%);
    pointer-events: all;
  }

  #page-curtain.slide-out {
    transform: translateY(-100%);
  }

  body {
    opacity: 0;
    transition: opacity 0.35s ease;
  }

  body.visible {
    opacity: 1;
  }
`;
document.head.appendChild(style);

window.addEventListener('load', () => {
  curtain.classList.add('slide-out');
  document.body.classList.add('visible');
});

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

  e.preventDefault();

  curtain.classList.remove('slide-out');
  curtain.classList.add('slide-in');

  setTimeout(() => {
    window.location.href = href;
  }, 500);
});
