import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, makeRhythmBeats, scoreRhythmTap, type RhythmBeat } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const DURATION_MS = GAME_META.rhythmtap.durationSec * 1000;
const CYCLE_MS = 1400; // cursor left→right→left
const TARGET_WINDOW_MS = 220;

export function GameRhythmTap(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const beats = useMemo<RhythmBeat[]>(() => makeRhythmBeats(seed, DURATION_MS), [seed]);
  const consumed = useRef<Set<number>>(new Set());
  const [perfect, setPerfect] = useState(0);
  const [good, setGood] = useState(0);
  const [miss, setMiss] = useState(0);
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState<"perfect" | "good" | "miss" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [submitted]);

  const elapsed = Math.max(0, Date.now() - startedAt);
  const cyclePos = (elapsed % CYCLE_MS) / CYCLE_MS;
  const cursorX = cyclePos < 0.5 ? cyclePos * 2 : (1 - cyclePos) * 2;
  void tick;

  // Auto-miss beats that pass the window
  useEffect(() => {
    if (submitted) return;
    beats.forEach((b, i) => {
      if (consumed.current.has(i)) return;
      if (elapsed > b.at + TARGET_WINDOW_MS) {
        consumed.current.add(i);
        setMiss((m) => m + 1);
      }
    });
  }, [elapsed, beats, submitted]);

  function onTap() {
    if (submitted) return;
    let best = -1;
    let bestDist = Infinity;
    beats.forEach((b, i) => {
      if (consumed.current.has(i)) return;
      const d = Math.abs(elapsed - b.at);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (best === -1 || bestDist > TARGET_WINDOW_MS + 120) {
      setMiss((m) => m + 1);
      setFlash("miss");
      setTimeout(() => setFlash(null), 200);
      return;
    }
    consumed.current.add(best);
    if (bestDist < 90) { setPerfect((p) => p + 1); setFlash("perfect"); }
    else { setGood((g) => g + 1); setFlash("good"); }
    setTimeout(() => setFlash(null), 200);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { perfect, good, miss },
        points: scoreRhythmTap(perfect, good, miss),
      });
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="⏱️"
          gameName="RhythmTap"
          subtitle="Chi ha centrato più beat"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { perfect?: number; good?: number; miss?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Perfect", value: `${pl.perfect ?? 0}`, tone: (pl.perfect ?? 0) > 5 ? "good" : "default" },
              metrics: [
                { icon: "✨", label: "Good", value: `${pl.good ?? 0}` },
                { icon: "❌", label: "Miss", value: `${pl.miss ?? 0}`, tone: "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Tocca quando il cursore entra nella zona centrale</div>
        <div className="grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-widest mb-3">
          <div className="rounded-full bg-emerald-500/15 text-emerald-300 py-1">Perfect {perfect}</div>
          <div className="rounded-full bg-sky-500/15 text-sky-300 py-1">Good {good}</div>
          <div className="rounded-full bg-rose-500/15 text-rose-300 py-1">Miss {miss}</div>
        </div>
        <div className="relative h-16 rounded-full bg-card border border-border overflow-hidden mb-6">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 rounded-full bg-primary/25 border-x border-primary" />
          <div
            className="absolute top-1/2 h-10 w-10 rounded-full bg-accent shadow-neon-yellow -translate-y-1/2"
            style={{ left: `calc(${cursorX * 100}% - 20px)` }}
          />
        </div>
        <button
          disabled={submitted}
          onClick={onTap}
          className={`w-full aspect-square max-w-[16rem] mx-auto rounded-full text-3xl font-black text-white transition-all active:scale-95 disabled:opacity-40 ${
            flash === "perfect" ? "bg-emerald-500 scale-105" :
            flash === "good" ? "bg-sky-500" :
            flash === "miss" ? "bg-rose-500" :
            "bg-primary shadow-neon"
          }`}
        >
          {flash === "perfect" ? "PERFECT!" : flash === "good" ? "GOOD" : flash === "miss" ? "MISS" : "TAP"}
        </button>
      </div>
    </RoundShell>
  );
}
