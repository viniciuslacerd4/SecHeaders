/**
 * hackSound.js — Som 8-bit estilo hacker para notificação de sucesso.
 * Usa Web Audio API com oscilador square wave (som retrô/8-bit).
 */
export function playHackSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    // 5 notas em F# minor pentatonic — soa dark/underground
    const notes = [
      { freq: 185, dur: 0.07 },  // F#3
      { freq: 277, dur: 0.07 },  // C#4
      { freq: 370, dur: 0.07 },  // F#4
      { freq: 554, dur: 0.07 },  // C#5
      { freq: 740, dur: 0.25 },  // F#5 — nota longa final
    ]

    let time = ctx.currentTime

    notes.forEach(({ freq, dur }, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Square wave = som 8-bit clássico
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, time)

      // Última nota: leve vibrato 8-bit (LFO rápido no pitch)
      if (i === notes.length - 1) {
        osc.frequency.setValueAtTime(freq, time)
        osc.frequency.linearRampToValueAtTime(freq * 1.02, time + 0.05)
        osc.frequency.linearRampToValueAtTime(freq, time + 0.10)
        osc.frequency.linearRampToValueAtTime(freq * 1.02, time + 0.15)
        osc.frequency.linearRampToValueAtTime(freq, time + 0.20)
      }

      // Volume baixo + decay rápido (envelop attack/release 8-bit)
      gain.gain.setValueAtTime(0.0, time)
      gain.gain.linearRampToValueAtTime(0.13, time + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(time)
      osc.stop(time + dur + 0.01)

      // Notas se sobrepõem levemente para soar arpejado
      time += dur * 0.8
    })

    setTimeout(() => ctx.close(), 2000)
  } catch {
    // silent fail — se o browser não suportar AudioContext
  }
}
