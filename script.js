const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');

     const hero = document.querySelector('.hero');
   for (let i = 0; i < 22; i++) {
     const d = document.createElement('div');
     d.className = 'dust-particle';
     const size = Math.random() * 3.5 + 1.2;
     d.style.cssText = `
       width:${size}px; height:${size}px;
       left:${Math.random()*100}%;
       bottom:${10 + Math.random()*25}%;
       animation-duration:${3 + Math.random()*4}s;
       animation-delay:${Math.random()*5}s;
     `;
     hero.appendChild(d);
  });
});
