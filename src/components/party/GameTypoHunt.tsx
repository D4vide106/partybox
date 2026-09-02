import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreTypoHunt, GAME_META } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameTypoHunt(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { words: string[]; typoIndex: number; correct: string };
  const [pick, setPick] = useState<number | null>(null);
  const [t0] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  async function choose(i: number) {
    if (submitted || pick !== null) return;
    setPick(i);
    setSubmitting(true);
    const elapsedMs = Date.now() - t0;
    const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.typohunt.durationSec) * 1000;
    const correct = i === cfg.typoIndex;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { pickIndex: i, pickWord: cfg.words[i], correct },
      points: scoreTypoHunt(correct, elapsedMs, durationMs),
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting || pick !== null) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { pickIndex: -1, correct: false },
        points: 0,
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
          gameEmoji="🔍"
          gameName="TypoHunt"
          subtitle={`Sbagliata: "${cfg.words[cfg.typoIndex]}" → ${cfg.correct}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { pickWord?: string; correct?: boolean };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: p.correct
                ? { label: "Trovata", value: "✓", tone: "good" }
                : { label: "Scelta", value: p.pickWord ?? "—", tone: "bad" },
            };
          })}
        />
      }
    >
      <div className="max-w-lg mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-4">Clicca la parola scritta MALE</div>
        <div className="flex flex-wrap gap-2 justify-center text-xl font-bold leading-relaxed">
          {cfg.words.map((w, i) => (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={submitted || pick !== null}
              className={`rounded-xl px-3 py-2 transition-all active:scale-95 ${
                pick === i
                  ? i === cfg.typoIndex
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-card border border-border hover:bg-card/70"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </RoundShell>
  );
}
