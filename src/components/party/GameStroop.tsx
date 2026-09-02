import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeStroop, scoreStroop, STROOP_COLORS } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameStroop(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const item = useMemo(() => makeStroop(seed, idx), [seed, idx]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(correct, wrong);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(finalCorrect: number, finalWrong: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { correct: finalCorrect, wrong: finalWrong },
      points: scoreStroop(finalCorrect, finalWrong),
    });
    setSubmitting(false);
  }

  function answer(yes: boolean) {
    if (submitted) return;
    if (yes === item.match) { setCorrect((c) => c + 1); setFlash("ok"); }
    else { setWrong((w) => w + 1); setFlash("bad"); }
    setIdx((i) => i + 1);
    setTimeout(() => setFlash(null), 120);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🌈"
          gameName="Stroop"
          subtitle="Cervello contro colore"
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
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 75 ? "good" : "default" },
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">
          La parola descrive il <b>colore in cui è scritta</b>?
        </div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-4">
          Colori validi: {STROOP_COLORS.map((c) => c.name).join(" · ")}
        </div>
        <div className={`rounded-3xl p-10 mb-4 transition-colors ${flash === "ok" ? "bg-green-500/30" : flash === "bad" ? "bg-red-500/30" : "bg-card"}`}>
          <div
            className="text-6xl font-black tracking-wider"
            style={{ color: item.hex, textShadow: `0 0 30px ${item.hex}66` }}
          >
            {item.word}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            disabled={submitted}
            className="rounded-2xl bg-green-500 text-white text-2xl font-black py-6 shadow-neon disabled:opacity-40 active:scale-95"
          >
            ✅ SÌ
          </button>
          <button
            onClick={() => answer(false)}
            disabled={submitted}
            className="rounded-2xl bg-red-500 text-white text-2xl font-black py-6 shadow-neon disabled:opacity-40 active:scale-95"
          >
            ❌ NO
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm font-bold">
          <span className="text-green-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
