import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreStackTower } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const BOARD_W = 300;
const BOARD_H = 420;
const BLOCK_H = 22;

type Block = { x: number; width: number };

export function GameStackTower(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const [stack, setStack] = useState<Block[]>([{ x: BOARD_W / 2 - 70, width: 140 }]);
  const [cur, setCur] = useState<Block>({ x: 0, width: 140 });
  const [dir, setDir] = useState<1 | -1>(1);
  const [gameOver, setGameOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const rafRef = useRef<number | null>(null);
  const submitted = !!mySub;
  const speedRef = useRef(2.6);

  useEffect(() => {
    if (submitted || gameOver) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      setCur((c) => {
        let nx = c.x + dir * speedRef.current * (dt / 16.6);
        let nd = dir;
        if (nx <= 0) { nx = 0; nd = 1; }
        if (nx + c.width >= BOARD_W) { nx = BOARD_W - c.width; nd = -1; }
        if (nd !== dir) setDir(nd);
        return { x: nx, width: c.width };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [dir, submitted, gameOver]);

  function drop() {
    if (submitted || gameOver) return;
    const top = stack[stack.length - 1]!;
    const overlapStart = Math.max(cur.x, top.x);
    const overlapEnd = Math.min(cur.x + cur.width, top.x + top.width);
    const overlap = overlapEnd - overlapStart;
    if (overlap <= 4) {
      setGameOver(true);
      return;
    }
    setStack((s) => [...s, { x: overlapStart, width: overlap }]);
    setCur({ x: 0, width: overlap });
    speedRef.current = Math.min(6, speedRef.current + 0.15);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const layers = stack.length - 1; // exclude initial base
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { layers },
        points: scoreStackTower(layers),
      });
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const visibleStack = stack.slice(-Math.floor((BOARD_H - BLOCK_H * 2) / BLOCK_H));
  const layers = stack.length - 1;

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🧱"
          gameName="StackTower"
          subtitle="La torre più alta vince"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const l = (s.payload as { layers?: number }).layers ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Piani", value: `${l}`, tone: l >= 10 ? "good" : "default" },
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-2 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Tocca per fermare il blocco: allinealo per costruire!</div>
        <div className="text-3xl font-black text-primary mb-2 tabular-nums">🧱 {layers}</div>
        <div
          onClick={drop}
          className="relative mx-auto rounded-2xl bg-card border border-border overflow-hidden cursor-pointer"
          style={{ width: BOARD_W, height: BOARD_H }}
        >
          {/* moving block */}
          {!gameOver && !submitted && (
            <div
              className="absolute bg-accent shadow-neon-yellow rounded-md"
              style={{
                left: cur.x, top: BLOCK_H * 0.5,
                width: cur.width, height: BLOCK_H,
              }}
            />
          )}
          {/* stack */}
          {visibleStack.map((b, i) => (
            <div
              key={i}
              className="absolute bg-primary rounded-md"
              style={{
                left: b.x,
                bottom: i * BLOCK_H,
                width: b.width, height: BLOCK_H,
              }}
            />
          ))}
          {gameOver && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-white font-black text-xl">
              💥 Fine torre
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Un errore = round finito</div>
      </div>
    </RoundShell>
  );
}
