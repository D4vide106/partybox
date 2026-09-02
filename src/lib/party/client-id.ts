// Persistent per-browser identity for party players (no auth).
// Read/write only on the client — never during SSR.

const KEY = "partybox_client_id";
const NICK_KEY = "partybox_nickname";
const AVATAR_KEY = "partybox_avatar";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getSavedNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NICK_KEY) ?? "";
}

export function saveNickname(nick: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NICK_KEY, nick);
}

export function getSavedAvatar(): string {
  if (typeof window === "undefined") return "capital";
  const saved = localStorage.getItem(AVATAR_KEY);
  return AVATAR_OPTIONS.some((a) => a.id === saved) ? saved! : "capital";
}

export function saveAvatar(a: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_KEY, a);
}

export type AvatarOption = { id: string; label: string; icon: string; accent: string };

// Professional avatar library: icon-based, no emoji glyph rendering.
export const AVATAR_CATEGORIES: { label: string; avatars: AvatarOption[] }[] = [
  {
    label: "Classic",
    avatars: [
      { id: "capital", label: "Capital", icon: "landmark", accent: "#8b5cf6" },
      { id: "founder", label: "Founder", icon: "crown", accent: "#f59e0b" },
      { id: "strategist", label: "Strategist", icon: "shield", accent: "#14b8a6" },
      { id: "dealer", label: "Dealer", icon: "diamond", accent: "#ec4899" },
    ],
  },
  {
    label: "Cities",
    avatars: [
      { id: "metro", label: "Metro", icon: "building", accent: "#06b6d4" },
      { id: "terminal", label: "Terminal", icon: "plane", accent: "#64748b" },
      { id: "prestige", label: "Prestige", icon: "gem", accent: "#22c55e" },
      { id: "summit", label: "Summit", icon: "trophy", accent: "#f97316" },
    ],
  },
  {
    label: "Neon",
    avatars: [
      { id: "signal", label: "Signal", icon: "sparkles", accent: "#a855f7" },
      { id: "orbit", label: "Orbit", icon: "star", accent: "#38bdf8" },
      { id: "automata", label: "Automata", icon: "bot", accent: "#ef4444" },
      { id: "player", label: "Player", icon: "user", accent: "#84cc16" },
    ],
  },
];

export const AVATAR_OPTIONS: AvatarOption[] = AVATAR_CATEGORIES.flatMap((c) => c.avatars);
export const AVATAR_EMOJIS: string[] = AVATAR_OPTIONS.map((a) => a.id);

const NICK_ADJ = [
  "Prime","Capital","Royal","Metro","Urban","Noble","Vector","Apex","Summit","Nova",
  "Sterling","Atlas","Vertex","Cobalt","Quartz","Titan","Meridian","Onyx","Vanta","Lunar",
];
const NICK_NOUN = [
  "Broker","Player","Baron","Tycoon","Founder","Dealer","Mayor","Pilot","Banker","Agent",
  "Builder","Owner","Trader","Host","Strategist","Director","Captain","Chief","Architect","Partner",
];

export function randomNickname(): string {
  const a = NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)];
  const n = NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${a}${n}${num}`.slice(0, 16);
}
