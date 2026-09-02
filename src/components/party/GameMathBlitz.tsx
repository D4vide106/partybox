import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeMathProblem, scoreMathBlitz } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameMathBlitz(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const problem = useMemo(() => makeMathProblem(seed, idx), [seed, idx]);

  useEffect(() => { inputRef.current?.focus(); }, [idx]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(correct, wrong);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(finalCorrect: number, finalWrong: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const points = scoreMathBlitz(finalCorrect, finalWrong);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { correct: finalCorrect, wrong: finalWrong },
      points,
    });
    setSubmitting(false);
  }

  function tryAnswer() {
    if (submitted) return;
    const n = parseInt(input, 10);
    if (isNaN(n)) return;
    if (n === problem.answer) {
      setCorrect((c) => c + 1);
      setFlash("ok");
    } else {
      setWrong((w) => w + 1);
      setFlash("bad");
    }
    setInput("");
    setIdx((i) => i + 1);
    setTimeout(() => setFlash(null), 150);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🧮"
          gameName="MathBlitz"
          subtitle="Corrette − errori × 0.9 = punti"
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
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 80 ? "good" : "default" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Rispondi più veloce che puoi!</div>
        <div className={`rounded-3xl p-8 mb-4 transition-colors ${flash === "ok" ? "bg-green-500/30" : flash === "bad" ? "bg-red-500/30" : "bg-card"}`}>
          <div className="text-6xl font-black tabular-nums text-primary text-glow mb-4">
            {problem.text} = ?
          </div>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            disabled={submitted}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryAnswer()}
            className="w-full bg-transparent border-b-2 border-border text-5xl font-black text-center outline-none focus:border-primary tabular-nums"
            placeholder="?"
          />
        </div>
        <button
          onClick={tryAnswer}
          disabled={submitted || !input}
          className="w-full rounded-2xl bg-primary text-primary-foreground text-lg font-black py-4 shadow-neon disabled:opacity-40"
        >
          Invia
        </button>
        <div className="mt-4 flex justify-center gap-6 text-sm font-bold">
          <span className="text-green-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
