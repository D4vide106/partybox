import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { loadAudioPrefs, saveAudioPrefs, sfx, type AudioPrefs } from "@/lib/party/audio";

export function AudioSettings() {
  const [prefs, setPrefs] = useState<AudioPrefs>({ enabled: true, volume: 0.6 });
  const [open, setOpen] = useState(false);

  useEffect(() => { setPrefs(loadAudioPrefs()); }, []);

  function update(next: AudioPrefs) {
    setPrefs(next);
    saveAudioPrefs(next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); sfx.click(); }}
        aria-label={prefs.enabled ? "Impostazioni audio (attivo)" : "Impostazioni audio (silenzioso)"}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card/70 backdrop-blur hover:bg-card transition"
      >
        {prefs.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Chiudi impostazioni audio"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-black">Audio</div>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <label className="flex items-center justify-between mb-3 text-sm">
              <span className="font-bold">Effetti sonori</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.enabled}
                onClick={() => { const n = { ...prefs, enabled: !prefs.enabled }; update(n); if (n.enabled) sfx.click(); }}
                className={`relative h-6 w-11 rounded-full transition ${prefs.enabled ? "bg-primary" : "bg-secondary"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${prefs.enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </label>

            <label className="block text-xs font-bold mb-1 text-muted-foreground">
              Volume · {Math.round(prefs.volume * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(prefs.volume * 100)}
              disabled={!prefs.enabled}
              onChange={(e) => update({ ...prefs, volume: Number(e.target.value) / 100 })}
              onMouseUp={() => sfx.click()}
              onTouchEnd={() => sfx.click()}
              className="w-full accent-primary disabled:opacity-40"
              aria-label="Volume"
            />

            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <button type="button" onClick={() => sfx.correct()} disabled={!prefs.enabled} className="rounded-lg bg-secondary/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40">
                OK
              </button>
              <button type="button" onClick={() => sfx.wrong()} disabled={!prefs.enabled} className="rounded-lg bg-secondary/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40">
                Sbagliato
              </button>
              <button type="button" onClick={() => sfx.victory()} disabled={!prefs.enabled} className="rounded-lg bg-secondary/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40">
                Win
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
