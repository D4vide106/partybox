import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeCardDeck, scoreCardMatch } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameCardMatch(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const deck = useMemo(() => makeCardDeck(seed, 8), [seed]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState(0);
  const [pairs, setPairs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const total = 8;

  function flip(i: number) {
    if (submitted) return;
    if (flipped.includes(i) || matched.has(i)) return;
    if (flipped.length === 2) return;
    const nf = [...flipped, i];
    setFlipped(nf);
    if (nf.length === 2) {
      const [a, b] = nf;
      if (deck[a!] === deck[b!]) {
        setTimeout(() => {
          setMatched((m) => new Set([...m, a!, b!]));
          setPairs((p) => p + 1);
          setFlipped([]);
        }, 400);
      } else {
        setMisses((m) => m + 1);
        setTimeout(() => setFlipped([]), 700);
      }
    }
  }

  const allFound = pairs === total;
  useEffect(() => {
    if (!allFound || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFound]);

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
      payload: { pairs, misses, allFound },
      points: scoreCardMatch(pairs, misses, allFound),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🃏"
          gameName="CardMatch"
          subtitle="Coppie trovate, meno errori"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { pairs?: number; misses?: number; allFound?: boolean };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Coppie", value: `${p.pairs ?? 0}/8`, tone: p.allFound ? "good" : "default" },
              metrics: [{ icon: "❌", label: "Errori", value: `${p.misses ?? 0}`, tone: "muted" }],
              note: p.allFound ? "Completato!" : undefined,
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Trova le 8 coppie con meno errori possibile</div>
        <div className="flex justify-center gap-4 text-sm font-black mb-3">
          <span className="text-emerald-400">🃏 {pairs}/8</span>
          <span className="text-rose-400">❌ {misses}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {deck.map((emoji, i) => {
            const show = flipped.includes(i) || matched.has(i);
            return (
              <button
                key={i}
                onClick={() => flip(i)}
                disabled={submitted || matched.has(i)}
                className={`aspect-square rounded-xl text-3xl font-black transition-all ${
                  show
                    ? matched.has(i)
                      ? "bg-emerald-500/20 border border-emerald-400"
                      : "bg-primary/30 border border-primary"
                    : "bg-card border border-border hover:bg-card/70"
                }`}
              >
                {show ? emoji : "?"}
              </button>
            );
          })}
        </div>
      </div>
    </RoundShell>
  );
}
