interface Props {
  intake: number;
  bmr: number;
  active: number;
}

export function CalorieBar({ intake, bmr, active }: Props) {
  const out = bmr + active;
  const net = intake - out;
  const pct = out > 0 ? Math.min(1, intake / out) : 0;
  const dash = 188;
  const offset = dash * (1 - pct);
  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] gap-6 items-center px-5 py-4 rounded border-l-[3px]"
      style={{ background: "var(--paper-accent)", borderColor: "var(--accent)" }}
    >
      <div className="w-[72px] h-[72px] relative">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r="30" stroke="var(--divider)" strokeWidth="6" fill="none" />
          <circle
            cx="36"
            cy="36"
            r="30"
            stroke="var(--accent)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            filter="url(#rough)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-sm">
          {Math.round(pct * 100)}%<small className="text-[9px]" style={{ color: "var(--ink-faded)" }}>TODAY</small>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div>
          <div className="text-[10px] tracking-widest uppercase font-bold" style={{ color: "var(--ink-faded)" }}>IN</div>
          <div className="text-2xl font-bold">{intake.toLocaleString()}</div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>kcal</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase font-bold" style={{ color: "var(--ink-faded)" }}>OUT</div>
          <div className="text-2xl font-bold">{out.toLocaleString()}</div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>BMR + active</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase font-bold" style={{ color: "var(--ink-faded)" }}>NET</div>
          <div className="text-2xl font-bold" style={{ color: net < 0 ? "var(--accent-2)" : "var(--accent)" }}>
            {net > 0 ? "+" : ""}{net}
          </div>
          <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{net < 0 ? "deficit" : "surplus"}</div>
        </div>
      </div>
    </div>
  );
}
