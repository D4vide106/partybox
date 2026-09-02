import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeSimonSeq, scoreSimon } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const COLORS = [
  { bg: "bg-red-500", glow: "shadow-[0_0_40px_rgba(239,68,68,0.9)]" },
  { bg: "bg-green-500", glow: "shadow-[0_0_40px_rgba(34,197,94,0.9)]" },
  { bg: "bg-blue-500", glow: "shadow-[0_0_40px_rgba(59,130,246,0.9)]" },
  { bg: "bg-yellow-400", glow: "shadow-[0_0_40px_rgba(250,204,21,0.9)]" },
];

export function GameSimon(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const startedAt = useMemo(() => new Date(props.round.started_at ?? Date.now()).getTime(), [props.round.started_at]);
  const full = useMemo(() => makeSimonSeq(seed, 12), [seed]);

  const [level, setLevel] = useState(1);
  const [userIdx, setUserIdx] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [failed, setFailed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  // playback of current sequence at each level
  useEffect(() => {
    if (failed || submitted) return;
    setShowing(true);
    setUserIdx(0);
    const seq = full.slice(0, level);
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 600));
      for (const c of seq) {
        if (cancelled) return;
        setFlash(c);
        await new Promise((r) => setTimeout(r, 450));
        setFlash(null);
        await new Promise((r) => setTimeout(r, 180));
      }
      if (!cancelled) setShowing(false);
    })();
    return () => { cancelled = true; };
  }, [level, failed, submitted, full]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { streak },
        points: scoreSimon(streak),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function tap(c: number) {
    if (showing || failed || submitted) return;
    const seq = full.slice(0, level);
    if (seq[userIdx] === c) {
      setFlash(c); setTimeout(() => setFlash(null), 120);
      const nextIdx = userIdx + 1;
      if (nextIdx >= seq.length) {
        setStreak(level);
        setLevel((l) => Math.min(l + 1, full.length));
      } else {
        setUserIdx(nextIdx);
      }
    } else {
      setFailed(true);
    }
  }

  // elapsed for style only
  void startedAt;

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🟩"
          gameName="Simon"
          subtitle="Livello massimo raggiunto"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const st = (s.payload as { streak?: number }).streak ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Livello",
                value: `${st}`,
                tone: st >= 6 ? "good" : st === 0 ? "bad" : "default",
              },
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">
          {failed ? "❌ Sbagliato! Attendi la fine…" : showing ? "👀 Memorizza la sequenza" : `Tocca ${level} colori`}
        </div>
        <div className="text-3xl font-black text-primary mb-4">Livello {level}</div>
        <div className="grid grid-cols-2 gap-3 aspect-square">
          {COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={showing || failed || submitted}
              className={`rounded-3xl transition-all ${c.bg} ${flash === i ? c.glow + " scale-95 brightness-150" : "opacity-70 hover:opacity-100"}`}
            />
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Streak max: <b>{streak}</b></div>
      </div>
    </RoundShell>
  );
}
