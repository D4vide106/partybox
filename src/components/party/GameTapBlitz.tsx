import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, scoreTapBlitz } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameTapBlitz(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const [taps, setTaps] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submitted = !!mySub;

  // Auto-submit when time is up
  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(taps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(finalTaps: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const points = scoreTapBlitz(finalTaps);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { taps: finalTaps },
      points,
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="⚡"
          gameName="TapBlitz"
          subtitle="Vince chi tocca di più"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const taps = (s.payload as { taps?: number }).taps ?? 0;
            const dur = GAME_META.tapblitz.durationSec || 1;
            const rate = (taps / dur).toFixed(1);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "TAP", value: `${taps}` },
              metrics: [{ icon: "⚡", label: "Tap/s", value: rate }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Tocca il pulsante il più velocemente possibile!</div>
        <div className="text-8xl font-black tabular-nums text-primary text-glow mb-6">{taps}</div>
        <button
          disabled={submitted}
          onClick={() => setTaps((t) => t + 1)}
          className="w-full aspect-square max-w-sm mx-auto rounded-full bg-primary text-primary-foreground text-4xl font-black shadow-neon active:scale-90 transition-transform disabled:opacity-40"
        >
          {submitted ? "✅ Inviato" : "TAP!"}
        </button>
        {!submitted && (
          <button
            onClick={() => submit(taps)}
            className="mt-4 rounded-full bg-secondary px-6 py-2 text-sm font-bold"
          >
            Invia ora
          </button>
        )}
      </div>
    </RoundShell>
  );
}
