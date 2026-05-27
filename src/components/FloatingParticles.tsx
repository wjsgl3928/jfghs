import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  text: string;
  x: number;
  y: number;
  factor: number;
  fontSize: number;
}

export default function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Generate particles
    const words = ['Word', 'Link', 'Lexi', 'Arena', 'A', 'B', 'Z', 'AI', 'Chain', '끝말잇기', '끄투'];
    const generated: Particle[] = Array.from({ length: 15 }).map((_, idx) => ({
      id: idx,
      text: words[Math.floor(Math.random() * words.length)],
      x: Math.random() * 100, // percentage left
      y: Math.random() * 100, // percentage top
      factor: Math.random() * 0.04 + 0.01,
      fontSize: Math.floor(Math.random() * 10) + 11 // 11px to 21px
    }));
    setParticles(generated);

    // Track mouse
    const handleMouseMove = (e: MouseEvent) => {
      const xPercent = (e.clientX / window.innerWidth) * 100;
      const yPercent = (e.clientY / window.innerHeight) * 100;
      
      // Update css custom properties for index.css radial background!
      document.body.style.setProperty('--mouse-x', `${xPercent}%`);
      document.body.style.setProperty('--mouse-y', `${yPercent}%`);

      setMousePos({
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 2
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => {
        const translateX = mousePos.x * p.factor;
        const translateY = mousePos.y * p.factor;
        return (
          <div
            key={p.id}
            className="absolute particle-element select-none font-extrabold font-plus opacity-15"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.fontSize}px`,
              transform: `translate(${translateX}px, ${translateY}px)`,
              transition: 'transform 0.1s linear'
            }}
          >
            {p.text}
          </div>
        );
      })}
    </div>
  );
}
