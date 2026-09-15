// Web Audio Synthesizer for Telegram native sound effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const playTelegramSound = {
  // Telegram "Sent" message pop/whoosh
  send: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  },

  // Telegram "Incoming" message chime
  receive: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Dual tone Telegram chime
      [
        { freq: 880, delay: 0 },
        { freq: 1174.66, delay: 0.07 }
      ].forEach(tone => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(tone.freq, now + tone.delay);

        gain.gain.setValueAtTime(0.15, now + tone.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tone.delay + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + tone.delay);
        osc.stop(now + tone.delay + 0.16);
      });
    } catch {
      // ignore
    }
  },

  // Telegram reaction pop
  reaction: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  },

  // Outgoing call dial-tone (tuuut... tuuut...)
  startOutgoingRinging: () => {
    let active = true;
    let timerId: any = null;

    const playTone = () => {
      if (!active) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(425, now);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.08, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.25);
        osc2.stop(now + 1.25);
      } catch {}

      if (active) {
        timerId = setTimeout(playTone, 3500);
      }
    };

    playTone();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  },

  // Incoming call ringtone (Melodic pleasant chime)
  startIncomingRingtone: () => {
    let active = true;
    let timerId: any = null;

    const playMelody = () => {
      if (!active) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const notes = [
          { freq: 587.33, start: 0, dur: 0.18 }, // D5
          { freq: 739.99, start: 0.2, dur: 0.18 }, // F#5
          { freq: 880.00, start: 0.4, dur: 0.22 }, // A5
          { freq: 1174.66, start: 0.65, dur: 0.35 }, // D6
          { freq: 880.00, start: 1.1, dur: 0.18 }, // A5
          { freq: 1174.66, start: 1.3, dur: 0.45 }, // D6
        ];

        notes.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(note.freq, now + note.start);

          gain.gain.setValueAtTime(0.14, now + note.start);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + note.start);
          osc.stop(now + note.start + note.dur);
        });
      } catch {}

      if (active) {
        timerId = setTimeout(playMelody, 2800);
      }
    };

    playMelody();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  },

  // Call connected sound (Upbeat 2-tone)
  callConnected: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.1 },
        { freq: 783.99, time: 0.2 },
      ].forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(t.freq, now + t.time);
        gain.gain.setValueAtTime(0.12, now + t.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t.time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.time);
        osc.stop(now + t.time + 0.15);
      });
    } catch {}
  },

  // Call ended/disconnect sound
  callEnded: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [
        { freq: 440, time: 0 },
        { freq: 349.23, time: 0.12 },
        { freq: 261.63, time: 0.24 },
      ].forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(t.freq, now + t.time);
        gain.gain.setValueAtTime(0.12, now + t.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t.time + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.time);
        osc.stop(now + t.time + 0.14);
      });
    } catch {}
  }
};
