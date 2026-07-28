import {
  eventLabel,
  flattenSongEvents,
  formatBeat,
  midiToNote,
  noteToMidi,
  songLength,
} from "./note-utils.js";

const FALLBACK_TRACK_COLOURS = ["#9d8cff", "#55d9c0", "#ffb86b", "#ff7b94", "#70b7ff"];
const DRUM_LANES = { kick: 0, snare: 1, clap: 1, hihat: 2 };

function cssColour(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export class PianoRollVisualiser {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.song = null;
    this.playheadBeat = 0;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.draw();
  }

  setSong(song) {
    this.song = song;
    this.playheadBeat = 0;
    this.draw();
  }

  setPlayhead(beat) {
    this.playheadBeat = Number.isFinite(Number(beat)) ? Number(beat) : 0;
    this.draw();
  }

  clear() {
    this.song = null;
    this.playheadBeat = 0;
    this.draw();
  }

  prepareCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(300, rect.width || 300);
    const height = Math.max(240, rect.height || 310);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  draw() {
    if (!this.context) {
      return;
    }
    const { width, height } = this.prepareCanvas();
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#090c17";
    ctx.fillRect(0, 0, width, height);

    if (!this.song || !this.song.tracks?.length || songLength(this.song) <= 0) {
      this.drawEmpty(ctx, width, height);
      return;
    }

    const events = flattenSongEvents(this.song);
    const melodicNotes = [];
    let hasDrums = false;
    for (const event of events) {
      if (event.kind === "drum") {
        hasDrums = true;
      } else {
        for (const note of event.notes ?? []) {
          const midi = noteToMidi(note);
          if (midi !== null) {
            melodicNotes.push(midi);
          }
        }
      }
    }

    let minMidi = melodicNotes.length ? Math.min(...melodicNotes) - 1 : 59;
    let maxMidi = melodicNotes.length ? Math.max(...melodicNotes) + 1 : 72;
    if (maxMidi - minMidi < 11) {
      const centre = (maxMidi + minMidi) / 2;
      minMidi = Math.floor(centre - 6);
      maxMidi = Math.ceil(centre + 6);
    }
    if (maxMidi - minMidi > 52) {
      const centre = (maxMidi + minMidi) / 2;
      minMidi = Math.floor(centre - 26);
      maxMidi = Math.ceil(centre + 26);
    }

    const margin = { left: 47, right: 13, top: 24, bottom: 26 };
    const drumHeight = hasDrums ? 42 : 0;
    const plotWidth = Math.max(100, width - margin.left - margin.right);
    const melodicHeight = Math.max(90, height - margin.top - margin.bottom - drumHeight);
    const totalBeats = Math.max(1, songLength(this.song));
    const xForBeat = (beat) => margin.left + (Number(beat) / totalBeats) * plotWidth;
    const pitchSpan = maxMidi - minMidi + 1;
    const rowHeight = melodicHeight / pitchSpan;
    const yForMidi = (midi) => margin.top + (maxMidi - midi) * rowHeight;

    this.drawGrid(ctx, {
      width,
      height,
      margin,
      plotWidth,
      melodicHeight,
      drumHeight,
      totalBeats,
      minMidi,
      maxMidi,
      rowHeight,
      xForBeat,
      yForMidi,
      hasDrums,
    });

    const trackColours = FALLBACK_TRACK_COLOURS.map((fallback, index) =>
      cssColour(`--track-${index + 1}`, fallback),
    );

    for (const event of events) {
      const colour = trackColours[event.trackIndex % trackColours.length];
      const startX = xForBeat(event.beat);
      const endX = xForBeat(Number(event.beat) + Number(event.duration));
      const eventWidth = Math.max(3, endX - startX - 1);

      if (event.kind === "drum") {
        if (!hasDrums) continue;
        const lane = DRUM_LANES[event.sound] ?? 1;
        const laneHeight = drumHeight / 3;
        const y = margin.top + melodicHeight + lane * laneHeight + 3;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = colour;
        ctx.beginPath();
        const radius = Math.min(5, laneHeight / 3);
        ctx.roundRect(startX, y, Math.max(5, eventWidth), Math.max(5, laneHeight - 6), radius);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }

      for (const note of event.notes ?? []) {
        const midi = noteToMidi(note);
        if (midi === null || midi < minMidi || midi > maxMidi) {
          continue;
        }
        const y = yForMidi(midi) + 1;
        const noteHeight = Math.max(3, rowHeight - 2);
        ctx.fillStyle = colour;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.roundRect(startX, y, eventWidth, noteHeight, Math.min(4, noteHeight / 2));
        ctx.fill();
        ctx.globalAlpha = 1;
        if (eventWidth > 28 && noteHeight > 9) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(startX, y, eventWidth, noteHeight);
          ctx.clip();
          ctx.fillStyle = "rgba(10, 12, 24, 0.78)";
          ctx.font = "700 9px ui-monospace, monospace";
          ctx.textBaseline = "middle";
          ctx.fillText(note, startX + 4, y + noteHeight / 2 + 0.5);
          ctx.restore();
        }
      }
    }

    const playhead = ((this.playheadBeat % totalBeats) + totalBeats) % totalBeats;
    const playheadX = xForBeat(playhead);
    ctx.strokeStyle = cssColour("--accent", "#ffb86b");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, margin.top - 6);
    ctx.lineTo(playheadX, height - margin.bottom + 1);
    ctx.stroke();
    ctx.fillStyle = cssColour("--accent", "#ffb86b");
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, margin.top - 7);
    ctx.lineTo(playheadX + 5, margin.top - 7);
    ctx.lineTo(playheadX, margin.top - 1);
    ctx.closePath();
    ctx.fill();
  }

  drawGrid(ctx, layout) {
    const {
      width,
      height,
      margin,
      plotWidth,
      melodicHeight,
      drumHeight,
      totalBeats,
      minMidi,
      maxMidi,
      rowHeight,
      xForBeat,
      yForMidi,
      hasDrums,
    } = layout;

    ctx.fillStyle = "rgba(255,255,255,0.018)";
    for (let midi = minMidi; midi <= maxMidi; midi += 1) {
      if ([1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)) {
        ctx.fillRect(margin.left, yForMidi(midi), plotWidth, rowHeight);
      }
    }

    for (let beat = 0; beat <= Math.ceil(totalBeats); beat += 1) {
      const x = xForBeat(Math.min(beat, totalBeats));
      const strong = beat % 4 === 0;
      ctx.strokeStyle = strong ? "rgba(198,208,255,0.22)" : "rgba(198,208,255,0.085)";
      ctx.lineWidth = strong ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();

      if (beat < totalBeats && (strong || totalBeats <= 16)) {
        ctx.fillStyle = strong ? "#aeb6d3" : "#6f7899";
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(beat), x, 15);
      }
    }

    for (let midi = minMidi; midi <= maxMidi; midi += 1) {
      if (midi % 12 !== 0 && maxMidi - minMidi > 18) {
        continue;
      }
      const y = yForMidi(midi) + rowHeight / 2;
      ctx.fillStyle = midi % 12 === 0 ? "#aeb6d3" : "#68718f";
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(midiToNote(midi), margin.left - 7, y);
      ctx.strokeStyle = midi % 12 === 0 ? "rgba(198,208,255,0.14)" : "rgba(198,208,255,0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, yForMidi(midi));
      ctx.lineTo(width - margin.right, yForMidi(midi));
      ctx.stroke();
    }

    if (hasDrums) {
      const drumTop = margin.top + melodicHeight;
      const laneHeight = drumHeight / 3;
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fillRect(margin.left, drumTop, plotWidth, drumHeight);
      ["K", "S", "H"].forEach((label, index) => {
        const y = drumTop + index * laneHeight;
        ctx.strokeStyle = "rgba(198,208,255,0.08)";
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
        ctx.fillStyle = "#737d9e";
        ctx.font = "700 9px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(label, margin.left - 7, y + laneHeight / 2);
      });
    }

    ctx.strokeStyle = "rgba(198,208,255,0.18)";
    ctx.strokeRect(margin.left, margin.top, plotWidth, melodicHeight + drumHeight);
  }

  drawEmpty(ctx, width, height) {
    ctx.fillStyle = "rgba(143,124,255,0.08)";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 14, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9aa3c2";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Pythonを実行すると音の並びが見えます", width / 2, height / 2 + 42);
    ctx.fillStyle = "#cfc7ff";
    ctx.font = "700 34px ui-monospace, monospace";
    ctx.fillText("♪", width / 2, height / 2 - 13);
  }
}

export function renderEventTable(song, tbody) {
  const events = flattenSongEvents(song);
  tbody.replaceChildren();
  if (!events.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "音イベントはまだありません。add_noteやadd_drumを追加してください。";
    row.append(cell);
    tbody.append(row);
    return;
  }

  events.forEach((event, index) => {
    const row = document.createElement("tr");
    const values = [
      String(index + 1),
      event.trackName,
      formatBeat(event.beat),
      eventLabel(event),
      formatBeat(event.duration),
      Number(event.velocity).toFixed(2),
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    tbody.append(row);
  });
}
