import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Round, Player } from "@/lib/party/hooks";
import { activePlayers, isBot, useCountdown, useSubmissions, useSyncedServerNowMs } from "@/lib/party/hooks";

import { GAME_META, type GameType } from "@/lib/party/games";
import { RoundHeader } from "./RoundHeader";
import { SideLeaderboard } from "./SideLeaderboard";
import { ChatPanel } from "./ChatPanel";
import { LeaveButton } from "./LeaveButton";
import { sfx } from "@/lib/party/audio";
import { CircleDot, Trophy } from "lucide-react";

export type GameProps = {
  room: Room;
  round: Round;
  me: Player;
  players: Player[];
  isHost: boolean;
  onAdvance: () => void;
  votes: import("@/lib/party/hooks").PlayerVote[];
};

function getRoundParticipantIds(round: Round, players: Player[]) {
  const raw = round.config?.participantIds;
  if (Array.isArray(raw)) {
    const ids = raw.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length > 0) return ids;
  }
  return activePlayers(players).map((p) => p.id);
}

export function useRoundLifecycle(props: GameProps) {
  const remaining = useCountdown(props.round.ends_at, props.round.started_at);
  const subs = useSubmissions(props.round.id);
  const storedIds = useMemo(
    () => getRoundParticipantIds(props.round, props.players),
    [props.round, props.players],
  );
  // Union: stored snapshot + anyone currently active + me. This prevents a
  // non-host who was missing from the host's snapshot from being flipped to
  // "results" the moment the host submits.
  const participantIds = useMemo(() => {
    const set = new Set<string>(storedIds);
    for (const p of activePlayers(props.players)) set.add(p.id);
    set.add(props.me.id);
    return Array.from(set);
  }, [storedIds, props.players, props.me.id]);
  const participantIdSet = useMemo(() => new Set(participantIds), [participantIds]);


  const mySub = subs.find((s) => s.player_id === props.me.id);
  const activeCount = participantIds.length;
  const activeSubsCount = subs.filter((s) => participantIdSet.has(s.player_id)).length;
  const allSubmitted = activeCount > 0 && activeSubsCount >= activeCount;
  const timeUp = remaining === 0;
  const phase: "playing" | "results" =
    (allSubmitted || timeUp) && props.round.status !== "done" ? "results" : "playing";

  const prevPhaseRef = useRef<typeof phase>(phase);
  const prevRemainRef = useRef<number>(remaining);
  useEffect(() => {
    if (prevPhaseRef.current === "playing" && phase === "results") sfx.timeup();
    prevPhaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    if (phase !== "playing") return;
    if (prevRemainRef.current > 3 && remaining <= 3 && remaining > 0) sfx.countdown();
    if (remaining !== prevRemainRef.current && remaining > 0 && remaining <= 3) sfx.countdown();
    prevRemainRef.current = remaining;
  }, [remaining, phase]);

  useEffect(() => {
    if (!props.isHost) return;
    if (phase !== "results") return;
    if (props.round.status === "scoring" || props.round.status === "done") return;

    async function tallyScores() {
      const { data: lock } = await supabase
        .from("rounds")
        .update({ status: "scoring" })
        .eq("id", props.round.id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (!lock) return;

      const submittedIds = new Set(subs.map((s) => s.player_id));
      const missingIds = participantIds.filter((id) => !submittedIds.has(id));
      for (const playerId of missingIds) {
        const p = props.players.find((player) => player.id === playerId);
        await supabase.from("submissions").insert({
          round_id: props.round.id,
          player_id: playerId,
          points: 0,
          payload: { auto: true, reason: p?.kicked ? "kicked" : "timeout" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
      for (const s of subs) {
        if (!participantIdSet.has(s.player_id)) continue;
        const p = props.players.find((player) => player.id === s.player_id);
        if (!p || p.kicked) continue;
        const pts = s.points ?? 0;
        if (pts > 0) {
          await supabase.from("players").update({ score: p.score + pts }).eq("id", p.id);
        }
      }
    }
    void tallyScores();
  }, [phase, props.isHost, props.round.id, props.round.status, props.players, subs, participantIds, participantIdSet]);

  // Auto-advance timer if setting enabled
  const autoAdvance = props.room.settings?.autoAdvance ?? false;
  const intermission = Math.max(2, props.room.settings?.intermissionSec ?? 4);
  const advancedRef = useRef(false);
  useEffect(() => { advancedRef.current = false; }, [props.round.id]);
  useEffect(() => {
    if (!props.isHost || !autoAdvance) return;
    if (phase !== "results") return;
    if (props.round.status !== "scoring") return;
    if (advancedRef.current) return;
    const t = setTimeout(() => {
      advancedRef.current = true;
      props.onAdvance();
    }, intermission * 1000);
    return () => clearTimeout(t);
  }, [phase, props.round.status, props.isHost, autoAdvance, intermission, props]);

  return {
    remaining, subs, mySub, phase,
    gameType: props.round.game_type as GameType,
    activeCount, activeSubsCount,
  };
}

export function RoundShell({
  props, children, results,
}: {
  props: GameProps;
  children: React.ReactNode;
  results?: React.ReactNode;
}) {
  const { remaining, phase, activeCount, activeSubsCount } = useRoundLifecycle(props);
  const gameType = props.round.game_type as GameType;
  const meta = GAME_META[gameType];
  const isLastRound = props.room.current_round >= props.room.game_sequence.length;
  const overrideDur = props.room.settings?.roundDurationSec;
  const totalDur = overrideDur && overrideDur > 0 ? overrideDur : meta.durationSec;
  const autoAdvance = props.room.settings?.autoAdvance ?? false;

  // Launch grace: delay actual gameplay start so all clients get a synced "get ready" moment.
  const launchGraceMs = Math.max(
    0,
    Number((props.round.config as { launchGraceMs?: number })?.launchGraceMs ?? 1000),
  );
  const startedAtMs = useMemo(
    () => new Date(props.round.started_at).getTime(),
    [props.round.started_at],
  );
  const serverNow = useSyncedServerNowMs(100);
  const graceRemainingMs = Math.max(0, startedAtMs + launchGraceMs - serverNow);
  const inGrace = phase === "playing" && graceRemainingMs > 0;
  const graceSec = Math.ceil(graceRemainingMs / 1000);

  useEffect(() => { sfx.start(); }, [props.round.id]);


  return (
    <main className="min-h-dvh flex flex-col">
      {/* Sticky top bar with header + leave */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 px-3 sm:px-4 pt-3">
          <div className="flex-1 min-w-0">
            <RoundHeader
              roundNumber={props.round.round_number}
              totalRounds={props.room.game_sequence.length}
              gameType={gameType}
              meta={{ name: meta.name, tagline: meta.tagline, durationSec: totalDur }}
              remaining={remaining}
              phase={phase}
              submittedCount={activeSubsCount}
              totalPlayers={activeCount}
            />
          </div>
          <div className="shrink-0 pb-3">
            <LeaveButton room={props.room} me={props.me} players={props.players} compact />
          </div>
        </div>
      </div>

      {/* Main grid: game + side rail (leaderboard + chat) */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid gap-4 px-3 sm:px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 pb-28 lg:pb-4 relative">
          {phase === "playing" ? (
            inGrace ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center rounded-2xl bg-card/40 border border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Preparati…</div>
                <div
                  key={graceSec}
                  className="text-8xl font-black text-primary text-glow tabular-nums animate-bounce-in"
                >
                  {graceSec}
                </div>
                <div className="mt-4 text-sm font-bold text-muted-foreground">Il round parte tra un attimo</div>
              </div>
            ) : (
              children
            )
          ) : results}



          {phase === "results" && (
            <div className="mt-6 max-w-md mx-auto">
              {props.isHost ? (
                autoAdvance ? (
                  <div className="rounded-2xl bg-secondary/40 border border-border text-center py-4 text-sm font-bold text-muted-foreground animate-pulse">
                    Prossimo round tra pochi secondi…
                  </div>
                ) : (
                  <button
                    onClick={() => { sfx.results(); props.onAdvance(); }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent text-accent-foreground text-xl font-black py-5 shadow-neon-yellow animate-pulse-glow hover:scale-[1.01] active:scale-95 transition min-h-14"
                  >
                    {isLastRound ? <><Trophy className="h-5 w-5" /> Vedi classifica finale</> : <><CircleDot className="h-5 w-5" /> Prossimo round</>}
                  </button>
                )
              ) : (
                autoAdvance ? (
                  <div className="rounded-2xl bg-secondary/40 border border-border text-center py-4 text-sm font-bold text-muted-foreground animate-pulse">
                    Prossimo round tra pochi secondi…
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground font-bold py-3">
                    L'host sta scegliendo il prossimo round…
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Desktop side rail */}
        <aside className="hidden lg:grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 h-[calc(100dvh-8rem)] sticky top-24">
          <SideLeaderboard room={props.room} players={props.players} meId={props.me.id} me={props.me} votes={props.votes} variant="sidebar" />
          <ChatPanel room={props.room} me={props.me} players={props.players} variant="sidebar" />
        </aside>
      </div>

      {/* Mobile / tablet drawers */}
      <div className="lg:hidden">
        <SideLeaderboard room={props.room} players={props.players} meId={props.me.id} me={props.me} votes={props.votes} variant="drawer" />
        <ChatPanel room={props.room} me={props.me} players={props.players} variant="drawer" />
      </div>
    </main>
  );
}
