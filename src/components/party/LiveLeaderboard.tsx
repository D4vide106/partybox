import { Crown, WifiOff, UserX, Circle, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Player, PlayerVote, Room } from "@/lib/party/hooks";
import { activePlayers, useKickActions, votesRequired } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import { AvatarMark } from "./AvatarMark";

/**
 * Right-side desktop panel + bottom-sheet on mobile.
 * Live scores, presence dots, kick button.
 */
export function LiveLeaderboard({
  room, players, meId, me, votes,
}: {
  room: Room;
  players: Player[];
  meId: string;
  me: Player | null;
  votes: PlayerVote[];
}) {
  const [openMobile, setOpenMobile] = useState(false);
  const active = activePlayers(players);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const threshold = room.settings?.votekickThresholdPct ?? 60;
  const { castVote } = useKickActions(room, players, me);

  const votesByTarget = new Map<string, string[]>();
  for (const v of votes) {
    const arr = votesByTarget.get(v.target_id) ?? [];
    arr.push(v.voter_id);
    votesByTarget.set(v.target_id, arr);
  }

  const content = (
    <ul className="space-y-1.5">
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

        return (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition ${
              isKicked ? "bg-destructive/10 opacity-60"
                : isOffline ? "bg-secondary/30"
                : isMe ? "bg-primary/20 ring-1 ring-primary"
                : "bg-secondary/40"
            }`}
          >
            <span className="w-5 text-center text-xs font-black text-muted-foreground shrink-0">
              {rank <= 3 ? <Medal rank={rank} /> : `${rank}.`}
            </span>
            <div className="relative shrink-0">
              <AvatarMark value={p.avatar_emoji} label={p.nickname} size="sm" />
              <Circle
                aria-hidden
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${
                  isKicked ? "fill-destructive text-destructive"
                  : isOffline ? "fill-muted-foreground text-muted-foreground"
                  : "fill-green-500 text-green-500"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-1">
              {p.is_host && <Crown className="h-3 w-3 text-accent shrink-0" aria-label="Host" />}
              <span className={`text-xs font-bold truncate ${isKicked ? "line-through" : ""}`}>{p.nickname}</span>
            </div>
            <span className="text-sm font-black tabular-nums text-accent shrink-0">{p.score}</span>
            {canVote && (
              <button
                type="button"
                onClick={() => { void castVote(p.id); sfx.vote(); }}
                aria-label={iVoted ? "Ritira il voto" : "Vota per espellere"}
                className={`shrink-0 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-black transition ${
                  iVoted
                    ? "border-destructive bg-destructive/20 text-destructive"
                    : "border-border bg-card hover:bg-secondary"
                }`}
              >
                <UserX className="h-2.5 w-2.5" />
                {targetVotes.length}/{need}
              </button>
            )}
            {isOffline && <WifiOff className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Offline" />}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col fixed right-4 top-24 w-64 max-h-[calc(100dvh-8rem)] rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-neon p-4 z-30">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-3 text-center">
          Live · {active.length} attivi
        </div>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>

      {/* Mobile: bottom sheet toggle */}
      <div className="lg:hidden fixed bottom-3 right-3 z-40">
        <button
          type="button"
          onClick={() => setOpenMobile((o) => !o)}
          aria-label="Mostra classifica live"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-black shadow-neon"
        >
          {openMobile ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Classifica {active.length}
        </button>
      </div>
      {openMobile && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card/95 backdrop-blur-xl p-4 pb-24 shadow-2xl animate-in slide-in-from-bottom">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" aria-hidden />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-3 text-center">
            Live · {active.length} attivi
          </div>
          {content}
        </div>
      )}
    </>
  );
}

function Medal({ rank }: { rank: number }) {
  const colors = ["text-accent", "text-muted-foreground", "text-orange-400"];
  return <span className={`font-black ${colors[rank - 1]}`}>{rank}</span>;
}
