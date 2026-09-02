// SVG ring countdown — visualizes remaining time and total duration.
export function CountdownRing({
  remaining, total, size = 84, stroke = 8, warnAt = 5,
}: {
  remaining: number;
  total: number;
  size?: number;
  stroke?: number;
  warnAt?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const dash = c * pct;
  const warn = remaining <= warnAt && remaining > 0;
  const color = warn ? "hsl(var(--destructive, 0 84% 60%))" : "var(--color-accent)";
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`${remaining} secondi rimasti`}
      className={`relative shrink-0 ${warn ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
          style={{ transition: "stroke-dashoffset 200ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black tabular-nums ${warn ? "text-destructive" : "text-foreground"}`}>
          {remaining}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">sec</span>
      </div>
    </div>
  );
}
