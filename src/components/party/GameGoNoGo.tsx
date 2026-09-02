import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, makeGoNoGoStream, scoreGoNoGo, type GoNoGoStim } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const STIM_MS = 500;
const WINDOW_MS = 700;

export function GameGoNoGo(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.gonogo.durationSec) * 1000;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const stims = useMemo<GoNoGoStim[]>(() => makeGoNoGoStream(seed, durationMs), [seed, durationMs]);
  const consumed = useRef<Set<number>>(new Set());
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, [submitted]);
  void tick;

  const elapsed = Math.max(0, Date.now() - startedAt);
  const activeIdx = stims.findIndex((s, i) => !consumed.current.has(i) && elapsed >= s.at && elapsed < s.at + STIM_MS);
  const active = activeIdx >= 0 ? stims[activeIdx]! : null;

  useEffect(() => {
    if (submitted) return;
    stims.forEach((s, i) => {
      if (consumed.current.has(i)) return;
      if (elapsed > s.at + WINDOW_MS) {
        consumed.current.add(i);
        if (s.go) setMisses((m) => m + 1);
      }
    });
  }, [elapsed, stims, submitted]);

  function tap() {
    if (submitted || !active) {
      if (!active) { setFalseAlarms((f) => f + 1); setFlash("bad"); setTimeout(() => setFlash(null), 150); }
      return;
    }
    consumed.current.add(activeIdx);
    if (active.go) { setHits((h) => h + 1); setFlash("ok"); }
    else { setFalseAlarms((f) => f + 1); setFlash("bad"); }
    setTimeout(() => setFlash(null), 150);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { hits, misses, falseAlarms },
        points: scoreGoNoGo(hits, misses, falseAlarms),
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
          gameEmoji="🚦"
          gameName="GoNoGo"
          subtitle="Verde = tap · Rosso = fermo!"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { hits?: number; misses?: number; falseAlarms?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Hit", value: `${p.hits ?? 0}`, tone: "good" },
              metrics: [
                { icon: "😴", label: "Persi", value: `${p.misses ?? 0}` },
                { icon: "🚫", label: "False", value: `${p.falseAlarms ?? 0}`, tone: "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center select-none">
        <div className="grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-widest mb-3">
          <div className="rounded-full bg-emerald-500/15 text-emerald-300 py-1">Hit {hits}</div>
          <div className="rounded-full bg-amber-500/15 text-amber-300 py-1">Miss {misses}</div>
          <div className="rounded-full bg-rose-500/15 text-rose-300 py-1">False {falseAlarms}</div>
        </div>
        <button
          disabled={submitted}
          onClick={tap}
          className={`w-full aspect-square max-w-[18rem] mx-auto rounded-3xl text-4xl font-black text-white transition-all active:scale-95 disabled:opacity-40 ${
            flash === "ok" ? "bg-emerald-500 scale-105" :
            flash === "bad" ? "bg-rose-500" :
            active ? (active.go ? "bg-emerald-500 shadow-neon" : "bg-rose-500") :
            "bg-card border border-border text-muted-foreground"
          }`}
        >
          {active ? (active.go ? "TAP!" : "STOP") : "…"}
        </button>
        <div className="mt-3 text-sm text-muted-foreground">Tocca <b className="text-emerald-400">SOLO</b> quando è verde</div>
      </div>
    </RoundShell>
  );
}
