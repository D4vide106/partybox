import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Banknote,
  Crown,
  Gavel,
  Landmark,
  Lock,
  Plane,
  ScrollText,
  Shield,
  SkipForward,
  UserRound,
} from "lucide-react";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";
import { activePlayers } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import cityPanels from "@/assets/monopoly-city-panels.jpg";
import {
  MONOPOLY_BOARD,
  buyProperty,
  currentPlayer,
  endTurn,
  finishByTimeout,
  initialState,
  passAuction,
  placeAuctionBid,
  rollAndMove,
  startAuction,
  tileCoordinate,
  totalWorth,
  type MonopolyConfig,
  type MonopolyPlayer,
  type MonopolyState,
  type MonopolyTile,
} from "@/lib/party/monopoly";

type RowState = { id: string; state: MonopolyState; updated_at: string };

export function GameMonopoly(props: GameProps) {
  const life = useRoundLifecycle(props);
  const [row, setRow] = useState<RowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const applyingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("monopoly_games")
        .select("*")
        .eq("round_id", props.round.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (data) setRow({ id: data.id, state: normalizeState(data.state as unknown as MonopolyState), updated_at: data.updated_at });
      setLoading(false);
    }
    void load();
    const ch = supabase
      .channel(`monop-${props.round.id}-${crypto.randomUUID()}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "monopoly_games", filter: `round_id=eq.${props.round.id}` },
        (p) => {
          if (p.eventType === "DELETE") return;
          const n = p.new as { id: string; state: unknown; updated_at: string };
          setRow({ id: n.id, state: normalizeState(n.state as MonopolyState), updated_at: n.updated_at });
        })
      .subscribe((status) => { if (status === "SUBSCRIBED") void load(); });

    const poll = setInterval(() => { void load(); }, 2500);
    return () => { alive = false; clearInterval(poll); void supabase.removeChannel(ch); };
  }, [props.round.id]);

  const active = useMemo(() => activePlayers(props.players), [props.players]);
  const initTriedRef = useRef(false);
  useEffect(() => {
    if (!props.isHost || loading || row || initTriedRef.current) return;
    if (active.length === 0) return;
    initTriedRef.current = true;
    (async () => {
      const { data: existing } = await supabase
        .from("monopoly_games")
        .select("id")
        .eq("round_id", props.round.id)
        .limit(1)
        .maybeSingle();
      if (existing) return;
      const cfg: Partial<MonopolyConfig> = {
        startCash: props.room.settings?.monopolyStartCash ?? 1500,
        goBonus: props.room.settings?.monopolyGoBonus ?? 200,
        jailFee: props.room.settings?.monopolyJailFee ?? 50,
      };
      const st = initialState(active.map((p) => ({ id: p.id, nickname: p.nickname })), cfg);
      const { data, error } = await supabase.from("monopoly_games").insert({
        room_id: props.room.id,
        round_id: props.round.id,
        state: st as unknown as never,
        turn_player_id: st.order[0] ?? null,
      }).select("*").maybeSingle();
      if (error) { initTriedRef.current = false; return; }
      if (data) setRow({ id: data.id, state: normalizeState(data.state as unknown as MonopolyState), updated_at: data.updated_at });
    })();
  }, [props.isHost, loading, row, active, props.room.id, props.round.id, props.room.settings]);

  const state = row?.state ?? null;
  const cur = state ? currentPlayer(state) : null;
  const isMyTurn = !!cur && cur.playerId === props.me.id && !state?.winner;
  const meP = state?.players.find((p) => p.playerId === props.me.id) ?? null;

  const push = useCallback(async (next: MonopolyState) => {
    if (!row || applyingRef.current) return;
    applyingRef.current = true;
    try {
      await supabase.from("monopoly_games").update({
        state: next as unknown as never,
        turn_player_id: currentPlayer(next)?.playerId ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    } finally { applyingRef.current = false; }
  }, [row]);

  const finishedRef = useRef(false);
  useEffect(() => {
    if (!props.isHost || !state || state.winner) return;
    if (life.remaining > 0) return;
    if (finishedRef.current) return;
    finishedRef.current = true;
    void push(finishByTimeout(state));
  }, [life.remaining, state, props.isHost, push]);

  useEffect(() => {
    if (!state?.winner) return;
    if (life.mySub) return;
    const worth = totalWorth(state, props.me.id);
    const points = state.winner === props.me.id ? worth + 500 : Math.max(0, Math.floor(worth / 3));
    void supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      points,
      payload: { worth, winner: state.winner === props.me.id } as never,
    });
  }, [state?.winner, state, life.mySub, props.me.id, props.round.id]);

  const lastUpdateRef = useRef<number>(Date.now());
  useEffect(() => { lastUpdateRef.current = Date.now(); }, [row?.updated_at]);
  useEffect(() => {
    if (!props.isHost || !state || state.winner) return;
    const t = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 45_000 && state.phase !== "auction") void push(endTurn(state));
    }, 5000);
    return () => clearInterval(t);
  }, [props.isHost, state, push]);

  return (
    <RoundShell props={props} results={<ResultsView state={state} meId={props.me.id} />}>
      {loading || !state ? (
        <LoadingBoard />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <Board state={state} meId={props.me.id} rolling={rolling} />
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-1 2xl:flex 2xl:flex-col">
            <TurnPanel
              state={state}
              meP={meP}
              myId={props.me.id}
              isMyTurn={isMyTurn}
              rolling={rolling}
              onRoll={() => {
                if (rolling) return;
                sfx.click();
                setRolling(true);
                window.setTimeout(() => { void push(rollAndMove(state)); }, 520);
                window.setTimeout(() => setRolling(false), 1150);
              }}
              onBuy={() => { sfx.click(); void push(buyProperty(state)); }}
              onAuction={() => { sfx.click(); void push(startAuction(state)); }}
              onBid={() => { sfx.click(); void push(placeAuctionBid(state, props.me.id)); }}
              onPassAuction={() => { sfx.click(); void push(passAuction(state, props.me.id)); }}
              onEnd={() => { sfx.click(); void push(endTurn(state)); }}
              onHostSkip={props.isHost && cur && !isMyTurn ? () => void push(endTurn(state)) : undefined}
            />
            <LogPanel state={state} />
          </div>
        </div>
      )}
    </RoundShell>
  );
}

function normalizeState(state: MonopolyState): MonopolyState {
  return {
    ...state,
    phase: state.phase === "auction" ? "auction" : state.phase,
    auction: state.auction ?? null,
    config: state.config ?? { startCash: 1500, goBonus: 200, jailFee: 50 },
    properties: state.properties?.length
      ? state.properties
      : MONOPOLY_BOARD.filter((t) => t.type === "property" || t.type === "airport").map((t) => ({ tileIdx: t.idx, ownerId: null })),
  };
}

function LoadingBoard() {
  return (
    <div className="grid min-h-[54vh] place-items-center rounded-3xl border border-border bg-card/70 p-8 backdrop-blur">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="h-14 w-14 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <div className="text-sm font-black uppercase tracking-[0.22em]">Preparazione tabellone</div>
      </div>
    </div>
  );
}

function Board({ state, meId, rolling }: { state: MonopolyState; meId: string; rolling: boolean }) {
  const cur = currentPlayer(state);
  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-card/55 p-2 shadow-2xl backdrop-blur sm:p-3 lg:p-4">
      <div className="monopoly-board relative mx-auto aspect-square w-full max-w-[min(100%,980px)] overflow-hidden rounded-2xl border border-border bg-background p-[0.7%] shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="monopoly-board-center absolute inset-[9.55%] overflow-hidden rounded-xl border border-border/70">
          <img src={cityPanels} alt="Panorami città Monopoly" className="absolute inset-0 h-full w-full object-cover opacity-14" loading="lazy" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklab,var(--primary)_20%,transparent),color-mix(in_oklab,var(--background)_94%,transparent)_72%)]" />
          <CenterHUD state={state} rolling={rolling} />
        </div>

        {MONOPOLY_BOARD.map((tile) => {
          const coord = tileCoordinate(tile.idx);
          const owner = state.properties.find((x) => x.tileIdx === tile.idx)?.ownerId ?? null;
          const ownerP = owner ? state.players.find((p) => p.playerId === owner) ?? null : null;
          const here = state.players.filter((p) => p.pos === tile.idx && !p.bankrupt);
          return (
            <div
              key={tile.idx}
              className="absolute p-[0.28%]"
              style={{
                left: `${coord.x * 9.09}%`,
                top: `${coord.y * 9.09}%`,
                width: "9.09%",
                height: "9.09%",
              }}
            >
              <Tile tile={tile} ownerP={ownerP} current={cur?.pos === tile.idx} side={coord.side} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5">
                {here.slice(0, 3).map((p) => <MiniPawn key={p.playerId} player={p} active={p.playerId === meId} />)}
              </div>
            </div>
          );
        })}

        {state.players.filter((p) => !p.bankrupt).map((p, index) => (
          <MovingPawn key={p.playerId} player={p} me={p.playerId === meId} index={index} />
        ))}
      </div>
    </section>
  );
}

function Tile({ tile, ownerP, current, side }: { tile: MonopolyTile; ownerP: MonopolyPlayer | null; current: boolean; side: "top" | "right" | "bottom" | "left" }) {
  const isAsset = tile.type === "property" || tile.type === "airport";
  const isCorner = tile.idx === 0 || tile.idx === 10 || tile.idx === 20 || tile.idx === 30;
  return (
    <article
      className={`relative h-full overflow-hidden rounded-md border border-border bg-card shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),0_3px_12px_rgba(0,0,0,0.34)] transition ${current ? "outline outline-2 outline-primary" : ""}`}
      style={ownerP ? { boxShadow: `inset 0 0 0 2px ${ownerP.color}` } : undefined}
    >
      <div className="h-full w-full">
        {isCorner ? <CornerTile tile={tile} />
          : isAsset ? <AssetTile tile={tile} ownerP={ownerP} side={side} />
          : <SpecialTile tile={tile} />}
      </div>
    </article>
  );
}

function AssetTile({ tile, ownerP, side }: { tile: MonopolyTile; ownerP: MonopolyPlayer | null; side: "top" | "right" | "bottom" | "left" }) {
  const isVertical = side === "left" || side === "right";
  return (
    <div className="grid h-full grid-rows-[6px_minmax(0,1fr)_18px] bg-card">
      <div style={{ backgroundColor: tile.color }} />
      <div className="grid min-h-0 place-items-center px-0.5 text-center">
        <div className="min-w-0">
          <div className={`${isVertical ? "text-[6.5px] sm:text-[7.5px]" : "text-[7px] sm:text-[8px] md:text-[9px]"} line-clamp-2 font-black uppercase leading-tight text-foreground`}>{tile.name}</div>
          <div className="mt-0.5 text-[7px] font-black tabular-nums text-muted-foreground sm:text-[8px]">${tile.price}</div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background/30">
        {tile.type === "airport"
          ? <Plane className="h-3 w-3 text-muted-foreground sm:h-3.5 sm:w-3.5" />
          : tile.country && <FlagDot country={tile.country} label={tile.countryName ?? tile.country} />}
      </div>
      {ownerP && <div className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-card" style={{ backgroundColor: ownerP.color }} />}
    </div>
  );
}

function SpecialTile({ tile }: { tile: MonopolyTile }) {
  const Icon = tile.type === "tax" ? Banknote : Gavel;
  const tint = tile.type === "tax" ? "#f43f5e" : "#a78bfa";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 bg-secondary/32 px-0.5 py-1 text-center">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: tint }} />
      <div className="line-clamp-2 text-[7px] font-black uppercase leading-tight text-foreground/85 sm:text-[8px]">{tile.name}</div>
      {tile.taxAmount && <div className="text-[8px] font-black tabular-nums" style={{ color: tint }}>${tile.taxAmount}</div>}
    </div>
  );
}

function CornerTile({ tile }: { tile: MonopolyTile }) {
  const Icon = tile.type === "start" ? Crown
    : tile.type === "jail" ? Shield
    : tile.type === "gotojail" ? Lock
    : Landmark;
  const tint = tile.type === "start" ? "#fbbf24"
    : tile.type === "gotojail" ? "#f43f5e"
    : tile.type === "parking" ? "#34d399"
    : "#a78bfa";
  const label = tile.type === "start" ? "GO"
    : tile.type === "jail" ? "JAIL"
    : tile.type === "gotojail" ? "GO TO JAIL"
    : "FREE PARKING";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary to-card px-1 text-center">
      <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: tint }} />
      <div className="text-[8px] font-black uppercase leading-tight tracking-wider text-foreground sm:text-[10px]">{label}</div>
    </div>
  );
}

function FlagDot({ country, label }: { country: string; label: string }) {
  const stripes = FLAG_STRIPES[country] ?? ["#475569", "#f8fafc", "#0f172a"];
  const vertical = country === "it" || country === "fr" || country === "ae";
  return (
    <span
      role="img"
      aria-label={`${label} flag`}
      className="h-2.5 w-4 overflow-hidden rounded-[2px] ring-1 ring-black/40 shadow"
      style={{ display: "grid", gridTemplateColumns: vertical ? `repeat(${stripes.length}, 1fr)` : undefined, gridTemplateRows: vertical ? undefined : `repeat(${stripes.length}, 1fr)` }}
    >
      {stripes.map((color, i) => <span key={`${country}-${i}`} style={{ backgroundColor: color }} />)}
    </span>
  );
}


function CenterHUD({ state, rolling }: { state: MonopolyState; rolling: boolean }) {
  const cur = currentPlayer(state);
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-4 text-center sm:gap-6 sm:p-6">
      {state.winner ? (
        <WinnerBlock state={state} />
      ) : (
        <>
          <DiceStage dice={state.dice} rolling={rolling} />
          {cur && (
            <div className="rounded-2xl border border-border bg-card/62 px-4 py-2 shadow-xl backdrop-blur-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">Turno di</div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cur.color }} />
                <span className="truncate text-sm font-black text-foreground sm:text-base">{cur.nickname}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


function DiceStage({ dice, rolling }: { dice: [number, number] | null; rolling: boolean }) {
  const shown = dice ?? [1, 1];
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <DieFace n={shown[0]} rolling={rolling} delay={0} />
      <DieFace n={shown[1]} rolling={rolling} delay={100} />
    </div>
  );
}

function DieFace({ n, rolling, delay }: { n: number; rolling: boolean; delay: number }) {
  const dots = DIE_DOTS[n] ?? [];
  return (
    <div
      className={`grid h-14 w-14 grid-cols-3 grid-rows-3 rounded-2xl border border-border bg-foreground p-2 shadow-2xl sm:h-20 sm:w-20 sm:p-3 ${rolling ? "monopoly-die-roll" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && <span className="h-2 w-2 rounded-full bg-background sm:h-3 sm:w-3" />}
        </div>
      ))}
    </div>
  );
}

const DIE_DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function MiniPawn({ player, active }: { player: MonopolyPlayer; active: boolean }) {
  return <span className={`h-2.5 w-2.5 rounded-full shadow ${active ? "ring-2 ring-primary" : "ring-1 ring-background"}`} style={{ backgroundColor: player.color }} />;
}

function MovingPawn({ player, me, index }: { player: MonopolyPlayer; me: boolean; index: number }) {
  const coord = tileCoordinate(player.pos);
  const offsetX = ((index % 3) - 1) * 1.45;
  const offsetY = (Math.floor(index / 3) - 0.5) * 1.45;
  return (
    <div
      className={`monopoly-pawn absolute z-20 grid h-7 w-7 place-items-center rounded-full border-2 border-background shadow-xl transition-[left,top,transform] duration-700 ease-out sm:h-8 sm:w-8 ${me ? "ring-2 ring-primary" : ""}`}
      style={{
        left: `calc(${(coord.x + 0.5) * 9.09}% + ${offsetX}%)`,
        top: `calc(${(coord.y + 0.5) * 9.09}% + ${offsetY}%)`,
        backgroundColor: player.color,
        transform: "translate(-50%, -50%)",
      }}
      title={player.nickname}
    >
      <UserRound className="h-3.5 w-3.5 text-background" />
    </div>
  );
}

function WinnerBlock({ state }: { state: MonopolyState }) {
  const winner = state.players.find((p) => p.playerId === state.winner);
  return (
    <div>
      <Crown className="mx-auto h-8 w-8 text-accent" />
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Winner</div>
      <div className="mt-1 truncate text-xl font-black">{winner?.nickname ?? "Draw"}</div>
    </div>
  );
}

function TurnPanel({
  state, meP, myId, isMyTurn, rolling, onRoll, onBuy, onAuction, onBid, onPassAuction, onEnd, onHostSkip,
}: {
  state: MonopolyState;
  meP: MonopolyPlayer | null;
  myId: string;
  isMyTurn: boolean;
  rolling: boolean;
  onRoll: () => void;
  onBuy: () => void;
  onAuction: () => void;
  onBid: () => void;
  onPassAuction: () => void;
  onEnd: () => void;
  onHostSkip?: () => void;
}) {
  const cur = currentPlayer(state);
  const tile = cur ? MONOPOLY_BOARD[cur.pos]! : null;
  const own = tile && (tile.type === "property" || tile.type === "airport") ? state.properties.find((x) => x.tileIdx === tile.idx) : null;
  const canBuy = isMyTurn && state.phase === "action" && !!tile && (tile.type === "property" || tile.type === "airport") && !own?.ownerId && (meP?.cash ?? 0) >= (tile.price ?? 0);
  const canAuction = isMyTurn && state.phase === "action" && !!tile && (tile.type === "property" || tile.type === "airport") && !own?.ownerId;
  const auctionTile = state.auction ? MONOPOLY_BOARD[state.auction.tileIdx] : null;
  const hasPassed = !!state.auction?.passedIds.includes(myId);
  const canBid = state.phase === "auction" && !!state.auction && !hasPassed && (meP?.cash ?? 0) >= state.auction.highestBid + (state.auction.highestBidderId ? 25 : 0);

  return (
    <aside className="rounded-3xl border border-border bg-card/82 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Control desk</div>
          <h3 className="mt-1 text-xl font-black">Turno e mercato</h3>
        </div>
        {meP && <div className="rounded-2xl bg-secondary/60 px-3 py-2 text-right text-sm font-black tabular-nums">${meP.cash}</div>}
      </div>

      {cur && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-secondary/45 p-3">
          <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-background shadow" style={{ backgroundColor: cur.color }}><UserRound className="h-5 w-5 text-background" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-black">{cur.nickname}</span>
              {isMyTurn && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase text-primary-foreground">you</span>}
              {cur.inJail && <Lock className="h-3.5 w-3.5 text-destructive" />}
            </div>
            <div className="truncate text-xs font-bold text-muted-foreground">${cur.cash} · {MONOPOLY_BOARD[cur.pos]!.name}</div>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-border bg-background/45 px-3 py-2 text-sm font-bold leading-snug text-muted-foreground">
        {state.lastAction}
      </div>

      {state.phase === "auction" && state.auction && auctionTile ? (
        <AuctionCard tile={auctionTile} state={state} canBid={canBid} onBid={onBid} onPass={onPassAuction} />
      ) : tile && (tile.type === "property" || tile.type === "airport") ? (
        <PropertyCard tile={tile} owner={own?.ownerId ? state.players.find((p) => p.playerId === own.ownerId) ?? null : null} />
      ) : null}

      <div className="mt-4 grid gap-2">
        {isMyTurn && state.phase === "roll" && !state.winner && (
          <button onClick={onRoll} disabled={rolling} className="min-h-14 rounded-2xl bg-primary px-4 py-3 text-base font-black text-primary-foreground shadow-neon transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
            {rolling ? "Rolling" : "Roll dice"}
          </button>
        )}
        {isMyTurn && state.phase === "action" && !state.winner && (
          <div className="grid grid-cols-2 gap-2">
            {canBuy && <button onClick={onBuy} className="rounded-2xl bg-accent px-3 py-3 text-sm font-black text-accent-foreground transition hover:brightness-110 active:scale-[0.98]">Buy ${tile?.price}</button>}
            {canAuction && <button onClick={onAuction} className="rounded-2xl border border-border bg-secondary px-3 py-3 text-sm font-black transition hover:bg-secondary/75 active:scale-[0.98]">Auction</button>}
            <button onClick={onEnd} className={`rounded-2xl border border-border bg-card px-3 py-3 text-sm font-black transition hover:bg-secondary/60 active:scale-[0.98] ${canBuy || canAuction ? "col-span-2" : "col-span-2"}`}>End turn</button>
          </div>
        )}
        {!isMyTurn && !state.winner && state.phase !== "auction" && (
          <div className="rounded-2xl border border-border bg-secondary/35 px-3 py-3 text-center text-xs font-bold text-muted-foreground">
            Waiting for {cur?.nickname}
            {onHostSkip && <button onClick={onHostSkip} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 text-[11px] font-black transition hover:bg-secondary"><SkipForward className="h-3 w-3" /> Skip turn</button>}
          </div>
        )}
      </div>

      <PortfolioList state={state} />
    </aside>
  );
}

function PropertyCard({ tile, owner }: { tile: MonopolyTile; owner: MonopolyPlayer | null }) {
  const crop = tile.sheetIndex ?? 0;
  const cropX = (crop % 2) * 50;
  const cropY = Math.floor(crop / 2) * 25;
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background/50">
      <div className="relative h-28 overflow-hidden">
        <img
          src={cityPanels}
          alt={tile.countryName ? `${tile.countryName}, ${tile.name}` : tile.name}
          className="h-full w-full object-cover opacity-80"
          style={{ objectPosition: `${cropX}% ${cropY}%` }}
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: tile.color }} />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {tile.type === "airport"
              ? <Plane className="h-5 w-5 text-muted-foreground" />
              : tile.country && <FlagDot country={tile.country} label={tile.countryName ?? tile.country} />}
            <div className="min-w-0">
              <div className="truncate text-base font-black uppercase">{tile.name}</div>
              <div className="text-xs font-bold text-muted-foreground">{tile.countryName ?? "Transport"}</div>
            </div>
          </div>
          <div className="rounded-xl px-2 py-1 text-xs font-black text-primary-foreground" style={{ backgroundColor: tile.color }}>RENT ${tile.rent}</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black text-muted-foreground">
          <span className="rounded-xl bg-secondary/50 px-2 py-2">Buy ${tile.price}</span>
          <span className="rounded-xl bg-secondary/50 px-2 py-2">Mortgage ${tile.mortgage}</span>
          <span className="rounded-xl bg-secondary/50 px-2 py-2">{owner ? owner.nickname : "Open"}</span>
        </div>
      </div>
    </div>
  );
}



const FLAG_STRIPES: Record<string, string[]> = {
  it: ["#009246", "#ffffff", "#ce2b37"],
  fr: ["#0055a4", "#ffffff", "#ef4135"],
  de: ["#000000", "#dd0000", "#ffce00"],
  es: ["#aa151b", "#f1bf00", "#aa151b"],
  gb: ["#012169", "#ffffff", "#c8102e"],
  us: ["#b22234", "#ffffff", "#3c3b6e", "#ffffff", "#b22234"],
  jp: ["#ffffff", "#bc002d", "#ffffff"],
  ae: ["#ff0000", "#00732f", "#ffffff", "#000000"],
};

function AuctionCard({ tile, state, canBid, onBid, onPass }: { tile: MonopolyTile; state: MonopolyState; canBid: boolean; onBid: () => void; onPass: () => void }) {
  const leader = state.auction?.highestBidderId ? state.players.find((p) => p.playerId === state.auction?.highestBidderId) : null;
  return (
    <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary"><Gavel className="h-4 w-4" /> Live auction</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-black">{tile.name}</div>
          <div className="text-xs font-bold text-muted-foreground">Leader: {leader?.nickname ?? "No bids yet"}</div>
        </div>
        <div className="rounded-2xl bg-card px-3 py-2 text-xl font-black tabular-nums">${state.auction?.highestBid ?? 0}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button disabled={!canBid} onClick={onBid} className="rounded-2xl bg-accent px-3 py-3 text-sm font-black text-accent-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">Bid</button>
        <button onClick={onPass} className="rounded-2xl border border-border bg-card px-3 py-3 text-sm font-black transition hover:bg-secondary/60">Pass</button>
      </div>
    </div>
  );
}

function PortfolioList({ state }: { state: MonopolyState }) {
  const sorted = state.players.slice().sort((a, b) => totalWorth(state, b.playerId) - totalWorth(state, a.playerId));
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Net worth</div>
      <ul className="grid gap-1.5">
        {sorted.map((p, index) => (
          <li key={p.playerId} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs ${p.bankrupt ? "opacity-40 line-through" : "bg-secondary/35"}`}>
            <span className="w-5 text-muted-foreground font-black">#{index + 1}</span>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="min-w-0 flex-1 truncate font-black">{p.nickname}</span>
            <span className="font-black tabular-nums">${totalWorth(state, p.playerId)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogPanel({ state }: { state: MonopolyState }) {
  return (
    <aside className="max-h-[520px] overflow-y-auto rounded-3xl border border-border bg-card/72 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground"><ScrollText className="h-4 w-4" /> Activity log</div>
      <ul className="space-y-2">
        {state.log.map((l, i) => (
          <li key={`${l.ts}-${i}`} className="rounded-2xl bg-secondary/32 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">{l.text}</li>
        ))}
      </ul>
    </aside>
  );
}

function ResultsView({ state, meId }: { state: MonopolyState | null; meId: string }) {
  if (!state) return null;
  const sorted = [...state.players].map((p) => ({ p, worth: totalWorth(state, p.playerId) })).sort((a, b) => b.worth - a.worth);
  const winner = state.winner ? state.players.find((p) => p.playerId === state.winner) : null;
  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-border bg-card/80 shadow-2xl backdrop-blur">
      <div className="relative h-40">
        <img src={cityPanels} alt="Città della partita" width={1600} height={1200} className="h-full w-full object-cover opacity-45" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute inset-x-0 bottom-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-2 text-3xl font-black">{winner ? winner.nickname : "Draw"}</h2>
        </div>
      </div>
      <div className="p-5">
        <ul className="space-y-2 text-left">
          {sorted.map(({ p, worth }, i) => (
            <li key={p.playerId} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${p.playerId === meId ? "border border-primary/40 bg-primary/10" : "bg-secondary/40"}`}>
              <span className="w-7 text-sm font-black text-muted-foreground">#{i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-background" style={{ backgroundColor: p.color }}><UserRound className="h-4 w-4 text-background" /></span>
              <span className="min-w-0 flex-1 truncate font-black">{p.nickname}</span>
              <span className="font-black tabular-nums">${worth}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
