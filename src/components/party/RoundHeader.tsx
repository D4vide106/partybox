import { CountdownRing } from "./CountdownRing";
import { GAME_ICONS, GAME_RULES } from "@/lib/party/game-icons";
import type { GameType } from "@/lib/party/games";

export function RoundHeader({
  roundNumber, totalRounds, gameType, meta, remaining, phase, submittedCount, totalPlayers,
}: {
  roundNumber: number;
  totalRounds: number;
  gameType: GameType;
  meta: { name: string; tagline: string; durationSec: number };
  remaining: number;
  phase: "playing" | "results";
  submittedCount: number;
  totalPlayers: number;
}) {
  const Icon = GAME_ICONS[gameType];
  return (
    <header className="px-3 py-3">
      <div className="max-w-3xl mx-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/20 border border-primary/40">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Round {roundNumber}/{totalRounds}
          </div>
          <h1 className="text-lg sm:text-2xl font-black truncate leading-tight">{meta.name}</h1>
          <p className="text-xs text-muted-foreground truncate">{GAME_RULES[gameType] ?? meta.tagline}</p>
        </div>
        <div className="shrink-0">
          {phase === "playing" ? (
            <CountdownRing remaining={remaining} total={meta.durationSec} />
          ) : (
            <div className="text-right">
              <div className="text-2xl font-black text-primary tabular-nums">{submittedCount}/{totalPlayers}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">risposte</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
