import type { Player } from "@/lib/party/hooks";
import { AvatarMark } from "./AvatarMark";

export type ResultMetric = {
  icon?: string;
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "muted";
};

export type ResultRow = {
  playerId: string;
  points: number;
  /** Big headline value (e.g. "18/20" or "212 ms" or "47 tap"). */
  primary?: { label: string; value: string; tone?: "default" | "good" | "bad" };
  /** Small chips shown under the row (tempo, precisione, ecc.). */
  metrics?: ResultMetric[];
  /** Short note like "risposta: Italia" or "auto-inviato" */
  note?: string;
};

const TONE_CLASS: Record<NonNullable<ResultMetric["tone"]>, string> = {
  default: "bg-secondary/70 text-foreground",
  good: "bg-emerald-500/15 text-emerald-300",
  bad: "bg-rose-500/15 text-rose-300",
  muted: "bg-secondary/40 text-muted-foreground",
};

const PRIMARY_TONE_CLASS: Record<NonNullable<NonNullable<ResultRow["primary"]>["tone"]>, string> = {
  default: "text-foreground",
  good: "text-emerald-300",
  bad: "text-rose-300",
};

function rankBadge(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `${i + 1}°`;
}

export function RankedResults({
  gameEmoji,
  gameName,
  subtitle,
  meId,
  players,
  rows,
  extraHeader,
}: {
  gameEmoji: string;
  gameName: string;
  subtitle?: string;
  meId: string;
  players: Player[];
  rows: ResultRow[];
  extraHeader?: React.ReactNode;
}) {
  const ordered = [...rows].sort((a, b) => b.points - a.points);
  return (
    <section className="max-w-xl mx-auto pt-6 pb-4 px-1 space-y-3" aria-label={`Risultati ${gameName}`}>
      <header className="text-center mb-2">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold">Classifica round</div>
        <h2 className="mt-1 text-2xl font-black flex items-center justify-center gap-2">
          <span aria-hidden>{gameEmoji}</span>
          <span>{gameName}</span>
        </h2>
        {subtitle && (
          <div className="mt-1 text-sm text-muted-foreground font-semibold">{subtitle}</div>
        )}
      </header>

      {extraHeader}

      {ordered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card/60 text-center py-8 text-sm text-muted-foreground font-bold">
          Nessun risultato registrato per questo round.
        </div>
      )}

      <ol className="space-y-2.5">
        {ordered.map((row, i) => {
          const p = players.find((x) => x.id === row.playerId);
          const isMe = row.playerId === meId;
          const isLeader = i === 0 && row.points > 0;
          const primaryTone = row.primary?.tone ?? "default";
          return (
            <li
              key={row.playerId}
              className={[
                "rounded-2xl p-3 sm:p-4 flex items-center gap-3 animate-bounce-in border transition-shadow",
                isLeader
                  ? "bg-accent text-accent-foreground shadow-neon-yellow border-accent"
                  : "bg-card/80 border-border",
                isMe && !isLeader ? "ring-2 ring-primary/70" : "",
              ].join(" ")}
            >
              {/* Rank */}
              <div
                className={[
                  "shrink-0 grid place-items-center h-10 w-10 rounded-xl font-black text-lg tabular-nums",
                  isLeader ? "bg-accent-foreground/10" : "bg-secondary/70",
                ].join(" ")}
                aria-label={`Posizione ${i + 1}`}
              >
                <span aria-hidden>{rankBadge(i)}</span>
              </div>

              {/* Avatar + name + chips */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <AvatarMark value={p?.avatar_emoji} label={p?.nickname} size="md" />
                  <div className="min-w-0">
                    <div className="font-black truncate text-sm sm:text-base">
                      {p?.nickname ?? "—"}
                      {isMe && (
                        <span className={`ml-1 text-[10px] font-black uppercase tracking-widest ${isLeader ? "opacity-80" : "text-primary"}`}>
                          · TU
                        </span>
                      )}
                    </div>
                    {row.note && (
                      <div className={`text-xs truncate ${isLeader ? "opacity-80" : "text-muted-foreground"}`}>
                        {row.note}
                      </div>
                    )}
                  </div>
                </div>
                {row.metrics && row.metrics.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {row.metrics.map((m, idx) => (
                      <li
                        key={idx}
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                          isLeader ? "bg-accent-foreground/15 text-accent-foreground" : TONE_CLASS[m.tone ?? "default"],
                        ].join(" ")}
                      >
                        {m.icon && <span aria-hidden>{m.icon}</span>}
                        <span className="opacity-80">{m.label}</span>
                        <span>{m.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Primary + points */}
              <div className="shrink-0 text-right">
                {row.primary && (
                  <div className={[
                    "text-lg sm:text-xl font-black tabular-nums leading-none",
                    isLeader ? "text-accent-foreground" : PRIMARY_TONE_CLASS[primaryTone],
                  ].join(" ")}>
                    {row.primary.value}
                  </div>
                )}
                {row.primary && (
                  <div className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${isLeader ? "opacity-70" : "text-muted-foreground"}`}>
                    {row.primary.label}
                  </div>
                )}
                <div className={[
                  "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black tabular-nums",
                  isLeader ? "bg-accent-foreground/15 text-accent-foreground" : "bg-primary/15 text-primary",
                ].join(" ")}>
                  +{row.points} pt
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
