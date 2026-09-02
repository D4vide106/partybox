import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeCountGrid, scoreCountEmoji } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameCountEmoji(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const grid = useMemo(() => makeCountGrid(seed), [seed]);
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(parseInt(guess, 10));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(g: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const n = isNaN(g) ? -1 : g;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess: n },
      points: scoreCountEmoji(n, grid.count),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔢"
          gameName="CountEmoji"
          subtitle={`Risposta esatta: ${grid.count} × ${grid.target}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const g = (s.payload as { guess?: number }).guess ?? -1;
            const diff = g < 0 ? Infinity : Math.abs(g - grid.count);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Scarto",
                value: diff === Infinity ? "—" : `Δ ${diff}`,
                tone: diff === 0 ? "good" : diff > 5 ? "bad" : "default",
              },
              metrics: [
                { icon: "✍️", label: "Risposta", value: g < 0 ? "—" : String(g) },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-3 text-center">
        <div className="text-sm text-muted-foreground mb-2">
          Quante <span className="text-2xl align-middle">{grid.target}</span> vedi?
        </div>
        <div className="rounded-2xl bg-card p-2 mb-4">
          <div className="grid grid-cols-10 gap-0.5 text-2xl sm:text-3xl select-none">
            {grid.emojis.map((e, i) => (
              <div key={i} className="aspect-square flex items-center justify-center">{e}</div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-card p-5">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            disabled={submitted}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(parseInt(guess, 10))}
            placeholder="?"
            className="w-32 bg-transparent border-b-2 border-border text-5xl font-black text-center outline-none focus:border-primary tabular-nums"
          />
          <button
            onClick={() => submit(parseInt(guess, 10))}
            disabled={submitted || !guess}
            className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground text-lg font-black py-4 shadow-neon disabled:opacity-40"
          >
            {submitted ? "✅ Inviato" : "Invia"}
          </button>
        </div>
      </div>
    </RoundShell>
  );
}
