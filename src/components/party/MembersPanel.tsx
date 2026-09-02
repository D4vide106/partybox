import { Crown, WifiOff, UserX, Circle, Bot, X } from "lucide-react";
import type { Player, PlayerVote, Room } from "@/lib/party/hooks";
import { activePlayers, isBot, useKickActions, votesRequired } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import { AvatarMark } from "./AvatarMark";

/**
 * Complete member list, past + present.
 * - Green dot: connected
 * - Grey dot: disconnected
 * - Kicked: strikethrough + red badge
 * - Vote to kick button on non-me, non-kicked players
 */
export function MembersPanel({
  room, players, me, votes, onRemoveBot, onMakeHost,
}: {
  room: Room;
  players: Player[];
  me: Player | null;
  votes: PlayerVote[];
  onRemoveBot?: (id: string) => void | Promise<void>;
  onMakeHost?: (clientId: string) => void | Promise<void>;
}) {
  const active = activePlayers(players);
  const activeExcludingSelf = active.length; // subtract dynamically per target below
  const threshold = room.settings?.votekickThresholdPct ?? 60;
  const { castVote } = useKickActions(room, players, me);

  const votesByTarget = new Map<string, string[]>();
  for (const v of votes) {
    const arr = votesByTarget.get(v.target_id) ?? [];
    arr.push(v.voter_id);
    votesByTarget.set(v.target_id, arr);
  }

  return (
    <section className="rounded-3xl border border-border bg-card/70 backdrop-blur p-5" aria-label="Membri stanza">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-black text-lg">Membri · {players.length}</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {active.length} attivi
        </span>
      </header>
      <ul className="space-y-2">
        {players.map((p) => {
          const isMe = me?.id === p.id;
          const isHost = p.is_host;
          const isKicked = p.kicked;
          const isOffline = !p.is_connected && !isKicked;

          const targetVotes = votesByTarget.get(p.id) ?? [];
          const iVoted = me ? targetVotes.includes(me.id) : false;
          const activeExcludingTarget = active.filter((x) => x.id !== p.id).length || activeExcludingSelf;
          const need = votesRequired(activeExcludingTarget, threshold);
          const bot = isBot(p);
          const canVote = !!me && !isMe && !isKicked && me.is_connected && !bot;

          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                isKicked ? "bg-destructive/10 opacity-70"
                  : isOffline ? "bg-secondary/30"
                  : isMe ? "bg-primary/15 ring-1 ring-primary"
                  : "bg-secondary/50"
              }`}
            >
              <div className="relative shrink-0">
                <AvatarMark value={p.avatar_emoji} label={p.nickname} size="md" />
                <Circle
                  aria-hidden
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${
                    isKicked ? "fill-destructive text-destructive"
                    : isOffline ? "fill-muted-foreground text-muted-foreground"
                    : "fill-green-500 text-green-500"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isHost && <Crown className="h-3.5 w-3.5 text-accent shrink-0" aria-label="Host" />}
                  {bot && <Bot className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Bot" />}
                  <span className={`font-bold text-sm truncate ${isKicked ? "line-through" : ""}`}>
                    {p.nickname}
                    {isMe && <span className="ml-1 text-[10px] text-muted-foreground">(tu)</span>}
                    {bot && <span className="ml-1 text-[10px] text-primary font-black">BOT</span>}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {isKicked ? (
                    <><UserX className="h-3 w-3" /> Espulso</>
                  ) : isOffline ? (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  ) : (
                    <>Online · {p.score} pt</>
                  )}
                </div>
              </div>

              {onMakeHost && !isMe && !isHost && !isKicked && p.is_connected && (
                <button
                  type="button"
                  onClick={() => { void onMakeHost(p.client_id); sfx.click(); }}
                  aria-label={`Rendi ${p.nickname} host`}
                  title="Rendi host"
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-black hover:bg-accent/20 transition"
                >
                  <Crown className="h-3 w-3" /> Host
                </button>
              )}
              {bot && onRemoveBot && !isKicked && (
                <button
                  type="button"
                  onClick={() => void onRemoveBot(p.id)}
                  aria-label="Rimuovi bot"
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive px-2 py-1 text-[11px] font-black hover:bg-destructive/20 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {canVote && (
                <button
                  type="button"
                  onClick={() => { void castVote(p.id); sfx.vote(); }}
                  aria-label={iVoted ? "Ritira il voto" : "Vota per espellere"}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black transition ${
                    iVoted
                      ? "border-destructive bg-destructive/20 text-destructive"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <UserX className="h-3 w-3" />
                  {targetVotes.length}/{need}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
