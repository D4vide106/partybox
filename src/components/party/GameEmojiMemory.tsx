import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pickEmojiSequence, scoreEmojiMemory } from "@/lib/party/games";
import { useSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const SEQ_LEN = 6;
const SHOW_MS = 5000;

export function GameEmojiMemory(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;

  const sequence = useMemo(() => pickEmojiSequence(seed, SEQ_LEN), [seed]);
  const choices = useMemo(() => {
    const extra = pickEmojiSequence(seed + 1234, SEQ_LEN + 4);
    const combined = [...sequence, ...extra];
    const unique: string[] = [];
    for (const e of combined) if (!unique.includes(e)) unique.push(e);
    return unique.slice(0, SEQ_LEN + 4);
  }, [seed, sequence]);

  const shuffledChoices = useMemo(() => {
    const arr = [...choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * 9301 + i * 49297) % (i + 1);
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
    }
    return arr;
  }, [choices, seed]);

  // Base "showing" on round start time so everyone sees it, even if they mount late.
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const now = useSyncedServerNowMs();
  const elapsed = Math.max(0, now - startedAt);
  const showing = elapsed < SHOW_MS;
  const showRemaining = Math.max(0, Math.ceil((SHOW_MS - elapsed) / 1000));

  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(picked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function correctCount(guess: string[]) {
    let c = 0;
    for (let i = 0; i < sequence.length; i++) {
      if (guess[i] === sequence[i]) c++;
    }
    return c;
  }

  async function submit(finalPicked: string[]) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const cc = correctCount(finalPicked);
    const points = scoreEmojiMemory(cc, sequence.length);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { picked: finalPicked, correct: cc, total: sequence.length },
      points,
    });
    setSubmitting(false);
  }

  function pick(e: string) {
    if (submitted || picked.length >= sequence.length || showing) return;
    setPicked((p) => [...p, e]);
  }
  function undo() {
    if (submitted) return;
    setPicked((p) => p.slice(0, -1));
  }

  useEffect(() => {
    if (picked.length === sequence.length && !submitted && !submitting) {
      void submit(picked);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked.length]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🧠"
          gameName="EmojiMemory"
          subtitle={`Sequenza: ${sequence.join(" ")}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { correct?: number; total?: number; picked?: string[] };
            const c = pl.correct ?? 0;
            const t = pl.total ?? sequence.length;
            const perfect = c === t;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Corretti",
                value: `${c}/${t}`,
                tone: perfect ? "good" : c === 0 ? "bad" : "default",
              },
              note: (pl.picked ?? []).length ? `Ha scelto: ${(pl.picked ?? []).join(" ")}` : undefined,
              metrics: perfect ? [{ icon: "⭐", label: "Bonus", value: "perfetto", tone: "good" }] : [],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        {showing ? (
          <>
            <div className="text-sm uppercase tracking-widest text-accent font-black mb-3 animate-pulse">
              🧠 MEMORIZZA · {showRemaining}s
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500/30 to-pink-600/30 border-2 border-accent p-8 shadow-neon-yellow animate-pulse-glow">
              <div className="text-6xl sm:text-7xl leading-tight tracking-wider">
                {sequence.join(" ")}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">Fissala bene… tra poco dovrai riprodurla</div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-3">Ripeti la sequenza nell'ordine corretto</div>
            <div className="rounded-3xl bg-card p-5 mb-4 min-h-[80px] text-4xl tracking-wider flex items-center justify-center gap-2">
              {picked.length === 0 ? (
                <span className="text-muted-foreground text-base">Scegli in basso…</span>
              ) : picked.join(" ")}
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {shuffledChoices.map((e, i) => (
                <button
                  key={`${e}-${i}`}
                  onClick={() => pick(e)}
                  disabled={submitted || picked.length >= sequence.length}
                  className="aspect-square rounded-2xl bg-secondary text-3xl hover:scale-110 active:scale-95 transition-transform disabled:opacity-40"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={undo} disabled={submitted || picked.length === 0} className="rounded-full bg-secondary px-4 py-2 text-xs font-bold disabled:opacity-40">↩︎ Indietro</button>
              <div className="text-xs text-muted-foreground self-center font-bold">{picked.length}/{sequence.length}</div>
            </div>
          </>
        )}
      </div>
    </RoundShell>
  );
}

