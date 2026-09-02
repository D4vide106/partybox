// Monopoly-style engine — pure functions for a richer, Richup-inspired board.

export type MonopolyTileType = "start" | "property" | "jail" | "parking" | "gotojail" | "chance" | "tax" | "airport";

export type MonopolyTile = {
  idx: number;
  type: MonopolyTileType;
  name: string;
  country?: string;
  countryName?: string;
  group?: string;
  color?: string;
  price?: number;
  rent?: number;
  mortgage?: number;
  taxAmount?: number;
  sheetIndex?: number;
};

const G = {
  italy: "#2fbf71",
  france: "#3b82f6",
  germany: "#f59e0b",
  spain: "#ef4444",
  uk: "#8b5cf6",
  usa: "#06b6d4",
  japan: "#ec4899",
  uae: "#14b8a6",
  rail: "#64748b",
};

const RAW_MONOPOLY_BOARD = [
  { idx: 0, type: "start", name: "GO" },
  { idx: 1, type: "property", name: "Rome", country: "it", countryName: "Italy", group: "italy", color: G.italy, price: 60, rent: 8, sheetIndex: 0 },
  { idx: 2, type: "property", name: "Milan", country: "it", countryName: "Italy", group: "italy", color: G.italy, price: 70, rent: 10, sheetIndex: 0 },
  { idx: 3, type: "chance", name: "Market" },
  { idx: 4, type: "property", name: "Venice", country: "it", countryName: "Italy", group: "italy", color: G.italy, price: 90, rent: 14, sheetIndex: 0 },
  { idx: 5, type: "airport", name: "Fiumicino", country: "it", countryName: "Italy", group: "airport", color: G.rail, price: 120, rent: 25 },
  { idx: 6, type: "property", name: "Paris", country: "fr", countryName: "France", group: "france", color: G.france, price: 110, rent: 16, sheetIndex: 1 },
  { idx: 7, type: "tax", name: "Income Tax", taxAmount: 100 },
  { idx: 8, type: "property", name: "Lyon", country: "fr", countryName: "France", group: "france", color: G.france, price: 120, rent: 18, sheetIndex: 1 },
  { idx: 9, type: "property", name: "Marseille", country: "fr", countryName: "France", group: "france", color: G.france, price: 140, rent: 22, sheetIndex: 1 },
  { idx: 10, type: "jail", name: "Jail" },
  { idx: 11, type: "property", name: "Berlin", country: "de", countryName: "Germany", group: "germany", color: G.germany, price: 150, rent: 24, sheetIndex: 2 },
  { idx: 12, type: "property", name: "Munich", country: "de", countryName: "Germany", group: "germany", color: G.germany, price: 160, rent: 26, sheetIndex: 2 },
  { idx: 13, type: "chance", name: "Deal" },
  { idx: 14, type: "property", name: "Hamburg", country: "de", countryName: "Germany", group: "germany", color: G.germany, price: 180, rent: 30, sheetIndex: 2 },
  { idx: 15, type: "airport", name: "Charles de Gaulle", country: "fr", countryName: "France", group: "airport", color: G.rail, price: 180, rent: 35 },
  { idx: 16, type: "property", name: "Madrid", country: "es", countryName: "Spain", group: "spain", color: G.spain, price: 190, rent: 32, sheetIndex: 3 },
  { idx: 17, type: "tax", name: "Luxury Tax", taxAmount: 140 },
  { idx: 18, type: "property", name: "Barcelona", country: "es", countryName: "Spain", group: "spain", color: G.spain, price: 210, rent: 36, sheetIndex: 3 },
  { idx: 19, type: "property", name: "Valencia", country: "es", countryName: "Spain", group: "spain", color: G.spain, price: 220, rent: 38, sheetIndex: 3 },
  { idx: 20, type: "parking", name: "Free Parking" },
  { idx: 21, type: "property", name: "London", country: "gb", countryName: "United Kingdom", group: "uk", color: G.uk, price: 230, rent: 40, sheetIndex: 4 },
  { idx: 22, type: "property", name: "Manchester", country: "gb", countryName: "United Kingdom", group: "uk", color: G.uk, price: 240, rent: 42, sheetIndex: 4 },
  { idx: 23, type: "chance", name: "Chance" },
  { idx: 24, type: "property", name: "Edinburgh", country: "gb", countryName: "United Kingdom", group: "uk", color: G.uk, price: 260, rent: 46, sheetIndex: 4 },
  { idx: 25, type: "airport", name: "Heathrow", country: "gb", countryName: "United Kingdom", group: "airport", color: G.rail, price: 220, rent: 45 },
  { idx: 26, type: "property", name: "New York", country: "us", countryName: "United States", group: "usa", color: G.usa, price: 280, rent: 50, sheetIndex: 5 },
  { idx: 27, type: "property", name: "Los Angeles", country: "us", countryName: "United States", group: "usa", color: G.usa, price: 300, rent: 55, sheetIndex: 5 },
  { idx: 28, type: "tax", name: "Capital Tax", taxAmount: 180 },
  { idx: 29, type: "property", name: "Chicago", country: "us", countryName: "United States", group: "usa", color: G.usa, price: 320, rent: 60, sheetIndex: 5 },
  { idx: 30, type: "gotojail", name: "Go to Jail" },
  { idx: 31, type: "property", name: "Tokyo", country: "jp", countryName: "Japan", group: "japan", color: G.japan, price: 340, rent: 66, sheetIndex: 6 },
  { idx: 32, type: "property", name: "Osaka", country: "jp", countryName: "Japan", group: "japan", color: G.japan, price: 360, rent: 72, sheetIndex: 6 },
  { idx: 33, type: "chance", name: "Market" },
  { idx: 34, type: "property", name: "Kyoto", country: "jp", countryName: "Japan", group: "japan", color: G.japan, price: 380, rent: 78, sheetIndex: 6 },
  { idx: 35, type: "airport", name: "Haneda", country: "jp", countryName: "Japan", group: "airport", color: G.rail, price: 260, rent: 55 },
  { idx: 36, type: "property", name: "Dubai", country: "ae", countryName: "United Arab Emirates", group: "uae", color: G.uae, price: 400, rent: 85, sheetIndex: 7 },
  { idx: 37, type: "tax", name: "Wealth Tax", taxAmount: 220 },
  { idx: 38, type: "property", name: "Abu Dhabi", country: "ae", countryName: "United Arab Emirates", group: "uae", color: G.uae, price: 430, rent: 95, sheetIndex: 7 },
  { idx: 39, type: "property", name: "Sharjah", country: "ae", countryName: "United Arab Emirates", group: "uae", color: G.uae, price: 460, rent: 110, sheetIndex: 7 },
] satisfies Omit<MonopolyTile, "mortgage">[];

export const MONOPOLY_BOARD: MonopolyTile[] = RAW_MONOPOLY_BOARD.map((tile) => ({
  ...tile,
  mortgage: tile.price ? Math.floor(tile.price / 2) : undefined,
}));

export const PLAYER_COLORS = [
  "#ef4444", "#2563eb", "#16a34a", "#ca8a04",
  "#7c3aed", "#ea580c", "#0891b2", "#db2777",
];

export type MonopolyConfig = {
  startCash: number;
  goBonus: number;
  jailFee: number;
};

export const DEFAULT_CONFIG: MonopolyConfig = {
  startCash: 1500,
  goBonus: 200,
  jailFee: 50,
};

export type MonopolyPlayer = {
  playerId: string;
  nickname: string;
  color: string;
  pos: number;
  cash: number;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
};

export type PropertyOwn = { tileIdx: number; ownerId: string | null };

export type MonopolyAuction = {
  tileIdx: number;
  highestBid: number;
  highestBidderId: string | null;
  passedIds: string[];
};

export type MonopolyState = {
  players: MonopolyPlayer[];
  order: string[];
  turnIdx: number;
  phase: "roll" | "action" | "auction" | "end";
  properties: PropertyOwn[];
  dice: [number, number] | null;
  lastAction: string;
  log: { ts: number; text: string }[];
  winner: string | null;
  startedAt: number;
  config: MonopolyConfig;
  auction: MonopolyAuction | null;
};

export function initialState(
  playersInput: { id: string; nickname: string }[],
  config: Partial<MonopolyConfig> = {},
): MonopolyState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const players: MonopolyPlayer[] = playersInput.map((p, i) => ({
    playerId: p.id,
    nickname: p.nickname,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
    pos: 0,
    cash: cfg.startCash,
    inJail: false,
    jailTurns: 0,
    bankrupt: false,
  }));
  return {
    players,
    order: players.map((p) => p.playerId),
    turnIdx: 0,
    phase: "roll",
    properties: MONOPOLY_BOARD.filter((t) => t.type === "property" || t.type === "airport").map((t) => ({ tileIdx: t.idx, ownerId: null })),
    dice: null,
    lastAction: "Game started",
    log: [{ ts: Date.now(), text: "Game started" }],
    winner: null,
    startedAt: Date.now(),
    config: cfg,
    auction: null,
  };
}

function pushLog(s: MonopolyState, text: string): MonopolyState {
  s.lastAction = text;
  s.log = [{ ts: Date.now(), text }, ...s.log].slice(0, 80);
  return s;
}

export function currentPlayer(s: MonopolyState): MonopolyPlayer | null {
  const id = s.order[s.turnIdx];
  return s.players.find((p) => p.playerId === id) ?? null;
}

function activeBidders(s: MonopolyState): MonopolyPlayer[] {
  return s.players.filter((p) => !p.bankrupt && p.cash > 0);
}

export function rollAndMove(s: MonopolyState): MonopolyState {
  const next = structuredClone(s);
  next.auction = null;
  const cfg = next.config ?? DEFAULT_CONFIG;
  const p = currentPlayer(next);
  if (!p || next.phase !== "roll" || next.winner) return next;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  next.dice = [d1, d2];

  if (p.inJail) {
    if (d1 === d2) {
      p.inJail = false;
      p.jailTurns = 0;
      pushLog(next, `${p.nickname} rolls doubles and leaves jail`);
    } else {
      p.jailTurns += 1;
      if (p.jailTurns >= 3) {
        p.cash -= cfg.jailFee;
        p.inJail = false;
        p.jailTurns = 0;
        pushLog(next, `${p.nickname} pays $${cfg.jailFee} bail`);
      } else {
        pushLog(next, `${p.nickname} remains in jail (${p.jailTurns}/3)`);
        next.phase = "action";
        return next;
      }
    }
  }

  const step = d1 + d2;
  const prevPos = p.pos;
  p.pos = (p.pos + step) % MONOPOLY_BOARD.length;
  if (p.pos < prevPos) {
    p.cash += cfg.goBonus;
    pushLog(next, `${p.nickname} passes GO and receives $${cfg.goBonus}`);
  }
  const tile = MONOPOLY_BOARD[p.pos]!;
  pushLog(next, `${p.nickname} rolls ${d1}+${d2} and reaches ${tile.name}`);

  if (tile.type === "tax") {
    const amt = tile.taxAmount ?? 100;
    p.cash -= amt;
    pushLog(next, `${p.nickname} pays $${amt} tax`);
  } else if (tile.type === "gotojail") {
    p.pos = 10;
    p.inJail = true;
    p.jailTurns = 0;
    pushLog(next, `${p.nickname} is sent to jail`);
  } else if (tile.type === "chance") {
    const delta = [-120, -80, -40, 60, 100, 150, 220, -60][Math.floor(Math.random() * 8)]!;
    p.cash += delta;
    pushLog(next, `Market card: ${delta > 0 ? "+" : ""}$${delta}`);
  } else if (tile.type === "property" || tile.type === "airport") {
    const own = next.properties.find((x) => x.tileIdx === p.pos);
    if (own?.ownerId && own.ownerId !== p.playerId) {
      const owner = next.players.find((x) => x.playerId === own.ownerId);
      if (owner && !owner.bankrupt) {
        const rent = tile.rent ?? 10;
        p.cash -= rent;
        owner.cash += rent;
        pushLog(next, `${p.nickname} pays $${rent} rent to ${owner.nickname}`);
      }
    }
  }

  if (p.cash < 0) bankrupt(next, p.playerId);
  next.phase = "action";
  return checkWinner(next);
}

export function buyProperty(s: MonopolyState): MonopolyState {
  const next = structuredClone(s);
  const p = currentPlayer(next);
  if (!p || next.phase !== "action" || p.bankrupt) return next;
  const tile = MONOPOLY_BOARD[p.pos]!;
  if (tile.type !== "property" && tile.type !== "airport") return next;
  const own = next.properties.find((x) => x.tileIdx === p.pos);
  if (!own || own.ownerId) return next;
  const price = tile.price ?? 0;
  if (p.cash < price) return next;
  p.cash -= price;
  own.ownerId = p.playerId;
  pushLog(next, `${p.nickname} buys ${tile.name} for $${price}`);
  return checkWinner(next);
}

export function startAuction(s: MonopolyState): MonopolyState {
  const next = structuredClone(s);
  const p = currentPlayer(next);
  if (!p || next.phase !== "action") return next;
  const tile = MONOPOLY_BOARD[p.pos]!;
  if (tile.type !== "property" && tile.type !== "airport") return next;
  const own = next.properties.find((x) => x.tileIdx === tile.idx);
  if (!own || own.ownerId) return next;
  const opening = Math.max(10, Math.floor((tile.price ?? 100) * 0.45));
  next.phase = "auction";
  next.auction = { tileIdx: tile.idx, highestBid: opening, highestBidderId: null, passedIds: [] };
  pushLog(next, `${tile.name} enters auction at $${opening}`);
  return next;
}

export function placeAuctionBid(s: MonopolyState, playerId: string, raiseBy = 25): MonopolyState {
  const next = structuredClone(s);
  if (next.phase !== "auction" || !next.auction) return next;
  const bidder = next.players.find((p) => p.playerId === playerId);
  if (!bidder || bidder.bankrupt) return next;
  const bid = next.auction.highestBidderId ? next.auction.highestBid + raiseBy : next.auction.highestBid;
  if (bidder.cash < bid) return next;
  next.auction.highestBid = bid;
  next.auction.highestBidderId = bidder.playerId;
  next.auction.passedIds = next.auction.passedIds.filter((id) => id !== bidder.playerId);
  pushLog(next, `${bidder.nickname} bids $${bid}`);
  return next;
}

export function passAuction(s: MonopolyState, playerId: string): MonopolyState {
  const next = structuredClone(s);
  if (next.phase !== "auction" || !next.auction) return next;
  const player = next.players.find((p) => p.playerId === playerId);
  if (!player || player.bankrupt) return next;
  if (!next.auction.passedIds.includes(playerId)) next.auction.passedIds.push(playerId);
  pushLog(next, `${player.nickname} passes the auction`);
  return resolveAuctionIfDone(next);
}

function resolveAuctionIfDone(s: MonopolyState): MonopolyState {
  const a = s.auction;
  if (!a) return s;
  const bidders = activeBidders(s);
  const stillIn = bidders.filter((p) => !a.passedIds.includes(p.playerId) || p.playerId === a.highestBidderId);
  const everybodyPassed = bidders.every((p) => a.passedIds.includes(p.playerId));
  if (stillIn.length > 1 && !everybodyPassed) return s;

  const tile = MONOPOLY_BOARD[a.tileIdx]!;
  if (a.highestBidderId) {
    const winner = s.players.find((p) => p.playerId === a.highestBidderId);
    const own = s.properties.find((p) => p.tileIdx === a.tileIdx);
    if (winner && own && winner.cash >= a.highestBid) {
      winner.cash -= a.highestBid;
      own.ownerId = winner.playerId;
      pushLog(s, `${winner.nickname} wins ${tile.name} for $${a.highestBid}`);
    }
  } else {
    pushLog(s, `${tile.name} remains unsold`);
  }
  s.auction = null;
  s.phase = "action";
  return s;
}

export function endTurn(s: MonopolyState): MonopolyState {
  const next = structuredClone(s);
  if (next.winner || next.phase === "auction") return next;
  next.auction = null;
  let safety = 0;
  do {
    next.turnIdx = (next.turnIdx + 1) % next.order.length;
    safety++;
  } while (
    next.players.find((p) => p.playerId === next.order[next.turnIdx])?.bankrupt &&
    safety < next.order.length + 1
  );
  next.phase = "roll";
  next.dice = null;
  return checkWinner(next);
}

function bankrupt(s: MonopolyState, playerId: string) {
  const p = s.players.find((x) => x.playerId === playerId);
  if (!p) return;
  p.bankrupt = true;
  for (const own of s.properties) if (own.ownerId === playerId) own.ownerId = null;
  pushLog(s, `${p.nickname} is bankrupt`);
}

export function checkWinner(s: MonopolyState): MonopolyState {
  const alive = s.players.filter((p) => !p.bankrupt);
  if (alive.length <= 1 && s.players.length > 1) {
    s.winner = alive[0]?.playerId ?? null;
    s.phase = "end";
    if (s.winner) pushLog(s, `${alive[0]!.nickname} wins the match`);
  }
  return s;
}

export function finishByTimeout(s: MonopolyState): MonopolyState {
  const next = structuredClone(s);
  const scored = next.players
    .filter((p) => !p.bankrupt)
    .map((p) => ({ p, worth: p.cash + propertyWorth(next, p.playerId) }))
    .sort((a, b) => b.worth - a.worth);
  next.winner = scored[0]?.p.playerId ?? null;
  next.phase = "end";
  next.auction = null;
  if (next.winner) pushLog(next, `Time up: ${scored[0]!.p.nickname} wins with $${scored[0]!.worth}`);
  return next;
}

export function propertyWorth(s: MonopolyState, playerId: string): number {
  let sum = 0;
  for (const own of s.properties) {
    if (own.ownerId !== playerId) continue;
    const tile = MONOPOLY_BOARD[own.tileIdx]!;
    sum += tile.price ?? 0;
  }
  return sum;
}

export function totalWorth(s: MonopolyState, playerId: string): number {
  const p = s.players.find((x) => x.playerId === playerId);
  if (!p) return 0;
  return p.cash + propertyWorth(s, playerId);
}

export function tileCoordinate(idx: number): { x: number; y: number; side: "top" | "right" | "bottom" | "left" } {
  const c = idx % 40;
  if (c <= 10) return { x: 10 - c, y: 10, side: "bottom" };
  if (c <= 20) return { x: 0, y: 20 - c, side: "left" };
  if (c <= 30) return { x: c - 20, y: 0, side: "top" };
  return { x: 10, y: c - 30, side: "right" };
}
