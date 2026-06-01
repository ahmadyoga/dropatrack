export function spawnReactions(emoji: string, n: number): void {
  const layer = document.getElementById('react-layer');
  if (!layer) return;

  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = emoji;

    const dur = 3.2 + Math.random() * 2.4;
    el.style.left = `${4 + Math.random() * 92}vw`;
    el.style.fontSize = `${24 + Math.random() * 26}px`;
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    el.style.setProperty('--dur', `${dur}s`);
    el.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
    el.style.setProperty('--rot', `${Math.random() * 40 - 20}deg`);
    el.style.setProperty('--rot2', `${Math.random() * 60 - 30}deg`);

    layer.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.6) * 1000);
  }
}
