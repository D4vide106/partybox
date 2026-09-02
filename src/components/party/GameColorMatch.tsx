import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeColorMatch, scoreColorMatch } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameColorMatch(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const startedAt = useMemo(() => new Date(props.round.started_at ?? Date.now()).getTime(), [props.round.started_at]);
  const durationMs = 25000;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const q = makeColorMatch(seed, idx);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
      const perCorrect = scoreColorMatch(true, elapsed, durationMs);
      const points = Math.max(0, correct * perCorrect - wrong * perCorrect);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points,
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function choose(i: number) {
    if (answered || submitted) return;
    setPick(i);
    setAnswered(true);
    if (i === q.answer) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
    setTimeout(() => { setAnswered(false); setPick(null); setIdx((n) => n + 1); }, 700);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🖌️"
          gameName="ColorMatch"
          subtitle="Chi legge meglio i codici HEX"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { correct?: number; wrong?: number };
            const c = pl.correct ?? 0;
            const w = pl.wrong ?? 0;
            const tot = c + w;
            const acc = tot > 0 ? Math.round((c / tot) * 100) : 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Corrette", value: `${c}` },
              metrics: [
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 70 ? "good" : "default" },
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Quale HEX corrisponde a questo colore?</div>
        <div
          className="w-full h-40 rounded-3xl mb-6 shadow-neon"
          style={{ background: q.hex }}
        />
        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => {
            const isRight = answered && i === q.answer;
            const isPick = pick === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered || submitted}
                className={`rounded-2xl py-4 font-mono font-black text-lg transition-all
                  ${isRight ? "bg-green-500 text-white scale-105"
                    : isPick ? "bg-red-500 text-white"
                    : "bg-card hover:bg-card/80"}`}
              >
                {c.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 text-sm">✅ <b>{correct}</b></div>
      </div>
    </RoundShell>
  );
}
