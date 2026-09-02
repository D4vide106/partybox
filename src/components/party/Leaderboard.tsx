import { Crown, RotateCcw, Trophy, WifiOff, UserX } from "lucide-react";
import type { Player } from "@/lib/party/hooks";
import { activePlayers } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import { useEffect, useRef } from "react";
import { AvatarMark } from "./AvatarMark";

export function Leaderboard({
  players, title, isHost, actionLabel, onAction,
}: {
  players: Player[];
  title: string;
  isHost: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  const active = activePlayers(players);
  const past = players.filter((p) => p.kicked || !p.is_connected || p.left_at);
  const sorted = [...active].sort((a, b) => b.score - a.score);
  const [first, second, third, ...rest] = sorted;

  const played = useRef(false);
  useEffect(() => { if (!played.current) { sfx.victory(); played.current = true; } }, []);

  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="h-10 w-10 text-accent" aria-hidden />
          <h1 className="text-4xl sm:text-5xl font-black text-center text-glow text-primary">{title}</h1>
        </div>
        <p className="text-center text-muted-foreground mb-10">Ecco chi ha spaccato di più</p>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-3 items-end mb-10">
          {second ? (
            <PodiumPlace player={second} rank={2} height="h-32" bg="bg-secondary" />
          ) : <div />}
          {first ? (
            <PodiumPlace player={first} rank={1} height="h-44" bg="bg-accent text-accent-foreground shadow-neon-yellow" isKing />
          ) : <div />}
          {third ? (
            <PodiumPlace player={third} rank={3} height="h-24" bg="bg-secondary" />
          ) : <div />}
        </div>

        {rest.length > 0 && (
          <section className="rounded-3xl border border-border bg-card/70 backdrop-blur p-4 mb-6 space-y-2">
            {rest.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-black text-muted-foreground shrink-0">#{i + 4}</span>
                  <AvatarMark value={p.avatar_emoji} label={p.nickname} size="sm" />
                  <span className="font-bold truncate">{p.nickname}</span>
                </div>
                <span className="font-black tabular-nums">{p.score}</span>
              </div>
            ))}
          </section>
        )}

        {past.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur p-4 mb-6" aria-label="Membri passati">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-black mb-3">
              Membri passati · {past.length}
            </h2>
            <ul className="space-y-1.5">
              {past.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm">
                  <AvatarMark value={p.avatar_emoji} label={p.nickname} size="sm" className="opacity-70" />
                  <span className={`flex-1 truncate ${p.kicked ? "line-through" : ""} text-muted-foreground`}>{p.nickname}</span>
                  {p.kicked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive font-bold">
                      <UserX className="h-3 w-3" /> Espulso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-bold">
                      <WifiOff className="h-3 w-3" /> Offline
                    </span>
                  )}
                  <span className="font-black tabular-nums text-xs">{p.score}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isHost ? (
          <button
            onClick={onAction}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground text-xl font-black py-5 shadow-neon animate-pulse-glow"
          >
            <RotateCcw className="h-5 w-5" /> {actionLabel}
          </button>
        ) : (
          <div className="w-full rounded-2xl bg-card/50 border border-border text-center py-5 text-muted-foreground font-bold">
            L'host può iniziare una nuova partita
          </div>
        )}
      </div>
    </main>
  );
}

function PodiumPlace({
  player, rank, height, bg, isKing,
}: { player: Player; rank: number; height: string; bg: string; isKing?: boolean }) {
  return (
    <div className="flex flex-col items-center animate-bounce-in">
      <div className="h-8 mb-1">{isKing && <Crown className="h-8 w-8 text-accent" aria-hidden />}</div>
      <AvatarMark value={player.avatar_emoji} label={player.nickname} size="xl" className="mb-2" />
      <div className="font-black text-center truncate max-w-full text-sm sm:text-base">{player.nickname}</div>
      <div className={`mt-2 w-full rounded-t-2xl ${bg} ${height} flex flex-col items-center justify-center`}>
        <div className="font-black text-3xl">#{rank}</div>
        <div className="font-black text-xl tabular-nums">{player.score}</div>
      </div>
    </div>
  );
}
