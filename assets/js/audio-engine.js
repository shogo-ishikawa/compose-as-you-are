import { songLength } from "./note-utils.js";

function linearToDb(value) {
  const safe = Math.max(0.0001, Math.min(1, Number(value) || 0));
  return 20 * Math.log10(safe);
}

export class AudioEngine {
  constructor({ onTick = () => {}, onState = () => {}, onError = () => {} } = {}) {
    this.onTick = onTick;
    this.onState = onState;
    this.onError = onError;
    this.song = null;
    this.loop = false;
    this.state = "idle";
    this.graph = [];
    this.master = null;
    this.raf = null;
    this.tempo = 96;
    this.totalBeats = 0;
    this.totalSeconds = 0;
    this.volume = 62;
  }

  get available() {
    return Boolean(window.Tone?.getTransport && window.Tone?.start);
  }

  async unlock() {
    if (!this.available) {
      throw new Error("音声ライブラリを読み込めませんでした。ネットワーク接続を確認してください。");
    }
    await window.Tone.start();
    this.setVolume(this.volume);
    return true;
  }

  setVolume(percent) {
    this.volume = Math.max(0, Math.min(100, Number(percent) || 0));
    if (!this.available) {
      return;
    }
    const db = this.volume <= 0 ? -Infinity : -42 + (this.volume / 100) * 36;
    const destination = window.Tone.getDestination();
    if (destination?.volume) {
      destination.volume.value = db;
    }
  }

  setLoop(enabled) {
    this.loop = Boolean(enabled);
    if (this.available) {
      const transport = window.Tone.getTransport();
      transport.loop = this.loop;
      if (this.totalSeconds > 0) {
        transport.loopStart = 0;
        transport.loopEnd = this.totalSeconds;
      }
    }
  }

  async play(song, { loop = false } = {}) {
    if (!song || !song.tracks?.length || songLength(song) <= 0) {
      throw new Error("再生できる音イベントがありません。先にPythonを実行してください。");
    }
    try {
      await this.unlock();
      this.stop({ announce: false });
      this.song = song;
      this.tempo = Number(song.tempo) || 96;
      this.totalBeats = songLength(song);
      this.totalSeconds = (this.totalBeats * 60) / this.tempo;
      this.loop = Boolean(loop);
      this.buildGraph(song);
      this.schedule(song);

      const transport = window.Tone.getTransport();
      transport.loop = this.loop;
      transport.loopStart = 0;
      transport.loopEnd = Math.max(0.01, this.totalSeconds);
      transport.position = 0;
      transport.start("+0.06");
      this.state = "playing";
      this.onState("playing");
      this.startAnimation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.onError(message);
      throw error;
    }
  }

  pauseOrResume() {
    if (!this.available || !this.song) {
      return;
    }
    const transport = window.Tone.getTransport();
    if (this.state === "playing") {
      transport.pause();
      this.state = "paused";
      this.onState("paused");
      this.stopAnimation();
    } else if (this.state === "paused") {
      transport.start("+0.03");
      this.state = "playing";
      this.onState("playing");
      this.startAnimation();
    }
  }

  stop({ announce = true } = {}) {
    if (this.available) {
      const transport = window.Tone.getTransport();
      transport.stop();
      transport.cancel(0);
      transport.position = 0;
      transport.loop = false;
    }
    this.stopAnimation();
    this.disposeGraph();
    this.state = "stopped";
    this.onTick(0);
    if (announce) {
      this.onState("stopped");
    }
  }

  buildGraph(song) {
    const Tone = window.Tone;
    this.master = new Tone.Limiter(-1).toDestination();
    this.graph.push(this.master);

    this.instruments = song.tracks.map((track) => {
      const channel = new Tone.Channel({
        volume: linearToDb(track.volume ?? 0.8),
        pan: Number(track.pan) || 0,
      }).connect(this.master);
      this.graph.push(channel);
      const instrument = this.createInstrument(track.instrument, channel);
      return { track, channel, instrument };
    });
  }

  createInstrument(name, channel) {
    const Tone = window.Tone;
    let instrument;

    if (name === "drums") {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.035,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.12 },
      }).connect(channel);
      const snare = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.08 },
      }).connect(channel);
      const hihat = new Tone.MetalSynth({
        frequency: 260,
        envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 26,
        resonance: 3600,
        octaves: 1.4,
      }).connect(channel);
      const clap = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.1 },
      }).connect(channel);
      this.graph.push(kick, snare, hihat, clap);
      return { type: "drums", kick, snare, hihat, clap };
    }

    switch (name) {
      case "pluck":
        instrument = new Tone.PolySynth(Tone.PluckSynth);
        break;
      case "bell":
        instrument = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3.01,
          modulationIndex: 10,
          envelope: { attack: 0.005, decay: 0.55, sustain: 0.12, release: 1.2 },
          modulationEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.15, release: 0.8 },
        });
        break;
      case "warm_pad":
        instrument = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.5,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.28, decay: 0.3, sustain: 0.62, release: 1.4 },
          modulation: { type: "sine" },
          modulationEnvelope: { attack: 0.4, decay: 0.2, sustain: 0.35, release: 1.1 },
        });
        break;
      case "bass":
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "square" },
          envelope: { attack: 0.01, decay: 0.22, sustain: 0.35, release: 0.35 },
        });
        break;
      case "soft_synth":
      default:
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.18, sustain: 0.46, release: 0.55 },
        });
        break;
    }
    instrument.connect(channel);
    this.graph.push(instrument);
    return { type: "melodic", synth: instrument };
  }

  schedule(song) {
    const Tone = window.Tone;
    const transport = Tone.getTransport();
    transport.cancel(0);
    transport.bpm.value = this.tempo;

    this.instruments.forEach(({ track, instrument }) => {
      (track.events ?? []).forEach((event) => {
        const startSeconds = (Number(event.beat) * 60) / this.tempo;
        const durationSeconds = Math.max(0.02, (Number(event.duration) * 60) / this.tempo);
        const velocity = Math.max(0, Math.min(1, Number(event.velocity) || 0.8));

        transport.schedule((time) => {
          if (event.kind === "drum" || instrument.type === "drums") {
            this.triggerDrum(instrument, event, durationSeconds, time, velocity);
          } else {
            const notes = Array.isArray(event.notes) ? event.notes : [];
            if (notes.length) {
              instrument.synth.triggerAttackRelease(notes, durationSeconds, time, velocity);
            }
          }
        }, startSeconds);
      });
    });
  }

  triggerDrum(instrument, event, duration, time, velocity) {
    const sound = event.sound || "hihat";
    if (sound === "kick") {
      instrument.kick.triggerAttackRelease("C1", duration, time, velocity);
    } else if (sound === "snare") {
      instrument.snare.triggerAttackRelease(duration, time, velocity);
    } else if (sound === "clap") {
      instrument.clap.triggerAttackRelease(duration, time, velocity);
    } else {
      instrument.hihat.triggerAttackRelease(Math.min(duration, 0.12), time, velocity);
    }
  }

  startAnimation() {
    this.stopAnimation();
    const tick = () => {
      if (!this.available || this.state !== "playing") {
        return;
      }
      const transport = window.Tone.getTransport();
      const seconds = Number(transport.seconds) || 0;
      const cycleSeconds = Math.max(0.001, this.totalSeconds);
      const visualSeconds = this.loop ? seconds % cycleSeconds : Math.min(seconds, cycleSeconds);
      const beat = (visualSeconds * this.tempo) / 60;
      this.onTick(beat);

      if (!this.loop && seconds >= this.totalSeconds + 0.25) {
        this.stop();
        return;
      }
      this.raf = window.requestAnimationFrame(tick);
    };
    this.raf = window.requestAnimationFrame(tick);
  }

  stopAnimation() {
    if (this.raf !== null) {
      window.cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  disposeGraph() {
    for (const node of [...this.graph].reverse()) {
      try {
        node.dispose?.();
      } catch {
        // Audio nodes may already have been disposed after a rapid restart.
      }
    }
    this.graph = [];
    this.instruments = [];
    this.master = null;
  }
}
