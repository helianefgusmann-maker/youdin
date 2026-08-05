/** Toca um som curto de "caixa registradora" usando Web Audio (sem arquivo externo). */
export function tocarSomDinheiro() {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  try {
    const ctx = new Ctx();
    const agora = ctx.currentTime;

    const ding = (freq: number, inicio: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, agora + inicio);
      gain.gain.setValueAtTime(0, agora + inicio);
      gain.gain.linearRampToValueAtTime(vol, agora + inicio + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + inicio + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(agora + inicio);
      osc.stop(agora + inicio + dur + 0.02);
    };

    // "ka-ching"
    ding(1318.5, 0, 0.18, 0.22);
    ding(1760, 0.06, 0.35, 0.18);
    ding(2637, 0.08, 0.3, 0.08);

    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    /* som é opcional */
  }
}
