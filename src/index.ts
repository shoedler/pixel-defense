(() => {
  document.addEventListener('DOMContentLoaded', _ => {
    const sketch  = document.querySelector('.sketch') as HTMLDivElement;
    const p = document.createElement('p');
    p.textContent = 'Hello, World!';
    sketch.appendChild(p);
  });
})()