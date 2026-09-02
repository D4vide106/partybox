import { useMemo, useState } from "react";
import {
  Settings2, X, Clock, Users2, Repeat, Vote, MessageCircle,
  Timer, Gauge, PlayCircle, Landmark, Coins,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Room } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";

type Tab = "general" | "rounds" | "moderation" | "monopoly";

export function HostSettings({ room }: { room: Room }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);

  const initial = useMemo(() => ({
    roundDurationSec: room.settings?.roundDurationSec ?? 0,
    votekickThresholdPct: room.settings?.votekickThresholdPct ?? 60,
    allowRepeatGames: room.settings?.allowRepeatGames ?? true,
    intermissionSec: room.settings?.intermissionSec ?? 4,
    autoAdvance: room.settings?.autoAdvance ?? false,
    minPlayersToStart: room.settings?.minPlayersToStart ?? 2,
    chatEnabled: room.settings?.chatEnabled !== false,
    difficulty: room.settings?.difficulty ?? "normal",
    disconnect_timeout_sec: room.disconnect_timeout_sec,
    monopolyStartCash: room.settings?.monopolyStartCash ?? 1500,
    monopolyGoBonus: room.settings?.monopolyGoBonus ?? 200,
    monopolyJailFee: room.settings?.monopolyJailFee ?? 50,
  }), [room.settings, room.disconnect_timeout_sec]);

  const [dur, setDur] = useState(initial.roundDurationSec);
  const [pct, setPct] = useState(initial.votekickThresholdPct);
  const [rep, setRep] = useState(initial.allowRepeatGames);
  const [tim, setTim] = useState(initial.disconnect_timeout_sec);
  const [inter, setInter] = useState(initial.intermissionSec);
  const [auto, setAuto] = useState(initial.autoAdvance);
  const [minP, setMinP] = useState(initial.minPlayersToStart);
  const [chat, setChat] = useState(initial.chatEnabled);
  const [diff, setDiff] = useState<"easy" | "normal" | "hard">(initial.difficulty);
  const [mCash, setMCash] = useState(initial.monopolyStartCash);
  const [mGo, setMGo] = useState(initial.monopolyGoBonus);
  const [mJail, setMJail] = useState(initial.monopolyJailFee);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("rooms")
      .update({
        settings: {
          roundDurationSec: dur,
          votekickThresholdPct: pct,
          allowRepeatGames: rep,
          intermissionSec: inter,
          autoAdvance: auto,
          minPlayersToStart: minP,
          chatEnabled: chat,
          difficulty: diff,
          monopolyStartCash: mCash,
          monopolyGoBonus: mGo,
          monopolyJailFee: mJail,
        },
        disconnect_timeout_sec: tim,
      })
      .eq("id", room.id);
    setSaving(false);
    if (error) { toast.error("Errore salvataggio impostazioni"); return; }
    toast.success("Impostazioni salvate");
    sfx.correct();
    setOpen(false);
  }

  const TabBtn = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => { setTab(id); sfx.click(); }}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
        tab === id ? "bg-primary text-primary-foreground shadow-neon" : "text-muted-foreground hover:bg-secondary"
      }`}
      aria-pressed={tab === id}
    >
      {icon}{label}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); sfx.click(); }}
        aria-label="Impostazioni host"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-4 py-2 text-sm font-bold hover:bg-card transition min-h-11"
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Impostazioni</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-label="Impostazioni host">
          <div className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 animate-in slide-in-from-bottom sm:zoom-in-95 shadow-2xl max-h-[92dvh] flex flex-col">
            <header className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2"><Settings2 className="h-5 w-5" /> Impostazioni</h2>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <nav className="flex gap-1 rounded-2xl bg-secondary/40 p-1 mb-4 shrink-0 overflow-x-auto" aria-label="Sezioni">
              <TabBtn id="general" label="Generale" icon={<Gauge className="h-3.5 w-3.5" />} />
              <TabBtn id="rounds" label="Round" icon={<Timer className="h-3.5 w-3.5" />} />
              <TabBtn id="moderation" label="Regole" icon={<Vote className="h-3.5 w-3.5" />} />
              <TabBtn id="monopoly" label="Monopoly" icon={<Landmark className="h-3.5 w-3.5" />} />
            </nav>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
              {tab === "general" && (
                <>
                  <Field icon={<Users2 className="h-4 w-4" />} label="Minimo giocatori per iniziare" hint={`${minP} giocatori attivi`}>
                    <Slider min={1} max={8} step={1} value={minP} onChange={setMinP} labels={["1","2","4","8"]} />
                  </Field>
                  <ToggleField icon={<MessageCircle className="h-4 w-4" />} label="Chat abilitata" hint="Se OFF nessuno può usare la chat" checked={chat} onChange={setChat} />
                  <Field icon={<Gauge className="h-4 w-4" />} label="Difficoltà" hint="Modifica tempi e complessità dei giochi">
                    <div className="grid grid-cols-3 gap-2">
                      {(["easy","normal","hard"] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => { setDiff(d); sfx.click(); }}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black transition min-h-11 ${
                            diff === d
                              ? d === "easy" ? "bg-green-500 text-white"
                                : d === "hard" ? "bg-destructive text-destructive-foreground"
                                : "bg-primary text-primary-foreground shadow-neon"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
                          }`}
                          aria-pressed={diff === d}
                        >
                          {d === "easy" ? "Facile" : d === "hard" ? "Difficile" : "Normale"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {tab === "rounds" && (
                <>
                  <Field icon={<Clock className="h-4 w-4" />} label="Durata round (override)" hint={dur === 0 ? "Usa la durata di default di ogni gioco" : `${dur} secondi per ogni round`}>
                    <Slider min={0} max={90} step={5} value={dur} onChange={setDur} labels={["Auto","15s","45s","90s"]} />
                  </Field>
                  <Field icon={<Timer className="h-4 w-4" />} label="Pausa tra i round" hint={`${inter} secondi di pausa risultati`}>
                    <Slider min={2} max={15} step={1} value={inter} onChange={setInter} labels={["2s","5s","10s","15s"]} />
                  </Field>
                  <ToggleField icon={<PlayCircle className="h-4 w-4" />} label="Avanzamento automatico" hint="Se ON, non serve premere 'Prossimo round'" checked={auto} onChange={setAuto} />
                  <ToggleField icon={<Repeat className="h-4 w-4" />} label="Consenti ripetizioni" hint="Se OFF, ogni round pesca un mini-gioco diverso finché possibile" checked={rep} onChange={setRep} />
                </>
              )}

              {tab === "moderation" && (
                <>
                  <Field icon={<Vote className="h-4 w-4" />} label="Soglia votekick" hint={`Serve ≈ ${pct}% dei giocatori attivi per espellere`}>
                    <Slider min={34} max={100} step={1} value={pct} onChange={setPct} labels={["34%","50%","75%","100%"]} />
                  </Field>
                  <Field icon={<Users2 className="h-4 w-4" />} label="Timeout disconnessione" hint={`Un giocatore fermo per ${tim}s viene marcato offline`}>
                    <Slider min={10} max={60} step={5} value={tim} onChange={setTim} labels={["10s","30s","60s"]} />
                  </Field>
                </>
              )}

              {tab === "monopoly" && (
                <>
                  <Field icon={<Coins className="h-4 w-4" />} label="Cash iniziale" hint={`Ogni giocatore parte con $${mCash}`}>
                    <Slider min={500} max={3000} step={100} value={mCash} onChange={setMCash} labels={["$500","$1500","$2500","$3000"]} />
                  </Field>
                  <Field icon={<PlayCircle className="h-4 w-4" />} label="Bonus GO" hint={`+$${mGo} passando dal VIA`}>
                    <Slider min={0} max={500} step={50} value={mGo} onChange={setMGo} labels={["$0","$200","$350","$500"]} />
                  </Field>
                  <Field icon={<Landmark className="h-4 w-4" />} label="Cauzione prigione" hint={`$${mJail} per uscire dalla prigione`}>
                    <Slider min={0} max={200} step={25} value={mJail} onChange={setMJail} labels={["$0","$50","$100","$200"]} />
                  </Field>
                  <div className="text-[11px] text-muted-foreground italic px-1">
                    Le impostazioni Monopoly si applicano alla prossima partita.
                  </div>
                </>
              )}
            </div>


            <div className="flex gap-2 mt-5 shrink-0">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-secondary transition min-h-11">
                Annulla
              </button>
              <button type="button" onClick={save} disabled={saving}
                className="flex-1 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-black shadow-neon disabled:opacity-40 min-h-11">
                {saving ? "Salvo…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ icon, label, hint, children }: { icon: React.ReactNode; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div className="font-bold text-sm">{label}</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{hint}</div>
      {children}
    </div>
  );
}

function ToggleField({ icon, label, hint, checked, onChange }: {
  icon: React.ReactNode; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-3 cursor-pointer hover:bg-secondary/60 transition">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <input
        type="checkbox" checked={checked}
        onChange={(e) => { onChange(e.target.checked); sfx.click(); }}
        className="accent-primary h-5 w-5 shrink-0 mt-1"
        aria-label={label}
      />
    </label>
  );
}

function Slider({ min, max, step, value, onChange, labels }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; labels: string[];
}) {
  return (
    <>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-2" />
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-1">
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </>
  );
}
