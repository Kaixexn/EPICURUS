const curtain = document.createElement('div');
curtain.id = 'page-curtain';
curtain.innerHTML = `
  <div class="curtain-loader-wrap">
    <div class="curtain-spinner"></div>
    <div class="curtain-logo">EPICURUS</div>
    <p class="curtain-subtitle">Chiseling digital assets...</p>
  </div>
`;
document.body.appendChild(curtain);

const style = document.createElement('style');
style.textContent = `
  #page-curtain {
    position: fixed;
    inset: 0;
    background: #110904;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(100%);
    transition: transform 0.6s cubic-bezier(0.85, 0, 0.15, 1);
    pointer-events: none;
    background-image: radial-gradient(circle at 50% 50%, rgba(212, 168, 67, 0.08) 0%, transparent 70%);
  }

  .curtain-loader-wrap {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .curtain-spinner {
    width: 60px;
    height: 60px;
    border: 2px solid rgba(212, 168, 67, 0.1);
    border-top: 2px solid #d4a843;
    border-radius: 50%;
    animation: spinGlow 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    margin-bottom: 1.5rem;
    box-shadow: 0 0 15px rgba(212, 168, 67, 0.2), inset 0 0 10px rgba(212, 168, 67, 0.05);
  }

  .curtain-logo {
    font-family: 'Cinzel', serif;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.25em;
    color: #d4a843;
    text-shadow: 0 0 12px rgba(212, 168, 67, 0.4);
    margin-bottom: 0.5rem;
  }

  .curtain-subtitle {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.9rem;
    font-style: italic;
    color: rgba(253, 246, 227, 0.6);
    letter-spacing: 0.05em;
  }

  #page-curtain.slide-in {
    transform: translateY(0%);
    pointer-events: all;
  }
  #page-curtain.slide-in .curtain-loader-wrap {
    opacity: 1;
    transform: translateY(0);
    transition-delay: 0.2s;
  }

  #page-curtain.slide-out {
    transform: translateY(-100%);
  }
  #page-curtain.slide-out .curtain-loader-wrap {
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  body {
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  body.visible {
    opacity: 1;
  }

  @keyframes spinGlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || link.getAttribute('target') === '_blank') return;

  e.preventDefault();

  curtain.classList.remove('slide-out');
  curtain.classList.add('slide-in');

  setTimeout(() => {
    window.location.href = href;
  }, 600);
});
