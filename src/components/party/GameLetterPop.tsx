import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, makeLetterPopStream, scoreLetterPop, type LetterSpawn } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const LIFE_MS = 1600;

export function GameLetterPop(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.letterpop.durationSec) * 1000;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const stream = useMemo<LetterSpawn[]>(() => makeLetterPopStream(seed, durationMs), [seed, durationMs]);
  const consumed = useRef<Set<number>>(new Set());
  const [vowels, setVowels] = useState(0);
  const [cons, setCons] = useState(0);
  const [missed, setMissed] = useState(0);
  const [tick, setTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, [submitted]);
  void tick;

  const elapsed = Math.max(0, Date.now() - startedAt);

  useEffect(() => {
    if (submitted) return;
    stream.forEach((s, i) => {
      if (consumed.current.has(i)) return;
      if (elapsed > s.at + LIFE_MS) {
        consumed.current.add(i);
        if (s.vowel) setMissed((m) => m + 1);
      }
    });
  }, [elapsed, stream, submitted]);

  function pop(i: number, s: LetterSpawn) {
    if (submitted || consumed.current.has(i)) return;
    consumed.current.add(i);
    if (s.vowel) setVowels((v) => v + 1);
    else setCons((c) => c + 1);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { vowels, cons, missed },
        points: scoreLetterPop(vowels, cons, missed),
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
          gameEmoji="🅰️"
          gameName="LetterPop"
          subtitle="Vocali colpite, consonanti evitate"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { vowels?: number; cons?: number; missed?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Vocali", value: `${p.vowels ?? 0}`, tone: "good" },
              metrics: [
                { icon: "🚫", label: "Cons.", value: `${p.cons ?? 0}`, tone: "muted" },
                { icon: "😴", label: "Perse", value: `${p.missed ?? 0}` },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Tocca <b className="text-emerald-400">SOLO le vocali</b> (A E I O U)</div>
        <div className="grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-widest mb-3">
          <div className="rounded-full bg-emerald-500/15 text-emerald-300 py-1">Vocali {vowels}</div>
          <div className="rounded-full bg-rose-500/15 text-rose-300 py-1">Cons. {cons}</div>
          <div className="rounded-full bg-amber-500/15 text-amber-300 py-1">Perse {missed}</div>
        </div>
        <div className="relative w-full aspect-square rounded-2xl bg-card border border-border overflow-hidden">
          {stream.map((s, i) => {
            if (consumed.current.has(i)) return null;
            if (elapsed < s.at || elapsed > s.at + LIFE_MS) return null;
            const age = (elapsed - s.at) / LIFE_MS;
            const scale = 0.8 + Math.sin(age * Math.PI) * 0.3;
            return (
              <button
                key={i}
                onClick={() => pop(i, s)}
                style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%,-50%) scale(${scale})` }}
                className={`absolute w-14 h-14 rounded-full text-2xl font-black text-white shadow-lg transition-transform active:scale-90 ${
                  s.vowel ? "bg-emerald-500" : "bg-rose-500"
                }`}
              >
                {s.letter}
              </button>
            );
          })}
        </div>
      </div>
    </RoundShell>
  );
}
