import { GAME_META, type GameType } from "./games";

export type GameCategoryId =
  | "normal"
  | "random"
  | "brain"
  | "speed"
  | "eye"
  | "party"
  | "all"
  | "monopoly";

export type GameCategory = {
  id: GameCategoryId;
  name: string;
  emoji: string;
  tagline: string;
  /** Tailwind gradient classes (bg). */
  gradient: string;
  /** Tailwind ring color used when selected. */
  ring: string;
  /** Auto categories don't expand for game picking. */
  auto: boolean;
  /** Games belonging to this category (empty for auto categories). */
  games: GameType[];
};

/** All 34 mini-games (Monopoly is a separate long-form mode, excluded from categories). */
export const CATEGORY_GAMES: GameType[] = (Object.keys(GAME_META) as GameType[])
  .filter((g) => g !== "monopoly");

// Themed categories, non overlapping. 43 mini-games spread across 4 themes.
const SPEED: GameType[] = ["tapblitz", "reaction", "aimtrainer", "whackmole", "popbubbles", "speedsort", "rhythmtap", "stacktower", "snake", "gonogo", "quickbiggest", "letterpop"];
const BRAIN: GameType[] = ["mathblitz", "trivia", "wordscramble", "emojimemory", "ninetarget", "truefalse", "cardmatch", "guessnumber", "sequencenext", "memorydigits", "anagramsprint", "mathtruth", "coinsplit"];
const EYE: GameType[] = ["oddoneout", "countemoji", "stroop", "colormatch", "patterncopy", "simon", "perfectcircle", "piechart", "typohunt", "findpair", "spotdiff", "connectdots"];
const PARTY: GameType[] = ["drawblitz", "typerush", "priceguess", "flagguess", "higherlower", "emojiriddle", "capitals"];

export const GAME_CATEGORIES: GameCategory[] = [
  {
    id: "normal",
    name: "NORMAL",
    emoji: "⚡",
    tagline: "Scegli tu i mini-giochi",
    gradient: "from-primary/80 via-primary to-accent",
    ring: "ring-primary",
    auto: false,
    games: CATEGORY_GAMES,
  },
  {
    id: "random",
    name: "RANDOM",
    emoji: "🎲",
    tagline: "8 giochi a sorpresa",
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-500",
    ring: "ring-fuchsia-400",
    auto: true,
    games: [],
  },
  {
    id: "speed",
    name: "VELOCITÀ",
    emoji: "💨",
    tagline: "Riflessi e dita rapide",
    gradient: "from-orange-500 via-red-500 to-pink-500",
    ring: "ring-orange-400",
    auto: false,
    games: SPEED,
  },
  {
    id: "brain",
    name: "CERVELLO",
    emoji: "🧠",
    tagline: "Logica, memoria, trivia",
    gradient: "from-blue-500 via-cyan-500 to-teal-400",
    ring: "ring-cyan-400",
    auto: false,
    games: BRAIN,
  },
  {
    id: "eye",
    name: "OSSERVAZIONE",
    emoji: "👁️",
    tagline: "Pattern e differenze",
    gradient: "from-emerald-500 via-lime-500 to-yellow-400",
    ring: "ring-lime-400",
    auto: false,
    games: EYE,
  },
  {
    id: "party",
    name: "FESTA",
    emoji: "🎉",
    tagline: "Creativo e social",
    gradient: "from-pink-500 via-rose-500 to-amber-400",
    ring: "ring-pink-400",
    auto: false,
    games: PARTY,
  },
  {
    id: "all",
    name: "TORNEO",
    emoji: "🏆",
    tagline: "Tutti i 43 mini-giochi",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    ring: "ring-amber-400",
    auto: true,
    games: CATEGORY_GAMES,
  },
  {
    id: "monopoly",
    name: "MONOPOLY",
    emoji: "🏦",
    tagline: "Partita completa con proprietà e affitti",
    gradient: "from-emerald-600 via-green-700 to-lime-700",
    ring: "ring-emerald-400",
    auto: false,
    games: ["monopoly"],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build the game sequence for a given category id. */
export function buildSequence(id: GameCategoryId): GameType[] {
  if (id === "random") return shuffle(CATEGORY_GAMES).slice(0, 8);
  if (id === "all") return shuffle(CATEGORY_GAMES);
  if (id === "monopoly") return ["monopoly"];
  const cat = GAME_CATEGORIES.find((c) => c.id === id);
  return cat ? [...cat.games] : [];
}
