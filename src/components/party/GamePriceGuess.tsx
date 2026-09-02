import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scorePriceGuess } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

type Product = { name: string; emoji: string; price: number; currency: string };

export function GamePriceGuess(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const product = (props.round.config as { product?: Product }).product;
  const [guess, setGuess] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    const n = parseFloat(guess);
    void submit(isNaN(n) ? 0 : n);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(g: number) {
    if (submitted || submitting || !product) return;
    setSubmitting(true);
    const points = scorePriceGuess(g, product.price);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess: g },
      points,
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="💰"
          gameName="PriceGuess"
          subtitle={`${product?.emoji ?? ""} ${product?.name ?? ""} — reale: ${product?.currency}${product?.price}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const g = (s.payload as { guess?: number }).guess ?? 0;
            const diff = Math.abs(g - (product?.price ?? 0));
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Scarto",
                value: `${product?.currency ?? ""}${diff.toFixed(0)}`,
                tone: diff === 0 ? "good" : diff > 100 ? "bad" : "default",
              },
              metrics: [
                { icon: "💬", label: "Prezzo", value: `${product?.currency ?? ""}${g.toFixed(0)}` },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-6 text-center">
        <div className="text-8xl mb-3 animate-bounce-in">{product?.emoji}</div>
        <div className="text-2xl font-black mb-1">{product?.name}</div>
        <div className="text-sm text-muted-foreground mb-6">Quanto costa? Scrivi il prezzo in {product?.currency}</div>
        <div className="rounded-3xl bg-card p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl font-black text-accent">{product?.currency}</span>
            <input
              type="number"
              inputMode="decimal"
              disabled={submitted}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="0"
              className="w-40 bg-transparent border-b-2 border-border text-5xl font-black text-center outline-none focus:border-primary tabular-nums"
            />
          </div>
          <button
            onClick={() => submit(parseFloat(guess) || 0)}
            disabled={submitted || !guess}
            className="w-full rounded-2xl bg-primary text-primary-foreground text-lg font-black py-4 shadow-neon disabled:opacity-40"
          >
            {submitted ? "✅ Risposta inviata" : "Invia"}
          </button>
        </div>
      </div>
    </RoundShell>
  );
}
