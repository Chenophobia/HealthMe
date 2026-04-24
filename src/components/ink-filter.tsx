export function InkFilter() {
  return (
    <svg className="absolute w-0 h-0" aria-hidden>
      <filter id="rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="1.5" />
      </filter>
    </svg>
  );
}
