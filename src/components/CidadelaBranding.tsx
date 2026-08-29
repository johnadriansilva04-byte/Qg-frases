/** Emblema da Cidadela: muralha com torres, ameias, portão e estandarte. */
export function CidadelaEmblem({ className = "w-16 h-16 md:w-20 md:h-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} role="img" aria-label="Emblema da Cidadela">
      {/* torre esquerda */}
      <rect x="8" y="42" width="18" height="32" rx="2" fill="url(#cidStone)" />
      <rect x="8" y="36" width="6" height="7" fill="url(#cidStone)" />
      <rect x="20" y="36" width="6" height="7" fill="url(#cidStone)" />
      {/* torre direita */}
      <rect x="70" y="42" width="18" height="32" rx="2" fill="url(#cidStone)" />
      <rect x="70" y="36" width="6" height="7" fill="url(#cidStone)" />
      <rect x="82" y="36" width="6" height="7" fill="url(#cidStone)" />
      {/* torreão central */}
      <rect x="30" y="28" width="36" height="46" rx="2" fill="url(#cidKeep)" />
      <rect x="30" y="21" width="7" height="8" fill="url(#cidKeep)" />
      <rect x="44.5" y="21" width="7" height="8" fill="url(#cidKeep)" />
      <rect x="59" y="21" width="7" height="8" fill="url(#cidKeep)" />
      {/* estandarte */}
      <line x1="48" y1="21" x2="48" y2="8" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 8 h15 l-4.5 4.5 L63 17 h-15 z" fill="#ec4899" />
      {/* janelas */}
      <rect x="15.5" y="50" width="3" height="8" rx="1.5" fill="#0f172a" opacity="0.85" />
      <rect x="77.5" y="50" width="3" height="8" rx="1.5" fill="#0f172a" opacity="0.85" />
      <rect x="38" y="38" width="4" height="9" rx="2" fill="#0f172a" opacity="0.85" />
      <rect x="54" y="38" width="4" height="9" rx="2" fill="#0f172a" opacity="0.85" />
      {/* portão em arco */}
      <path d="M41 74 V62 a7 7 0 0 1 14 0 V74 z" fill="#0f172a" />
      <path d="M41 74 V62 a7 7 0 0 1 14 0 V74" stroke="#a855f7" strokeWidth="1.5" opacity="0.6" />
      {/* base da muralha */}
      <rect x="4" y="74" width="88" height="5" rx="2.5" fill="url(#cidStone)" opacity="0.9" />
      <defs>
        <linearGradient id="cidStone" x1="4" y1="36" x2="92" y2="79" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="cidKeep" x1="30" y1="21" x2="66" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Ícone do Desenvolvimento do Brio: pergaminho + pena (Biblioteca, Cartório e Texto). */
export function PergaminhoIcon({ className = "w-10 h-10 md:w-12 md:h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="Pergaminho do Brio">
      {/* rolo superior esquerdo */}
      <rect x="6" y="6" width="11" height="11" rx="5.5" fill="url(#brioGrad)" />
      <circle cx="11.5" cy="11.5" r="2.2" fill="#0f172a" opacity="0.5" />
      {/* corpo do pergaminho */}
      <path
        d="M11.5 11.5 H50 a4 4 0 0 1 4 4 V46 H11.5 a5.5 5.5 0 0 1 -5.5 -5.5 V17 a5.5 5.5 0 0 1 5.5 -5.5 Z"
        fill="url(#brioGrad)"
        opacity="0.92"
      />
      {/* rolo inferior direito */}
      <rect x="43" y="40" width="11" height="11" rx="5.5" fill="url(#brioGrad)" />
      <circle cx="48.5" cy="45.5" r="2.2" fill="#0f172a" opacity="0.5" />
      {/* linhas de texto */}
      <path d="M16 20 h20" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M16 26 h26" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      <path d="M16 32 h17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      {/* pena */}
      <path
        d="M58 6 C 50 12 42 22 37 34 L 41 38 C 53 33 60 24 62 10 Z"
        fill="#fff"
        opacity="0.9"
      />
      <path d="M58 6 C 52 14 45 24 39 36" stroke="#f59e0b" strokeWidth="1.6" opacity="0.8" />
      <defs>
        <linearGradient id="brioGrad" x1="6" y1="6" x2="58" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Faixa de ameias: divisor com cara de muralha de cidadela. */
export function Amelas({ className = "" }: { className?: string }) {
  const merlons = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg viewBox="0 0 240 14" className={`h-3 w-64 md:w-96 ${className}`} preserveAspectRatio="none" aria-hidden>
      {merlons.map((i) => (
        <rect key={i} x={i * 20} y={0} width={12} height={8} rx={1} fill="currentColor" />
      ))}
      <rect x="0" y="8" width="240" height="6" fill="currentColor" />
    </svg>
  );
}
