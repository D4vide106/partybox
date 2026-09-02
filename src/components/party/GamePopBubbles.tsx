import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mulberry32, scorePopBubbles } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

type Bubble = { id: number; x: number; y: number; size: number; bomb: boolean; born: number };

export function GamePopBubbles(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pops, setPops] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const idRef = useRef(0);
  const rndRef = useRef(mulberry32(seed));

  useEffect(() => {
    if (submitted || phase !== "playing") return;
    const t = setInterval(() => {
      const r = rndRef.current;
      const b: Bubble = {
        id: ++idRef.current,
        x: 6 + r() * 88,
        y: 6 + r() * 88,
        size: 44 + Math.floor(r() * 40),
        bomb: r() < 0.18,
        born: Date.now(),
      };
      setBubbles((prev) => [...prev, b]);
    }, 420);
    return () => clearInterval(t);
  }, [submitted, phase]);

  // cleanup old bubbles
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setBubbles((prev) => prev.filter((b) => now - b.born < 1800));
    }, 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { pops, bombs },
        points: scorePopBubbles(pops, bombs),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function tap(b: Bubble) {
    if (submitted) return;
    setBubbles((prev) => prev.filter((x) => x.id !== b.id));
    if (b.bomb) setBombs((n) => n + 1);
    else setPops((n) => n + 1);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🫧"
          gameName="PopBubbles"
          subtitle="Bolle sì, bombe no"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { pops?: number; bombs?: number };
            const p = pl.pops ?? 0;
            const b = pl.bombs ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Bolle", value: `${p}` },
              metrics: [
                { icon: "💣", label: "Bombe", value: `${b}`, tone: b > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-lg mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-2">Tocca le bolle 🫧 — evita le 💣</div>
        <div className="flex justify-center gap-6 mb-2 text-lg font-black">
          <span className="text-sky-400">🫧 {pops}</span>
          <span className="text-red-400">💣 {bombs}</span>
        </div>
        <div className="relative bg-card rounded-3xl overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
          {bubbles.map((b) => (
            <button
              key={b.id}
              onClick={() => tap(b)}
              className={`absolute rounded-full transition-transform animate-bounce-in ${b.bomb ? "bg-gradient-to-br from-red-500 to-black" : "bg-gradient-to-br from-sky-300 to-blue-500"} shadow-lg`}
              style={{
                left: `${b.x}%`, top: `${b.y}%`,
                width: b.size, height: b.size,
                transform: "translate(-50%, -50%)",
              }}
            >
              <span className="text-2xl">{b.bomb ? "💣" : "🫧"}</span>
            </button>
          ))}
        </div>
      </div>
    </RoundShell>
  );
}
