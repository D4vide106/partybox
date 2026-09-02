// PartyBox mini-game catalog + scoring helpers.

export type GameType =
  | "tapblitz"
  | "typerush"
  | "priceguess"
  | "drawblitz"
  | "reaction"
  | "mathblitz"
  | "emojimemory"
  | "wordscramble"
  | "oddoneout"
  | "stroop"
  | "trivia"
  | "countemoji"
  | "flagguess"
  | "higherlower"
  | "aimtrainer"
  | "simon"
  | "colormatch"
  | "popbubbles"
  | "speedsort"
  | "whackmole"
  | "emojiriddle"
  | "ninetarget"
  | "patterncopy"
  | "truefalse"
  | "rhythmtap"
  | "stacktower"
  | "snake"
  | "perfectcircle"
  | "cardmatch"
  | "guessnumber"
  | "sequencenext"
  | "capitals"
  | "piechart"
  | "typohunt"
  | "memorydigits"
  | "anagramsprint"
  | "findpair"
  | "connectdots"
  | "gonogo"
  | "spotdiff"
  | "mathtruth"
  | "quickbiggest"
  | "letterpop"
  | "coinsplit"
  | "monopoly";

export const GAME_META: Record<GameType, {
  name: string;
  emoji: string;
  tagline: string;
  durationSec: number;
  color: string; // tailwind gradient class
}> = {
  tapblitz: {
    name: "TapBlitz",
    emoji: "⚡",
    tagline: "Tocca più veloce di tutti in 10 secondi",
    durationSec: 10,
    color: "from-yellow-400 to-orange-500",
  },
  typerush: {
    name: "TypeRush",
    emoji: "⌨️",
    tagline: "Scrivi la frase più in fretta che puoi",
    durationSec: 30,
    color: "from-cyan-400 to-blue-500",
  },
  priceguess: {
    name: "PriceGuess",
    emoji: "💰",
    tagline: "Indovina il prezzo esatto",
    durationSec: 20,
    color: "from-green-400 to-emerald-500",
  },
  drawblitz: {
    name: "DrawBlitz",
    emoji: "🎨",
    tagline: "Disegna il tema in 30 secondi",
    durationSec: 30,
    color: "from-pink-400 to-fuchsia-500",
  },
  reaction: {
    name: "Reaction",
    emoji: "🚦",
    tagline: "Aspetta il verde… poi TAP fulmineo",
    durationSec: 15,
    color: "from-red-500 via-yellow-400 to-green-500",
  },
  mathblitz: {
    name: "MathBlitz",
    emoji: "🧮",
    tagline: "Più operazioni giuste in 25 secondi",
    durationSec: 25,
    color: "from-indigo-400 to-purple-600",
  },
  emojimemory: {
    name: "EmojiMemory",
    emoji: "🧠",
    tagline: "Memorizza la sequenza e ripetila",
    durationSec: 25,
    color: "from-fuchsia-400 to-pink-600",
  },
  wordscramble: {
    name: "WordScramble",
    emoji: "🔤",
    tagline: "Ricomponi la parola più in fretta",
    durationSec: 25,
    color: "from-teal-400 to-cyan-600",
  },
  oddoneout: {
    name: "OddOneOut",
    emoji: "👀",
    tagline: "Trova l'emoji diversa dalle altre",
    durationSec: 25,
    color: "from-amber-400 to-red-500",
  },
  stroop: {
    name: "Stroop",
    emoji: "🌈",
    tagline: "Il testo dice il vero colore? SÌ o NO",
    durationSec: 25,
    color: "from-rose-400 to-purple-500",
  },
  trivia: {
    name: "Trivia",
    emoji: "❓",
    tagline: "Domanda a scelta multipla, più veloce = più punti",
    durationSec: 15,
    color: "from-sky-400 to-indigo-500",
  },
  countemoji: {
    name: "CountEmoji",
    emoji: "🔢",
    tagline: "Quante di quella emoji ci sono?",
    durationSec: 15,
    color: "from-lime-400 to-green-600",
  },
  flagguess: {
    name: "FlagGuess",
    emoji: "🏳️",
    tagline: "Scrivi il paese di questa bandiera",
    durationSec: 20,
    color: "from-blue-400 to-emerald-500",
  },
  higherlower: {
    name: "HigherLower",
    emoji: "📈",
    tagline: "Più abitanti: A o B? Quante ne azzecchi?",
    durationSec: 25,
    color: "from-orange-400 to-pink-500",
  },
  aimtrainer: {
    name: "AimTrainer",
    emoji: "🎯",
    tagline: "Colpisci più bersagli possibile in 20s",
    durationSec: 20,
    color: "from-red-400 to-rose-600",
  },
  simon: {
    name: "Simon",
    emoji: "🟩",
    tagline: "Ripeti la sequenza di colori",
    durationSec: 30,
    color: "from-emerald-400 to-teal-600",
  },
  colormatch: {
    name: "ColorMatch",
    emoji: "🖌️",
    tagline: "Quale codice HEX è quel colore?",
    durationSec: 25,
    color: "from-violet-400 to-fuchsia-600",
  },
  popbubbles: {
    name: "PopBubbles",
    emoji: "🫧",
    tagline: "Scoppia le bolle, evita le bombe",
    durationSec: 20,
    color: "from-sky-300 to-blue-500",
  },
  speedsort: {
    name: "SpeedSort",
    emoji: "🔀",
    tagline: "Metti i numeri in ordine crescente",
    durationSec: 25,
    color: "from-lime-400 to-emerald-600",
  },
  whackmole: {
    name: "WhackMole",
    emoji: "🔨",
    tagline: "Colpisci le talpe che spuntano",
    durationSec: 20,
    color: "from-amber-500 to-orange-700",
  },
  emojiriddle: {
    name: "EmojiRiddle",
    emoji: "🎬",
    tagline: "Indovina il film dagli emoji",
    durationSec: 25,
    color: "from-yellow-300 to-red-500",
  },
  ninetarget: {
    name: "NineTarget",
    emoji: "🎰",
    tagline: "Trova numeri che sommano al target",
    durationSec: 25,
    color: "from-purple-500 to-indigo-700",
  },
  patterncopy: {
    name: "PatternCopy",
    emoji: "🟪",
    tagline: "Memorizza la griglia, poi ricopiala",
    durationSec: 25,
    color: "from-pink-500 to-purple-700",
  },
  truefalse: {
    name: "TrueFalse",
    emoji: "✔️",
    tagline: "Vero o falso? Rispondi più veloce",
    durationSec: 25,
    color: "from-cyan-400 to-emerald-500",
  },
  rhythmtap: {
    name: "RhythmTap",
    emoji: "⏱️",
    tagline: "Tap sul beat quando la barra entra nella zona",
    durationSec: 25,
    color: "from-pink-500 via-purple-500 to-indigo-500",
  },
  stacktower: {
    name: "StackTower",
    emoji: "🧱",
    tagline: "Ferma il blocco allineato: più torre, più punti",
    durationSec: 30,
    color: "from-orange-400 via-amber-500 to-yellow-500",
  },
  snake: {
    name: "Snake",
    emoji: "🐍",
    tagline: "Mangia mele senza morderti la coda",
    durationSec: 40,
    color: "from-green-500 via-emerald-500 to-teal-600",
  },
  perfectcircle: {
    name: "PerfectCircle",
    emoji: "⭕",
    tagline: "Disegna il cerchio più perfetto che puoi",
    durationSec: 15,
    color: "from-red-400 via-pink-500 to-fuchsia-500",
  },
  cardmatch: {
    name: "CardMatch",
    emoji: "🃏",
    tagline: "Memoria: trova tutte le coppie di carte",
    durationSec: 45,
    color: "from-indigo-500 via-blue-500 to-cyan-500",
  },
  guessnumber: {
    name: "GuessNumber",
    emoji: "🔢",
    tagline: "Indovina il numero segreto in meno tentativi",
    durationSec: 40,
    color: "from-cyan-500 via-teal-500 to-emerald-500",
  },
  sequencenext: {
    name: "SequenceNext",
    emoji: "🔗",
    tagline: "Trova il numero che completa la serie",
    durationSec: 25,
    color: "from-violet-500 via-purple-500 to-fuchsia-500",
  },
  capitals: {
    name: "Capitals",
    emoji: "🗺️",
    tagline: "Qual è la capitale? A scelta multipla",
    durationSec: 15,
    color: "from-blue-500 via-indigo-500 to-purple-500",
  },
  piechart: {
    name: "PieChart",
    emoji: "🥧",
    tagline: "Stima la percentuale della fetta colorata",
    durationSec: 20,
    color: "from-amber-400 via-orange-500 to-red-500",
  },
  typohunt: {
    name: "TypoHunt",
    emoji: "🔍",
    tagline: "Trova la parola sbagliata nella frase",
    durationSec: 20,
    color: "from-emerald-400 via-teal-500 to-cyan-500",
  },
  memorydigits: {
    name: "MemoryDigits",
    emoji: "🧠",
    tagline: "Memorizza i numeri e riscrivili nell'ordine",
    durationSec: 20,
    color: "from-violet-500 via-purple-500 to-fuchsia-600",
  },
  anagramsprint: {
    name: "AnagramSprint",
    emoji: "🔤",
    tagline: "Risolvi più anagrammi possibile a raffica",
    durationSec: 35,
    color: "from-teal-400 via-cyan-500 to-blue-600",
  },
  findpair: {
    name: "FindPair",
    emoji: "👥",
    tagline: "Trova le due emoji uguali nella griglia",
    durationSec: 20,
    color: "from-fuchsia-500 via-pink-500 to-rose-500",
  },
  connectdots: {
    name: "ConnectDots",
    emoji: "🔗",
    tagline: "Tocca i pallini in ordine da 1 a 12",
    durationSec: 25,
    color: "from-indigo-500 via-blue-500 to-sky-500",
  },
  gonogo: {
    name: "GoNoGo",
    emoji: "🚦",
    tagline: "Tap SOLO sul verde, evita il rosso",
    durationSec: 20,
    color: "from-emerald-500 via-lime-500 to-red-500",
  },
  spotdiff: {
    name: "SpotDiff",
    emoji: "🔍",
    tagline: "Trova la casella diversa tra le due griglie",
    durationSec: 25,
    color: "from-amber-500 via-orange-500 to-red-500",
  },
  mathtruth: {
    name: "MathTruth",
    emoji: "✅",
    tagline: "L'operazione è giusta? SÌ o NO velocissimi",
    durationSec: 25,
    color: "from-cyan-400 via-teal-500 to-emerald-500",
  },
  quickbiggest: {
    name: "QuickBiggest",
    emoji: "📊",
    tagline: "Tocca il numero più grande, il più veloce vince",
    durationSec: 20,
    color: "from-orange-400 via-red-500 to-pink-500",
  },
  letterpop: {
    name: "LetterPop",
    emoji: "🅰️",
    tagline: "Scoppia SOLO le vocali, evita le consonanti",
    durationSec: 20,
    color: "from-yellow-400 via-orange-500 to-fuchsia-500",
  },
  coinsplit: {
    name: "CoinSplit",
    emoji: "⚖️",
    tagline: "Dividi le monete in due pile con lo stesso valore",
    durationSec: 45,
    color: "from-yellow-500 via-amber-500 to-orange-600",
  },
  monopoly: {
    name: "Monopoly",
    emoji: "🏦",
    tagline: "Dadi, proprietà, affitti — vince chi ha più patrimonio",
    durationSec: 480,
    color: "from-emerald-500 to-teal-700",
  },
};

export const TYPE_PHRASES = [
  "Il gatto scivolò silenziosamente sotto il tavolo di legno",
  "Piove sempre nei momenti sbagliati e mai quando servirebbe",
  "La musica alta fa sembrare tutto un film pazzesco",
  "Chi dorme non piglia pesci ma neanche stress inutili",
  "Il caffè della mattina è una religione per molti italiani",
  "Le stelle brillano più forte lontano dalle luci di città",
  "Ridere fa bene al cuore e riduce lo stress accumulato",
  "Un buon libro è meglio di dieci serie televisive scadenti",
];

export const PRICE_PRODUCTS = [
  { name: "AirPods Pro 2", emoji: "🎧", price: 279, currency: "€" },
  { name: "Nintendo Switch OLED", emoji: "🎮", price: 349, currency: "€" },
  { name: "Bicicletta pieghevole Decathlon", emoji: "🚲", price: 189, currency: "€" },
  { name: "Robot aspirapolvere Roomba", emoji: "🤖", price: 449, currency: "€" },
  { name: "Macchina caffè Nespresso Vertuo", emoji: "☕", price: 149, currency: "€" },
  { name: "Monopattino elettrico Xiaomi", emoji: "🛴", price: 399, currency: "€" },
  { name: "Cuffie Sony WH-1000XM5", emoji: "🎧", price: 379, currency: "€" },
  { name: "Kindle Paperwhite", emoji: "📖", price: 159, currency: "€" },
];

export const DRAW_PROMPTS = [
  "Un gatto astronauta", "Una pizza con le gambe", "Un dinosauro al mare",
  "Il tuo eroe preferito", "Una casa nel bosco", "Un mostro simpatico",
  "Un cocktail alieno", "Un robot che balla", "Uno chef arrabbiato",
  "Una nave pirata volante", "Un vampiro in vacanza", "Un supereroe stanco",
  "Una città sulle nuvole", "Un mago che cucina", "Un fantasma innamorato",
];

export const SCRAMBLE_WORDS = [
  { word: "COMPUTER", hint: "Lo usi ogni giorno" },
  { word: "PIZZA", hint: "Cibo italiano famoso" },
  { word: "MONTAGNA", hint: "Alta e rocciosa" },
  { word: "CHITARRA", hint: "Strumento a corde" },
  { word: "OCEANO", hint: "Grande massa d'acqua" },
  { word: "GELATO", hint: "Dolce e freddo" },
  { word: "STELLA", hint: "Brilla di notte" },
  { word: "CASTELLO", hint: "Ci vivono i re" },
  { word: "VULCANO", hint: "Erutta lava" },
  { word: "DRAGONE", hint: "Sputa fuoco" },
  { word: "FORESTA", hint: "Piena di alberi" },
  { word: "PIANETA", hint: "Gira intorno a una stella" },
];

// Emoji pool for memory & oddoneout
export const EMOJI_POOL = [
  "🐶","🐱","🦊","🐼","🐸","🐵","🦁","🐯","🐨","🐮",
  "🍕","🍔","🍟","🌭","🍩","🍪","🍰","🍎","🍇","🍉",
  "⚽","🏀","🎮","🎲","🎯","🎸","🎺","🚀","🚗","✈️",
  "⭐","🔥","💎","🌈","⚡","🌙","☀️","🍀","🎈","🎉",
];

// Compute points helpers
export function scoreTapBlitz(taps: number): number {
  return Math.max(0, taps * 10);
}
export function scoreTypeRush(correctChars: number, totalChars: number, elapsedMs: number): number {
  const accuracy = totalChars > 0 ? correctChars / totalChars : 0;
  const base = accuracy * 1500;
  const penalty = Math.floor(elapsedMs / 30);
  return Math.max(0, Math.floor(base - penalty));
}
export function scorePriceGuess(guess: number, actual: number): number {
  const diff = Math.abs(guess - actual);
  return Math.max(0, Math.floor(1000 - diff * 3));
}
export function scoreDrawBlitz(votes: number): number {
  return votes * 300;
}
export function scoreReaction(ms: number | null): number {
  if (ms === null || ms < 0) return 0;
  if (ms >= 800) return 0;
  return Math.floor((800 - ms) * 2); // ~1600 max for near-instant
}
export function scoreMathBlitz(correct: number, wrong: number = 0): number {
  return Math.max(0, correct * 100 - wrong * 90);
}
export function scoreEmojiMemory(correctPositions: number, total: number): number {
  const bonus = correctPositions === total ? 200 : 0;
  return correctPositions * 150 + bonus;
}
export function scoreWordScramble(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 300 + Math.floor((timeLeft / durationMs) * 900);
}
export function scoreOddOneOut(correct: number, wrong: number = 0): number {
  return Math.max(0, correct * 120 - wrong * 110);
}

export function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Anti-repeat sampler: pick a random index not present in `used`.
 * When the pool is exhausted, reset used and start over (still avoids the very last pick).
 * Returns [pickedIndex, updatedUsed].
 */
export function pickUniqueIndex(poolSize: number, used: number[] = []): [number, number[]] {
  if (poolSize <= 0) return [0, []];
  const available: number[] = [];
  for (let i = 0; i < poolSize; i++) if (!used.includes(i)) available.push(i);
  if (available.length === 0) {
    // Reset — but if we know the last pick, avoid immediate repeat
    const last = used[used.length - 1];
    let pool = Array.from({ length: poolSize }, (_, i) => i);
    if (last !== undefined && pool.length > 1) pool = pool.filter((i) => i !== last);
    const idx = pool[Math.floor(Math.random() * pool.length)]!;
    return [idx, [idx]];
  }
  const idx = available[Math.floor(Math.random() * available.length)]!;
  return [idx, [...used, idx]];
}

/** Pool sizes for content-based games, used by pickUniqueIndex. */
export const CONTENT_POOL_SIZES = {
  typerush:     8,   // TYPE_PHRASES.length
  priceguess:   8,   // PRICE_PRODUCTS.length
  drawblitz:   15,   // DRAW_PROMPTS.length
  wordscramble: 12,  // SCRAMBLE_WORDS.length
  trivia:      12,   // TRIVIA_QUESTIONS.length
  flagguess:   20,   // FLAG_POOL.length
  emojiriddle: 12,   // EMOJI_RIDDLES.length
  capitals:    20,   // CAPITALS_POOL.length
  typohunt:    15,   // TYPO_POOL.length
} as const;


// Deterministic PRNG (mulberry32) for shared per-round streams.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function scrambleWord(word: string, seed: number): string {
  const arr = word.split("");
  const rand = mulberry32(seed);
  for (let attempt = 0; attempt < 5; attempt++) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i]!, copy[j]!] = [copy[j]!, copy[i]!];
    }
    const out = copy.join("");
    if (out !== word) return out;
  }
  return arr.reverse().join("");
}

// Generate one math problem deterministically from seed+index.
export function makeMathProblem(seed: number, idx: number): { text: string; answer: number } {
  const r = mulberry32(seed + idx * 9973);
  const op = ["+", "-", "×"][Math.floor(r() * 3)]!;
  let a = 0, b = 0, answer = 0;
  if (op === "+") { a = Math.floor(r() * 40) + 5; b = Math.floor(r() * 40) + 5; answer = a + b; }
  else if (op === "-") { a = Math.floor(r() * 50) + 20; b = Math.floor(r() * (a - 1)) + 1; answer = a - b; }
  else { a = Math.floor(r() * 11) + 2; b = Math.floor(r() * 11) + 2; answer = a * b; }
  return { text: `${a} ${op} ${b}`, answer };
}

// Generate an OddOneOut grid: 16 cells, one different emoji.
export function makeOddGrid(seed: number, idx: number): { emojis: string[]; oddIndex: number } {
  const r = mulberry32(seed + idx * 7919);
  const base = EMOJI_POOL[Math.floor(r() * EMOJI_POOL.length)]!;
  let odd = base;
  while (odd === base) odd = EMOJI_POOL[Math.floor(r() * EMOJI_POOL.length)]!;
  const oddIndex = Math.floor(r() * 16);
  const emojis = Array(16).fill(base);
  emojis[oddIndex] = odd;
  return { emojis, oddIndex };
}

// Pick N distinct emojis from the pool deterministically.
export function pickEmojiSequence(seed: number, n: number): string[] {
  const r = mulberry32(seed);
  const pool = [...EMOJI_POOL];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

// -------- Stroop ----------
export const STROOP_COLORS: Array<{ name: string; hex: string }> = [
  { name: "ROSSO",   hex: "#ef4444" },
  { name: "VERDE",   hex: "#22c55e" },
  { name: "BLU",     hex: "#3b82f6" },
  { name: "GIALLO",  hex: "#eab308" },
  { name: "VIOLA",   hex: "#a855f7" },
  { name: "ARANCIO", hex: "#f97316" },
];
export function makeStroop(seed: number, idx: number) {
  const r = mulberry32(seed + idx * 3571);
  const wordIdx = Math.floor(r() * STROOP_COLORS.length);
  const match = r() < 0.5;
  let colorIdx = wordIdx;
  if (!match) {
    while (colorIdx === wordIdx) colorIdx = Math.floor(r() * STROOP_COLORS.length);
  }
  return {
    word: STROOP_COLORS[wordIdx]!.name,
    hex: STROOP_COLORS[colorIdx]!.hex,
    match, // true = the word matches its display color
  };
}
export function scoreStroop(correct: number, wrong: number = 0): number {
  return Math.max(0, correct * 90 - wrong * 90);
}

// -------- Trivia ----------
export const TRIVIA_QUESTIONS: Array<{ q: string; choices: string[]; answer: number }> = [
  { q: "Qual è la capitale dell'Australia?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
  { q: "Chi ha dipinto la Gioconda?", choices: ["Michelangelo", "Leonardo da Vinci", "Raffaello", "Caravaggio"], answer: 1 },
  { q: "Quanti sono i pianeti del sistema solare?", choices: ["7", "8", "9", "10"], answer: 1 },
  { q: "In che anno è caduto il muro di Berlino?", choices: ["1987", "1989", "1991", "1993"], answer: 1 },
  { q: "Chi ha scritto la Divina Commedia?", choices: ["Petrarca", "Boccaccio", "Dante", "Manzoni"], answer: 2 },
  { q: "Qual è il fiume più lungo del mondo?", choices: ["Nilo", "Rio delle Amazzoni", "Yangtze", "Mississippi"], answer: 1 },
  { q: "Quante ossa ha un adulto?", choices: ["186", "206", "226", "246"], answer: 1 },
  { q: "Chi ha composto la Nona Sinfonia?", choices: ["Mozart", "Bach", "Beethoven", "Chopin"], answer: 2 },
  { q: "Simbolo chimico dell'oro?", choices: ["Or", "Au", "Ag", "Go"], answer: 1 },
  { q: "In che continente si trova l'Egitto?", choices: ["Asia", "Africa", "Europa", "Oceania"], answer: 1 },
  { q: "Chi ha vinto i Mondiali 2006?", choices: ["Francia", "Brasile", "Italia", "Germania"], answer: 2 },
  { q: "Qual è la lingua più parlata al mondo?", choices: ["Inglese", "Spagnolo", "Mandarino", "Hindi"], answer: 2 },
];
export function scoreTrivia(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 300 + Math.floor((timeLeft / durationMs) * 900);
}

// -------- CountEmoji ----------
export function makeCountGrid(seed: number): { emojis: string[]; target: string; count: number } {
  const r = mulberry32(seed);
  const size = 60; // 6x10
  const target = EMOJI_POOL[Math.floor(r() * EMOJI_POOL.length)]!;
  const otherPool = EMOJI_POOL.filter((e) => e !== target);
  const count = 5 + Math.floor(r() * 12); // 5..16
  const emojis: string[] = [];
  for (let i = 0; i < size; i++) emojis.push(otherPool[Math.floor(r() * otherPool.length)]!);
  // sprinkle target
  const positions = new Set<number>();
  while (positions.size < count) positions.add(Math.floor(r() * size));
  positions.forEach((p) => (emojis[p] = target));
  return { emojis, target, count };
}
export function scoreCountEmoji(guess: number, actual: number): number {
  const diff = Math.abs(guess - actual);
  if (diff === 0) return 1000;
  if (diff === 1) return 500;
  if (diff === 2) return 200;
  return 0;
}

// -------- FlagGuess ----------
export const FLAG_POOL: Array<{ flag: string; answers: string[] }> = [
  { flag: "🇮🇹", answers: ["italia", "italy"] },
  { flag: "🇫🇷", answers: ["francia", "france"] },
  { flag: "🇩🇪", answers: ["germania", "germany"] },
  { flag: "🇪🇸", answers: ["spagna", "spain"] },
  { flag: "🇯🇵", answers: ["giappone", "japan"] },
  { flag: "🇧🇷", answers: ["brasile", "brazil"] },
  { flag: "🇺🇸", answers: ["usa", "stati uniti", "america", "united states"] },
  { flag: "🇬🇧", answers: ["regno unito", "uk", "gran bretagna", "united kingdom", "inghilterra"] },
  { flag: "🇨🇦", answers: ["canada"] },
  { flag: "🇦🇺", answers: ["australia"] },
  { flag: "🇲🇽", answers: ["messico", "mexico"] },
  { flag: "🇦🇷", answers: ["argentina"] },
  { flag: "🇨🇳", answers: ["cina", "china"] },
  { flag: "🇮🇳", answers: ["india"] },
  { flag: "🇳🇱", answers: ["olanda", "paesi bassi", "netherlands", "holland"] },
  { flag: "🇵🇹", answers: ["portogallo", "portugal"] },
  { flag: "🇬🇷", answers: ["grecia", "greece"] },
  { flag: "🇸🇪", answers: ["svezia", "sweden"] },
  { flag: "🇳🇴", answers: ["norvegia", "norway"] },
  { flag: "🇨🇭", answers: ["svizzera", "switzerland"] },
];
export function normalizeFlagGuess(s: string): string {
  return s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "");
}
export function scoreFlagGuess(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 400 + Math.floor((timeLeft / durationMs) * 800);
}

// -------- HigherLower ----------
export const CITIES: Array<{ name: string; pop: number; emoji: string }> = [
  { name: "Tokyo",     pop: 37400000, emoji: "🇯🇵" },
  { name: "Delhi",     pop: 32900000, emoji: "🇮🇳" },
  { name: "Shanghai",  pop: 28500000, emoji: "🇨🇳" },
  { name: "São Paulo", pop: 22400000, emoji: "🇧🇷" },
  { name: "Città del Messico", pop: 22100000, emoji: "🇲🇽" },
  { name: "Cairo",     pop: 21800000, emoji: "🇪🇬" },
  { name: "Mumbai",    pop: 20700000, emoji: "🇮🇳" },
  { name: "Pechino",   pop: 20500000, emoji: "🇨🇳" },
  { name: "Dhaka",     pop: 22500000, emoji: "🇧🇩" },
  { name: "Osaka",     pop: 19100000, emoji: "🇯🇵" },
  { name: "New York",  pop: 18800000, emoji: "🇺🇸" },
  { name: "Karachi",   pop: 16800000, emoji: "🇵🇰" },
  { name: "Istanbul",  pop: 15500000, emoji: "🇹🇷" },
  { name: "Los Angeles", pop: 12500000, emoji: "🇺🇸" },
  { name: "Mosca",     pop: 12500000, emoji: "🇷🇺" },
  { name: "Parigi",    pop: 11200000, emoji: "🇫🇷" },
  { name: "Londra",    pop: 9500000,  emoji: "🇬🇧" },
  { name: "Bangkok",   pop: 10700000, emoji: "🇹🇭" },
  { name: "Roma",      pop: 4300000,  emoji: "🇮🇹" },
  { name: "Milano",    pop: 3200000,  emoji: "🇮🇹" },
  { name: "Berlino",   pop: 3700000,  emoji: "🇩🇪" },
  { name: "Madrid",    pop: 6700000,  emoji: "🇪🇸" },
];
export function makeHLPair(seed: number, idx: number) {
  const r = mulberry32(seed + idx * 6421);
  let a = Math.floor(r() * CITIES.length);
  let b = a;
  while (b === a || CITIES[a]!.pop === CITIES[b]!.pop) b = Math.floor(r() * CITIES.length);
  return { a: CITIES[a]!, b: CITIES[b]! };
}
export function scoreHigherLower(correct: number): number {
  return Math.max(0, correct * 130);
}

// -------- AimTrainer ----------
export function scoreAimTrainer(hits: number): number {
  return Math.max(0, hits * 80);
}
// deterministic target position stream (percentages, 6..94)
export function makeAimTarget(seed: number, idx: number): { x: number; y: number; size: number } {
  const r = mulberry32(seed + idx * 4111);
  return {
    x: 6 + r() * 88,
    y: 6 + r() * 88,
    size: 42 + Math.floor(r() * 30),
  };
}

// -------- Simon ----------
export function makeSimonSeq(seed: number, length: number): number[] {
  const r = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < length; i++) out.push(Math.floor(r() * 4));
  return out;
}
export function scoreSimon(streak: number): number {
  return Math.max(0, streak * 120);
}

// -------- ColorMatch ----------
export function makeColorMatch(seed: number, idx: number): { hex: string; choices: string[]; answer: number } {
  const r = mulberry32(seed + idx * 1223);
  function rndHex() {
    const c = () => Math.floor(r() * 256).toString(16).padStart(2, "0");
    return `#${c()}${c()}${c()}`;
  }
  const hex = rndHex();
  const answer = Math.floor(r() * 4);
  const choices = [rndHex(), rndHex(), rndHex(), rndHex()];
  choices[answer] = hex;
  return { hex, choices, answer };
}
export function scoreColorMatch(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 250 + Math.floor((timeLeft / durationMs) * 800);
}

// -------- PopBubbles ----------
export function scorePopBubbles(pops: number, bombs: number): number {
  return Math.max(0, pops * 60 - bombs * 120);
}

// -------- SpeedSort ----------
export function makeSortRound(seed: number, idx: number): number[] {
  const r = mulberry32(seed + idx * 8123);
  const nums = new Set<number>();
  while (nums.size < 6) nums.add(10 + Math.floor(r() * 90));
  const arr = [...nums];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
  return arr;
}
export function scoreSpeedSort(rounds: number): number {
  return Math.max(0, rounds * 180);
}

// -------- WhackMole ----------
export function makeMoleTick(seed: number, idx: number): { cell: number; isBomb: boolean } {
  const r = mulberry32(seed + idx * 2657);
  return { cell: Math.floor(r() * 9), isBomb: r() < 0.15 };
}
export function scoreWhackMole(hits: number, bombs: number): number {
  return Math.max(0, hits * 90 - bombs * 100);
}

// -------- EmojiRiddle ----------
export const EMOJI_RIDDLES: Array<{ emojis: string; answers: string[]; hint: string }> = [
  { emojis: "🦁👑", answers: ["il re leone", "re leone", "the lion king", "lion king"], hint: "Cartone Disney" },
  { emojis: "🚢🧊💔", answers: ["titanic"], hint: "Film del 1997" },
  { emojis: "👻🚫", answers: ["ghostbusters", "acchiappafantasmi"], hint: "Cazzimperterriti" },
  { emojis: "🕷️🕸️🧑", answers: ["spiderman", "spider-man", "uomo ragno"], hint: "Supereroe Marvel" },
  { emojis: "🦖🏝️", answers: ["jurassic park"], hint: "Dinosauri" },
  { emojis: "🧙‍♂️💍🌋", answers: ["il signore degli anelli", "signore degli anelli", "lord of the rings", "lotr"], hint: "Trilogia epica" },
  { emojis: "❄️👸⛄", answers: ["frozen"], hint: "Disney" },
  { emojis: "🐟🔎", answers: ["alla ricerca di nemo", "nemo", "finding nemo"], hint: "Pixar" },
  { emojis: "🍫🏭", answers: ["la fabbrica di cioccolato", "willy wonka", "charlie e la fabbrica di cioccolato"], hint: "Roald Dahl" },
  { emojis: "🧑‍🎤🦇", answers: ["batman"], hint: "DC" },
  { emojis: "🐝🎬", answers: ["bee movie"], hint: "Ape Seinfeld" },
  { emojis: "🚗⚡", answers: ["cars", "ritorno al futuro", "back to the future"], hint: "Auto veloce" },
];
export function normalizeRiddle(s: string): string {
  return s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
}
export function scoreEmojiRiddle(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 350 + Math.floor((timeLeft / durationMs) * 900);
}

// -------- NineTarget ----------
export function makeNineTarget(seed: number): { nums: number[]; target: number } {
  const r = mulberry32(seed);
  const nums: number[] = [];
  for (let i = 0; i < 9; i++) nums.push(1 + Math.floor(r() * 20));
  // pick 3..4 numbers as the "solution" so target is achievable
  const pickCount = 3 + Math.floor(r() * 2);
  const picks = new Set<number>();
  while (picks.size < pickCount) picks.add(Math.floor(r() * 9));
  let target = 0;
  picks.forEach((i) => (target += nums[i]!));
  return { nums, target };
}
export function scoreNineTarget(exact: boolean, diff: number, elapsedMs: number, durationMs: number): number {
  if (exact) {
    const timeLeft = Math.max(0, durationMs - elapsedMs);
    return 400 + Math.floor((timeLeft / durationMs) * 900);
  }
  if (diff <= 2) return 200;
  if (diff <= 5) return 80;
  return 0;
}

// -------- PatternCopy ----------
export function makePattern(seed: number): boolean[] {
  const r = mulberry32(seed);
  const count = 4 + Math.floor(r() * 3); // 4..6 cells
  const lit = new Set<number>();
  while (lit.size < count) lit.add(Math.floor(r() * 9));
  return Array.from({ length: 9 }, (_, i) => lit.has(i));
}
export function scorePatternCopy(correct: number, wrong: number, total: number): number {
  const perfect = correct === total && wrong === 0;
  return Math.max(0, correct * 150 - wrong * 80 + (perfect ? 250 : 0));
}

// -------- TrueFalse ----------
export const TRUE_FALSE_FACTS: Array<{ q: string; ans: boolean }> = [
  { q: "La Grande Muraglia cinese è visibile dallo spazio a occhio nudo", ans: false },
  { q: "Il miele non scade mai", ans: true },
  { q: "I pesci rossi hanno 3 secondi di memoria", ans: false },
  { q: "Il Sole è una stella", ans: true },
  { q: "I pipistrelli sono ciechi", ans: false },
  { q: "L'acqua bolle a 100°C al livello del mare", ans: true },
  { q: "Un fulmine è più caldo della superficie del Sole", ans: true },
  { q: "Gli struzzi nascondono la testa nella sabbia", ans: false },
  { q: "Un anno su Venere dura più di un giorno su Venere", ans: false },
  { q: "Il cuore umano batte in media 100 volte al minuto", ans: false },
  { q: "Il ghepardo è l'animale terrestre più veloce", ans: true },
  { q: "Napoli è la capitale d'Italia", ans: false },
  { q: "Il DNA umano è al 50% uguale a quello di una banana", ans: true },
  { q: "Marte ha due lune", ans: true },
  { q: "I polpi hanno tre cuori", ans: true },
  { q: "La Torre Eiffel è più alta di giorno che di notte", ans: true },
  { q: "L'oro è un metallo commestibile", ans: true },
  { q: "Il ferro è attratto da tutti i magneti a qualsiasi temperatura", ans: false },
  { q: "I delfini dormono con metà cervello alla volta", ans: true },
  { q: "Il pianeta più caldo del sistema solare è Mercurio", ans: false },
];
export function makeTrueFalse(seed: number, idx: number) {
  const r = mulberry32(seed + idx * 7331);
  return TRUE_FALSE_FACTS[Math.floor(r() * TRUE_FALSE_FACTS.length)]!;
}
export function scoreTrueFalse(correct: number, wrong: number): number {
  return Math.max(0, correct * 100 - wrong * 100);
}

// -------- RhythmTap ----------
export type RhythmBeat = { at: number; kind: "normal" | "big" };
export function makeRhythmBeats(seed: number, durationMs: number): RhythmBeat[] {
  const r = mulberry32(seed);
  const beats: RhythmBeat[] = [];
  const interval = 700; // ms base
  let t = 1200;
  while (t < durationMs - 400) {
    beats.push({ at: t, kind: r() < 0.2 ? "big" : "normal" });
    t += interval - Math.floor(r() * 120);
  }
  return beats;
}
export function scoreRhythmTap(perfect: number, good: number, miss: number): number {
  return Math.max(0, perfect * 150 + good * 60 - miss * 30);
}

// -------- StackTower ----------
export function scoreStackTower(layers: number): number {
  return Math.max(0, layers * 90);
}

// -------- Snake ----------
export function scoreSnake(apples: number): number {
  return Math.max(0, apples * 100);
}
export function makeSnakeApples(seed: number, count: number, grid: number): Array<{ x: number; y: number }> {
  const r = mulberry32(seed);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: Math.floor(r() * grid), y: Math.floor(r() * grid) });
  }
  return out;
}

// -------- PerfectCircle ----------
/** Given a set of points, return circularity score 0..1 (1 = perfect circle). */
export function circularity(points: Array<{ x: number; y: number }>): number {
  if (points.length < 8) return 0;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const dists = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
  if (mean < 4) return 0;
  const variance = dists.reduce((s, d) => s + (d - mean) * (d - mean), 0) / dists.length;
  const std = Math.sqrt(variance);
  const cv = std / mean; // coefficient of variation
  // 0 cv = perfect. Map cv 0..0.35 to 1..0
  const score = Math.max(0, 1 - cv / 0.35);
  return score;
}
export function scorePerfectCircle(circularity01: number): number {
  return Math.floor(circularity01 * 1200);
}

// -------- CardMatch ----------
export function makeCardDeck(seed: number, pairs: number = 8): string[] {
  const r = mulberry32(seed);
  const pool = [...EMOJI_POOL];
  const chosen: string[] = [];
  for (let i = 0; i < pairs; i++) {
    const idx = Math.floor(r() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]!);
  }
  const deck = [...chosen, ...chosen];
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [deck[i]!, deck[j]!] = [deck[j]!, deck[i]!];
  }
  return deck;
}
export function scoreCardMatch(pairs: number, misses: number, allFound: boolean): number {
  const base = pairs * 130 - misses * 25;
  return Math.max(0, base + (allFound ? 250 : 0));
}

// -------- GuessNumber ----------
export function makeGuessTarget(seed: number): number {
  const r = mulberry32(seed);
  return 1 + Math.floor(r() * 100);
}
export function scoreGuessNumber(tries: number, found: boolean): number {
  if (!found) return 0;
  // Best case: 1 try = 1000, 7 tries ~ 400, 10+ tries ~ 100.
  return Math.max(0, 1050 - tries * 90);
}

// -------- SequenceNext ----------
export function makeSequence(seed: number, idx: number): { series: number[]; answer: number; choices: number[] } {
  const r = mulberry32(seed + idx * 5501);
  const type = Math.floor(r() * 3); // 0 arith, 1 geom, 2 fib-like
  let series: number[] = [];
  let answer = 0;
  if (type === 0) {
    const start = 1 + Math.floor(r() * 12);
    const step = 2 + Math.floor(r() * 8);
    series = [start, start + step, start + 2 * step, start + 3 * step];
    answer = start + 4 * step;
  } else if (type === 1) {
    const start = 1 + Math.floor(r() * 4);
    const ratio = 2 + Math.floor(r() * 2);
    series = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio];
    answer = series[3]! * ratio;
  } else {
    const a = 1 + Math.floor(r() * 5);
    const b = 1 + Math.floor(r() * 5);
    series = [a, b, a + b, a + 2 * b];
    answer = 2 * a + 3 * b;
  }
  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const delta = (Math.floor(r() * 7) - 3) || 2;
    const cand = answer + delta * (1 + Math.floor(r() * 3));
    if (cand > 0 && !choices.has(cand)) choices.add(cand);
  }
  const arr = [...choices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
  return { series, answer, choices: arr };
}
export function scoreSequenceNext(correct: number, wrong: number): number {
  return Math.max(0, correct * 130 - wrong * 60);
}

// -------- Capitals ----------
export const CAPITALS_POOL: Array<{ country: string; flag: string; capital: string; distractors: string[] }> = [
  { country: "Italia",     flag: "🇮🇹", capital: "Roma",       distractors: ["Milano", "Napoli", "Firenze"] },
  { country: "Francia",    flag: "🇫🇷", capital: "Parigi",     distractors: ["Lione", "Marsiglia", "Nizza"] },
  { country: "Germania",   flag: "🇩🇪", capital: "Berlino",    distractors: ["Monaco", "Amburgo", "Francoforte"] },
  { country: "Spagna",     flag: "🇪🇸", capital: "Madrid",     distractors: ["Barcellona", "Siviglia", "Valencia"] },
  { country: "Portogallo", flag: "🇵🇹", capital: "Lisbona",    distractors: ["Porto", "Braga", "Coimbra"] },
  { country: "Regno Unito",flag: "🇬🇧", capital: "Londra",     distractors: ["Manchester", "Liverpool", "Edimburgo"] },
  { country: "Grecia",     flag: "🇬🇷", capital: "Atene",      distractors: ["Salonicco", "Patrasso", "Sparta"] },
  { country: "Svizzera",   flag: "🇨🇭", capital: "Berna",      distractors: ["Zurigo", "Ginevra", "Basilea"] },
  { country: "Olanda",     flag: "🇳🇱", capital: "Amsterdam",  distractors: ["Rotterdam", "L'Aia", "Utrecht"] },
  { country: "Belgio",     flag: "🇧🇪", capital: "Bruxelles",  distractors: ["Anversa", "Bruges", "Gand"] },
  { country: "Svezia",     flag: "🇸🇪", capital: "Stoccolma",  distractors: ["Göteborg", "Malmö", "Uppsala"] },
  { country: "Norvegia",   flag: "🇳🇴", capital: "Oslo",       distractors: ["Bergen", "Trondheim", "Stavanger"] },
  { country: "Danimarca",  flag: "🇩🇰", capital: "Copenaghen", distractors: ["Aarhus", "Odense", "Aalborg"] },
  { country: "Polonia",    flag: "🇵🇱", capital: "Varsavia",   distractors: ["Cracovia", "Danzica", "Poznań"] },
  { country: "Turchia",    flag: "🇹🇷", capital: "Ankara",     distractors: ["Istanbul", "Smirne", "Bursa"] },
  { country: "Australia",  flag: "🇦🇺", capital: "Canberra",   distractors: ["Sydney", "Melbourne", "Perth"] },
  { country: "Canada",     flag: "🇨🇦", capital: "Ottawa",     distractors: ["Toronto", "Montreal", "Vancouver"] },
  { country: "Brasile",    flag: "🇧🇷", capital: "Brasilia",   distractors: ["Rio de Janeiro", "San Paolo", "Salvador"] },
  { country: "Argentina",  flag: "🇦🇷", capital: "Buenos Aires", distractors: ["Córdoba", "Rosario", "Mendoza"] },
  { country: "Egitto",     flag: "🇪🇬", capital: "Il Cairo",   distractors: ["Alessandria", "Giza", "Luxor"] },
];
export function scoreCapitals(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 300 + Math.floor((timeLeft / durationMs) * 800);
}

// -------- PieChart ----------
export function makePieRound(seed: number): { percent: number; hue: number } {
  const r = mulberry32(seed);
  const percent = 5 + Math.floor(r() * 91); // 5..95
  const hue = Math.floor(r() * 360);
  return { percent, hue };
}
export function scorePieChart(guess: number, actual: number): number {
  const diff = Math.abs(guess - actual);
  return Math.max(0, 1000 - diff * 40);
}

// -------- TypoHunt ----------
/** Each entry: sentence words, plus the index of the misspelled word. */
export const TYPO_POOL: Array<{ words: string[]; typoIndex: number; correct: string }> = [
  { words: ["Il", "gato", "dorme", "sul", "divano", "rosso"], typoIndex: 1, correct: "gatto" },
  { words: ["Ieri", "ho", "mangiato", "una", "pizza", "buonissma"], typoIndex: 5, correct: "buonissima" },
  { words: ["Il", "sole", "splende", "in", "cielo", "azuro"], typoIndex: 5, correct: "azzurro" },
  { words: ["La", "mia", "amika", "arriva", "domani", "sera"], typoIndex: 2, correct: "amica" },
  { words: ["Andiamo", "al", "mare", "in", "macchna", "presto"], typoIndex: 4, correct: "macchina" },
  { words: ["Le", "stele", "brillano", "nel", "cielo", "notturno"], typoIndex: 1, correct: "stelle" },
  { words: ["Ho", "comprato", "un", "libbro", "molto", "interessante"], typoIndex: 3, correct: "libro" },
  { words: ["Il", "cane", "abbaia", "contro", "la", "pota"], typoIndex: 5, correct: "porta" },
  { words: ["Domani", "faremo", "una", "gita", "in", "montangna"], typoIndex: 5, correct: "montagna" },
  { words: ["La", "chitara", "è", "il", "mio", "strumento"], typoIndex: 1, correct: "chitarra" },
  { words: ["Amo", "il", "sapore", "del", "cafè", "italiano"], typoIndex: 4, correct: "caffè" },
  { words: ["Guarda", "quel", "belissimo", "tramonto", "sul", "mare"], typoIndex: 2, correct: "bellissimo" },
  { words: ["Il", "bambino", "ride", "e", "corre", "felicce"], typoIndex: 5, correct: "felice" },
  { words: ["Ho", "perso", "le", "chiavi", "della", "makina"], typoIndex: 5, correct: "macchina" },
  { words: ["La", "ricetta", "vuole", "farrina", "zucchero", "e", "uova"], typoIndex: 3, correct: "farina" },
];
export function makeTypoRound(seed: number): typeof TYPO_POOL[number] {
  const r = mulberry32(seed);
  return TYPO_POOL[Math.floor(r() * TYPO_POOL.length)]!;
}
export function scoreTypoHunt(correct: boolean, elapsedMs: number, durationMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 350 + Math.floor((timeLeft / durationMs) * 850);
}




// -------- MemoryDigits ----------
export function makeMemoryDigits(seed: number): { digits: string } {
  const r = mulberry32(seed);
  let out = "";
  for (let i = 0; i < 6; i++) out += Math.floor(r() * 10).toString();
  return { digits: out };
}
export function scoreMemoryDigits(correctChars: number, total: number): number {
  const bonus = correctChars === total ? 400 : 0;
  return correctChars * 180 + bonus;
}

// -------- AnagramSprint ----------
export function scoreAnagramSprint(correct: number, wrong: number): number {
  return Math.max(0, correct * 200 - wrong * 60);
}

// -------- FindPair ----------
export function makeFindPair(seed: number, size: number = 20): { emojis: string[]; pair: [number, number] } {
  const r = mulberry32(seed);
  const pool = [...EMOJI_POOL];
  const picks: string[] = [];
  for (let i = 0; i < size && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    picks.push(pool.splice(idx, 1)[0]!);
  }
  const dupSrc = Math.floor(r() * size);
  let dupDst = Math.floor(r() * size);
  while (dupDst === dupSrc) dupDst = Math.floor(r() * size);
  picks[dupDst] = picks[dupSrc]!;
  return { emojis: picks, pair: [dupSrc, dupDst] };
}
export function scoreFindPair(found: boolean, elapsedMs: number, durationMs: number): number {
  if (!found) return 0;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return 400 + Math.floor((timeLeft / durationMs) * 900);
}

// -------- ConnectDots ----------
export function makeConnectDots(seed: number, n: number = 12): Array<{ x: number; y: number; n: number }> {
  const r = mulberry32(seed);
  const dots: Array<{ x: number; y: number; n: number }> = [];
  let attempts = 0;
  while (dots.length < n && attempts < 800) {
    attempts++;
    const x = 8 + r() * 84;
    const y = 8 + r() * 84;
    if (dots.every((d) => Math.hypot(d.x - x, d.y - y) > 14)) {
      dots.push({ x, y, n: dots.length + 1 });
    }
  }
  return dots;
}
export function scoreConnectDots(connected: number, total: number, elapsedMs: number, durationMs: number): number {
  const base = connected * 90;
  if (connected < total) return base;
  const timeLeft = Math.max(0, durationMs - elapsedMs);
  return base + 200 + Math.floor((timeLeft / durationMs) * 700);
}

// -------- GoNoGo ----------
export type GoNoGoStim = { at: number; go: boolean };
export function makeGoNoGoStream(seed: number, durationMs: number): GoNoGoStim[] {
  const r = mulberry32(seed);
  const out: GoNoGoStim[] = [];
  let t = 800;
  while (t < durationMs - 500) {
    out.push({ at: t, go: r() < 0.7 });
    t += 700 + Math.floor(r() * 400);
  }
  return out;
}
export function scoreGoNoGo(hits: number, misses: number, falseAlarms: number): number {
  return Math.max(0, hits * 110 - misses * 40 - falseAlarms * 150);
}

// -------- SpotDiff ----------
export function makeSpotDiff(seed: number, idx: number): { grid: string[]; diffIdx: number; diffEmoji: string; baseEmoji: string } {
  const r = mulberry32(seed + idx * 4813);
  const size = 16;
  const base = EMOJI_POOL[Math.floor(r() * EMOJI_POOL.length)]!;
  let diff = base;
  while (diff === base) diff = EMOJI_POOL[Math.floor(r() * EMOJI_POOL.length)]!;
  const diffIdx = Math.floor(r() * size);
  const grid = Array(size).fill(base);
  grid[diffIdx] = diff;
  return { grid, diffIdx, diffEmoji: diff, baseEmoji: base };
}
export function scoreSpotDiff(correct: number, wrong: number): number {
  return Math.max(0, correct * 130 - wrong * 90);
}

// -------- MathTruth ----------
export function makeMathTruth(seed: number, idx: number): { text: string; shown: number; correct: boolean } {
  const r = mulberry32(seed + idx * 8117);
  const prob = makeMathProblem(seed + 12345, idx);
  const isCorrect = r() < 0.55;
  const off = (Math.floor(r() * 5) + 1) * (r() < 0.5 ? -1 : 1);
  const shown = isCorrect ? prob.answer : prob.answer + off;
  return { text: `${prob.text} = ${shown}`, shown, correct: isCorrect };
}
export function scoreMathTruth(correct: number, wrong: number): number {
  return Math.max(0, correct * 110 - wrong * 100);
}

// -------- QuickBiggest ----------
export function makeQuickBiggest(seed: number, idx: number): { nums: number[]; answer: number } {
  const r = mulberry32(seed + idx * 2011);
  const set = new Set<number>();
  while (set.size < 4) set.add(10 + Math.floor(r() * 990));
  const nums = [...set];
  let ans = 0;
  for (let i = 1; i < nums.length; i++) if (nums[i]! > nums[ans]!) ans = i;
  return { nums, answer: ans };
}
export function scoreQuickBiggest(correct: number, wrong: number): number {
  return Math.max(0, correct * 90 - wrong * 100);
}

// -------- LetterPop ----------
export type LetterSpawn = { at: number; letter: string; vowel: boolean; x: number; y: number };
const LP_VOWELS = "AEIOU";
const LP_CONS = "BCDFGHLMNPQRSTVZ";
export function makeLetterPopStream(seed: number, durationMs: number): LetterSpawn[] {
  const r = mulberry32(seed);
  const out: LetterSpawn[] = [];
  let t = 400;
  while (t < durationMs - 800) {
    const isVowel = r() < 0.45;
    const src = isVowel ? LP_VOWELS : LP_CONS;
    out.push({
      at: t,
      letter: src[Math.floor(r() * src.length)]!,
      vowel: isVowel,
      x: 6 + r() * 88,
      y: 10 + r() * 72,
    });
    t += 520 + Math.floor(r() * 260);
  }
  return out;
}
export function scoreLetterPop(vowels: number, cons: number, missed: number): number {
  return Math.max(0, vowels * 90 - cons * 100 - missed * 15);
}

// -------- CoinSplit ----------
export function makeCoinSplit(seed: number, idx: number): { coins: number[] } {
  const r = mulberry32(seed + idx * 3313);
  for (let tries = 0; tries < 30; tries++) {
    const coins: number[] = [];
    for (let i = 0; i < 6; i++) coins.push(2 + Math.floor(r() * 20));
    const sum = coins.reduce((a, b) => a + b, 0);
    if (sum % 2 !== 0) continue;
    const target = sum / 2;
    let ok = false;
    for (let m = 1; m < 63 && !ok; m++) {
      let s = 0;
      for (let i = 0; i < 6; i++) if (m & (1 << i)) s += coins[i]!;
      if (s === target) ok = true;
    }
    if (ok) return { coins };
  }
  return { coins: [3, 4, 5, 6, 7, 5] };
}
export function scoreCoinSplit(solved: number, wrong: number): number {
  return Math.max(0, solved * 220 - wrong * 40);
}
