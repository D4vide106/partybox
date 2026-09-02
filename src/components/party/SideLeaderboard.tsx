import { useState } from "react";
import { Crown, WifiOff, UserX, ChevronUp, ChevronDown, Trophy } from "lucide-react";
import type { Player, PlayerVote, Room } from "@/lib/party/hooks";
import { activePlayers, useKickActions, votesRequired } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import { AvatarMark } from "./AvatarMark";

/**
 * Sleeker leaderboard. Sidebar column (grid, not overlay) on desktop.
 * Bottom-sheet on mobile with unread badge for score changes.
 */
export function SideLeaderboard({
  room, players, meId, me, votes, variant = "sidebar",
}: {
  room: Room;
  players: Player[];
  meId: string;
  me: Player | null;
  votes: PlayerVote[];
  variant?: "sidebar" | "drawer";
}) {
  const [openMobile, setOpenMobile] = useState(false);
  const active = activePlayers(players);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = Math.max(1, sorted[0]?.score ?? 1);
  const threshold = room.settings?.votekickThresholdPct ?? 60;
  const { castVote } = useKickActions(room, players, me);

  const votesByTarget = new Map<string, string[]>();
  for (const v of votes) {
    const arr = votesByTarget.get(v.target_id) ?? [];
    arr.push(v.voter_id);
    votesByTarget.set(v.target_id, arr);
  }

  const body = (
    <ul className="space-y-2">
      {sorted.map((p, i) => {
        const isMe = p.id === meId;
        const isKicked = p.kicked;
        const isOffline = !p.is_connected && !isKicked;
        const rank = i + 1;
        const targetVotes = votesByTarget.get(p.id) ?? [];
        const iVoted = me ? targetVotes.includes(me.id) : false;
        const activeExcludingTarget = active.filter((x) => x.id !== p.id).length;
        const need = votesRequired(activeExcludingTarget, threshold);
        const canVote = !!me && !isMe && !isKicked && me.is_connected;
        const fill = Math.max(6, Math.round((p.score / topScore) * 100));

        return (
          <li key={p.id}
            className={`relative rounded-2xl overflow-hidden border transition ${
              isKicked ? "border-destructive/30 bg-destructive/5 opacity-60"
                : isMe ? "border-primary/60 bg-primary/10 ring-1 ring-primary shadow-neon"
                : isOffline ? "border-border/50 bg-secondary/20"
                : "border-border bg-secondary/40"
            }`}
          >
            {/* Score-bar background */}
            <div
              aria-hidden
              className={`absolute inset-y-0 left-0 opacity-30 transition-all duration-500 ${
                rank === 1 ? "bg-gradient-to-r from-accent/60 to-transparent"
                : rank === 2 ? "bg-gradient-to-r from-primary/50 to-transparent"
                : rank === 3 ? "bg-gradient-to-r from-chart-4/50 to-transparent"
                : "bg-gradient-to-r from-secondary to-transparent"
              }`}
              style={{ width: `${fill}%` }}
            />
            <div className="relative flex items-center gap-2 px-2.5 py-2">
              <span className={`w-6 text-center text-xs font-black shrink-0 ${
                rank === 1 ? "text-accent"
                : rank === 2 ? "text-muted-foreground"
                : rank === 3 ? "text-orange-400"
                : "text-muted-foreground/70"
              }`}>
                {rank === 1 ? <Trophy className="h-4 w-4 mx-auto" /> : `#${rank}`}
              </span>
              <div className="relative shrink-0">
                <AvatarMark value={p.avatar_emoji} label={p.nickname} size="sm" />
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full ring-2 ring-card ${
                    isKicked ? "bg-destructive"
                    : isOffline ? "bg-muted-foreground"
                    : "bg-green-500 animate-pulse"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1 flex items-center gap-1">
                {p.is_host && <Crown className="h-3 w-3 text-accent shrink-0" aria-label="Host" />}
                <span className={`text-xs font-bold truncate ${isKicked ? "line-through" : ""}`}>{p.nickname}</span>
                {isMe && <span className="text-[9px] opacity-70">(tu)</span>}
              </div>
              <span className={`text-sm font-black tabular-nums shrink-0 ${rank === 1 ? "text-accent" : "text-foreground"}`}>{p.score}</span>
              {canVote && (
                <button
                  type="button"
                  onClick={() => { void castVote(p.id); sfx.vote(); }}
                  aria-label={iVoted ? "Ritira il voto" : "Vota per espellere"}
                  className={`shrink-0 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-black transition ${
                    iVoted ? "border-destructive bg-destructive/25 text-destructive"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <UserX className="h-2.5 w-2.5" />
                  {targetVotes.length}/{need}
                </button>
              )}
              {isOffline && <WifiOff className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Offline" />}
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "sidebar") {
    return (
      <section className="hidden lg:flex flex-col rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-3 h-full min-h-0" aria-label="Classifica live">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-accent" /> Classifica
          </div>
          <div className="text-[10px] text-muted-foreground">{active.length} attivi</div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">{body}</div>
      </section>
    );
  }

  return (
    <>
      <div className="lg:hidden fixed bottom-3 right-3 z-40">
        <button
          type="button"
          onClick={() => { setOpenMobile((o) => !o); sfx.click(); }}
          aria-label="Mostra classifica"
          className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2.5 text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition"
        >
          {openMobile ? <ChevronDown className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
          Classifica
        </button>
      </div>
      {openMobile && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card/95 backdrop-blur-xl p-4 pb-24 shadow-2xl animate-in slide-in-from-bottom">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" aria-hidden />
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-3 text-center">
            Classifica · {active.length} attivi
          </div>
          {body}
        </div>
      )}
    </>
  );
}
