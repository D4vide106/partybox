import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCRAMBLE_WORDS, scoreAnagramSprint, scrambleWord, mulberry32 } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameAnagramSprint(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  // Deterministic shuffled order of SCRAMBLE_WORDS indices
  const order = useMemo(() => {
    const r = mulberry32(seed);
    const arr = SCRAMBLE_WORDS.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
    }
    return arr;
  }, [seed]);
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const wordIdx = order[step % order.length]!;
  const current = SCRAMBLE_WORDS[wordIdx]!;
  const scrambled = useMemo(() => scrambleWord(current.word, seed + step * 17), [current.word, seed, step]);

  function submitGuess() {
    if (submitted) return;
    const g = input.trim().toUpperCase();
    if (!g) return;
    if (g === current.word) {
      setCorrect((c) => c + 1);
      setFlash("ok");
    } else {
      setWrong((w) => w + 1);
      setFlash("no");
    }
    setInput("");
    setStep((s) => s + 1);
    setTimeout(() => setFlash(null), 250);
  }

  function skip() {
    if (submitted) return;
    setWrong((w) => w + 1);
    setInput("");
    setStep((s) => s + 1);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreAnagramSprint(correct, wrong),
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
          gameEmoji="🔤"
          gameName="AnagramSprint"
          subtitle="Chi ha risolto più anagrammi"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { correct?: number; wrong?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Giuste", value: `${p.correct ?? 0}`, tone: (p.correct ?? 0) >= 5 ? "good" : "default" },
              metrics: [{ icon: "❌", label: "Errori", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Anagramma #{step + 1}</div>
        <div className="text-5xl sm:text-6xl font-black tracking-widest text-primary mb-2 select-none">{scrambled}</div>
        <div className="text-sm text-muted-foreground mb-4">💡 {current.hint}</div>
        <input
          autoFocus
          value={input}
          disabled={submitted}
          onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-ZÀ-Ú]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submitGuess(); }}
          className={`w-full text-center text-2xl font-black rounded-2xl border py-4 mb-3 outline-none transition-colors ${
            flash === "ok" ? "bg-emerald-500/20 border-emerald-500" :
            flash === "no" ? "bg-rose-500/20 border-rose-500" :
            "bg-card border-border focus:border-primary"
          }`}
        />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={skip} disabled={submitted} className="rounded-2xl bg-secondary text-secondary-foreground py-4 font-black active:scale-95 disabled:opacity-40">Passa</button>
          <button onClick={submitGuess} disabled={submitted} className="rounded-2xl bg-primary text-primary-foreground py-4 font-black shadow-neon active:scale-95 disabled:opacity-40">Invia</button>
        </div>
        <div className="mt-3 text-sm">
          <span className="text-emerald-400 font-black">✓ {correct}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-rose-400 font-black">✗ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
