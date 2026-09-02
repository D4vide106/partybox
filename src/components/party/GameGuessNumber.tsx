import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeGuessTarget, scoreGuessNumber } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameGuessNumber(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const target = useMemo(() => makeGuessTarget(seed), [seed]);
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(100);
  const [guess, setGuess] = useState(50);
  const [tries, setTries] = useState(0);
  const [found, setFound] = useState(false);
  const [history, setHistory] = useState<Array<{ g: number; hint: "up" | "down" | "hit" }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  function submitGuess() {
    if (submitted || found) return;
    const t = tries + 1;
    setTries(t);
    if (guess === target) {
      setFound(true);
      setHistory((h) => [...h, { g: guess, hint: "hit" }]);
    } else if (guess < target) {
      setLo(Math.max(lo, guess + 1));
      setHistory((h) => [...h, { g: guess, hint: "up" }]);
      setGuess(Math.floor((Math.max(lo, guess + 1) + hi) / 2));
    } else {
      setHi(Math.min(hi, guess - 1));
      setHistory((h) => [...h, { g: guess, hint: "down" }]);
      setGuess(Math.floor((lo + Math.min(hi, guess - 1)) / 2));
    }
  }

  useEffect(() => {
    if (!found || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);
  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit() {
    setSubmitting(true);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { tries, found, target },
      points: scoreGuessNumber(tries, found),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔢"
          gameName="GuessNumber"
          subtitle="Meno tentativi = più punti"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { tries?: number; found?: boolean; target?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Tentativi", value: `${p.tries ?? 0}`, tone: (p.tries ?? 99) <= 6 ? "good" : "default" },
              note: p.found ? `Numero: ${p.target}` : "Non trovato",
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">Numero segreto tra <b>{lo}</b> e <b>{hi}</b>. Meno tentativi = più punti.</div>
        <div className="text-6xl font-black text-primary tabular-nums mb-4">{guess}</div>
        <input
          type="range"
          min={lo}
          max={hi}
          value={guess}
          disabled={submitted || found}
          onChange={(e) => setGuess(parseInt(e.target.value))}
          className="w-full accent-primary mb-4"
        />
        <button
          onClick={submitGuess}
          disabled={submitted || found}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-black text-lg shadow-neon active:scale-95 disabled:opacity-40"
        >
          {found ? `✅ Trovato in ${tries}!` : `Prova (${tries})`}
        </button>
        {history.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5 justify-center">
            {history.slice(-8).map((h, i) => (
              <li key={i} className={`rounded-full px-2 py-0.5 text-xs font-black ${
                h.hint === "hit" ? "bg-emerald-500/20 text-emerald-300" :
                h.hint === "up" ? "bg-sky-500/20 text-sky-300" :
                "bg-rose-500/20 text-rose-300"
              }`}>
                {h.g} {h.hint === "up" ? "↑" : h.hint === "down" ? "↓" : "✓"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </RoundShell>
  );
}
