"""Compose As You Are の教育用作曲API。

このモジュールは、Pythonコードから音符イベントを作るための小さなAPIです。
音そのものはブラウザ側で再生します。ここでは曲を辞書データとして組み立てます。
"""

from __future__ import annotations

from copy import deepcopy
import math
import re
from typing import Sequence

__all__ = [
    "start_song",
    "set_tempo",
    "set_loop",
    "new_track",
    "use_track",
    "move_to",
    "current_beat",
    "add_note",
    "add_chord",
    "add_rest",
    "add_drum",
    "export_song",
]

_SCHEMA_VERSION = "1.0"
_DEFAULT_TEMPO = 96
_DEFAULT_INSTRUMENT = "soft_synth"
_DEFAULT_TRACK_NAME = "melody"
_MAX_TRACKS = 12
_MAX_EVENTS = 2048
_MAX_BEATS = 512.0
_MAX_DURATION = 64.0

_ALLOWED_INSTRUMENTS = {
    "soft_synth",
    "pluck",
    "bell",
    "warm_pad",
    "bass",
    "drums",
}
_ALLOWED_DRUMS = {"kick", "snare", "hihat", "clap"}
_NOTE_PATTERN = re.compile(r"^[A-Ga-g](?:#|b)?-?\d{1,2}$")

_song: dict
_current_track: str | None
_event_count: int


def _new_song() -> dict:
    return {
        "schema_version": _SCHEMA_VERSION,
        "title": "Untitled",
        "tempo": _DEFAULT_TEMPO,
        "time_signature": [4, 4],
        "loop": False,
        "tracks": [],
        "length_beats": 0.0,
    }


def _reset() -> None:
    global _song, _current_track, _event_count
    _song = _new_song()
    _current_track = None
    _event_count = 0


_reset()


def _number(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{name} は数値で指定してください。")
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{name} には有限の数値を指定してください。")
    return value


def _bounded(value: object, name: str, lower: float, upper: float) -> float:
    number = _number(value, name)
    if not lower <= number <= upper:
        raise ValueError(f"{name} は {lower:g} 以上 {upper:g} 以下にしてください。")
    return number


def _normalise_instrument(instrument: object) -> str:
    if not isinstance(instrument, str):
        raise TypeError("instrument は文字列で指定してください。")
    instrument = instrument.strip()
    if instrument not in _ALLOWED_INSTRUMENTS:
        choices = ", ".join(sorted(_ALLOWED_INSTRUMENTS))
        raise ValueError(f"instrument は次のいずれかにしてください: {choices}")
    return instrument


def _normalise_note(note: object) -> str:
    if not isinstance(note, str):
        raise TypeError("note は 'C4' のような文字列で指定してください。")
    note = note.strip()
    if not _NOTE_PATTERN.fullmatch(note):
        raise ValueError(
            f"'{note}' は音名として読み取れません。'C4'、'F#4'、'Bb3' のように書いてください。"
        )
    letter = note[0].upper()
    normalised = letter + note[1:]

    pitch_names = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
        "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
        "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
    }
    match = re.fullmatch(r"([A-G](?:#|b)?)(-?\d{1,2})", normalised)
    assert match is not None
    pitch, octave_text = match.groups()
    midi = (int(octave_text) + 1) * 12 + pitch_names[pitch]
    if not 0 <= midi <= 127:
        raise ValueError(
            f"'{normalised}' は再生できる音域の外です。C-1からG9の範囲を目安にしてください。"
        )
    return normalised


def _normalise_notes(notes: object) -> list[str]:
    if isinstance(notes, str):
        return [_normalise_note(notes)]
    if not isinstance(notes, Sequence):
        raise TypeError("notes は音名のリストで指定してください。")
    result = [_normalise_note(note) for note in notes]
    if not result:
        raise ValueError("notes のリストを空にすることはできません。")
    if len(result) > 12:
        raise ValueError("一度に鳴らす音は12音以下にしてください。")
    return result


def _track_by_name(name: str) -> dict:
    for track in _song["tracks"]:
        if track["name"] == name:
            return track
    raise ValueError(f"'{name}' というトラックはありません。")


def _ensure_track() -> dict:
    global _current_track
    if _current_track is None:
        new_track(_DEFAULT_TRACK_NAME, instrument=_DEFAULT_INSTRUMENT)
    return _track_by_name(_current_track)  # type: ignore[arg-type]


def _register_event(track: dict, event: dict, duration: float) -> None:
    global _event_count
    if _event_count >= _MAX_EVENTS:
        raise RuntimeError(f"1回に作れるイベントは {_MAX_EVENTS} 個までです。")
    end = event["beat"] + duration
    if end > _MAX_BEATS:
        raise ValueError(f"曲の長さは {_MAX_BEATS:g} 拍以内にしてください。")
    track["events"].append(event)
    track["cursor"] = max(track["cursor"], end)
    _song["length_beats"] = max(_song["length_beats"], end)
    _event_count += 1


def start_song(
    tempo: int | float = _DEFAULT_TEMPO,
    instrument: str = _DEFAULT_INSTRUMENT,
    title: str = "Untitled",
) -> None:
    """新しい曲を開始し、最初のトラックを作ります。"""
    _reset()
    set_tempo(tempo)
    if not isinstance(title, str):
        raise TypeError("title は文字列で指定してください。")
    _song["title"] = title.strip() or "Untitled"
    new_track(_DEFAULT_TRACK_NAME, instrument=instrument)


def set_tempo(tempo: int | float) -> None:
    """テンポをBPMで設定します。"""
    value = _bounded(tempo, "tempo", 40, 240)
    _song["tempo"] = int(value) if value.is_integer() else value


def set_loop(enabled: bool = True) -> None:
    """曲を繰り返し再生するかどうかを曲データに記録します。"""
    if not isinstance(enabled, bool):
        raise TypeError("enabled は True または False で指定してください。")
    _song["loop"] = enabled


def new_track(
    name: str,
    instrument: str = _DEFAULT_INSTRUMENT,
    volume: int | float = 0.8,
    pan: int | float = 0.0,
) -> None:
    """新しいトラックを作り、そのトラックを編集対象にします。"""
    global _current_track
    if not isinstance(name, str):
        raise TypeError("name は文字列で指定してください。")
    name = name.strip()
    if not name:
        raise ValueError("トラック名を空にすることはできません。")
    if len(name) > 40:
        raise ValueError("トラック名は40文字以内にしてください。")
    if any(track["name"] == name for track in _song["tracks"]):
        raise ValueError(f"'{name}' というトラックは既にあります。")
    if len(_song["tracks"]) >= _MAX_TRACKS:
        raise RuntimeError(f"トラックは {_MAX_TRACKS} 個まで作れます。")

    track = {
        "name": name,
        "instrument": _normalise_instrument(instrument),
        "volume": _bounded(volume, "volume", 0.0, 1.0),
        "pan": _bounded(pan, "pan", -1.0, 1.0),
        "events": [],
        "cursor": 0.0,
    }
    _song["tracks"].append(track)
    _current_track = name


def use_track(name: str) -> None:
    """既に作ったトラックを編集対象にします。"""
    global _current_track
    if not isinstance(name, str):
        raise TypeError("name は文字列で指定してください。")
    _track_by_name(name)
    _current_track = name


def move_to(beat: int | float) -> None:
    """現在のトラックで、次の音を置く開始位置を変更します。"""
    track = _ensure_track()
    value = _bounded(beat, "beat", 0.0, _MAX_BEATS)
    track["cursor"] = value


def current_beat() -> float:
    """現在のトラックで、次の音を置く開始位置を返します。"""
    return float(_ensure_track()["cursor"])


def add_note(
    note: str | Sequence[str],
    duration: int | float = 1.0,
    velocity: int | float = 0.8,
    beat: int | float | None = None,
) -> None:
    """1音、または複数音の和音を追加します。"""
    notes = _normalise_notes(note)
    duration_value = _bounded(duration, "duration", 0.03125, _MAX_DURATION)
    velocity_value = _bounded(velocity, "velocity", 0.0, 1.0)
    track = _ensure_track()
    start = track["cursor"] if beat is None else _bounded(beat, "beat", 0.0, _MAX_BEATS)
    event = {
        "kind": "note",
        "beat": float(start),
        "duration": duration_value,
        "notes": notes,
        "velocity": velocity_value,
    }
    _register_event(track, event, duration_value)


def add_chord(
    notes: Sequence[str],
    duration: int | float = 1.0,
    velocity: int | float = 0.75,
    beat: int | float | None = None,
) -> None:
    """音名のリストを和音として追加します。"""
    add_note(notes, duration=duration, velocity=velocity, beat=beat)


def add_rest(duration: int | float = 1.0) -> None:
    """現在のトラックの時刻を進め、休符を作ります。"""
    track = _ensure_track()
    duration_value = _bounded(duration, "duration", 0.03125, _MAX_DURATION)
    end = track["cursor"] + duration_value
    if end > _MAX_BEATS:
        raise ValueError(f"曲の長さは {_MAX_BEATS:g} 拍以内にしてください。")
    track["cursor"] = end
    _song["length_beats"] = max(_song["length_beats"], end)


def add_drum(
    sound: str,
    duration: int | float = 0.25,
    velocity: int | float = 0.8,
    beat: int | float | None = None,
) -> None:
    """キック、スネア、ハイハット、クラップの打楽器音を追加します。"""
    if not isinstance(sound, str):
        raise TypeError("sound は文字列で指定してください。")
    sound = sound.strip().lower()
    if sound not in _ALLOWED_DRUMS:
        choices = ", ".join(sorted(_ALLOWED_DRUMS))
        raise ValueError(f"sound は次のいずれかにしてください: {choices}")
    duration_value = _bounded(duration, "duration", 0.03125, 4.0)
    velocity_value = _bounded(velocity, "velocity", 0.0, 1.0)
    track = _ensure_track()
    start = track["cursor"] if beat is None else _bounded(beat, "beat", 0.0, _MAX_BEATS)
    event = {
        "kind": "drum",
        "beat": float(start),
        "duration": duration_value,
        "sound": sound,
        "velocity": velocity_value,
    }
    _register_event(track, event, duration_value)


def export_song() -> dict:
    """ブラウザへ渡すための曲データを返します。"""
    result = deepcopy(_song)
    for track in result["tracks"]:
        track.pop("cursor", None)
        track["events"].sort(key=lambda event: (event["beat"], event["kind"]))
    result["length_beats"] = float(result["length_beats"])
    return result
