from __future__ import annotations

import contextlib
import importlib
import io
import runpy
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PYTHON_DIR = ROOT / "assets" / "python"
sys.path.insert(0, str(PYTHON_DIR))

import caya_music  # noqa: E402


class CayaMusicTests(unittest.TestCase):
    def setUp(self) -> None:
        self.music = importlib.reload(caya_music)

    def test_start_song_and_notes(self) -> None:
        self.music.start_song(tempo=120, instrument="pluck", title="Test")
        self.music.add_note("C4", 0.5, 0.7)
        self.music.add_note("E4", 1.0)

        song = self.music.export_song()
        self.assertEqual(song["title"], "Test")
        self.assertEqual(song["tempo"], 120)
        self.assertEqual(song["length_beats"], 1.5)
        self.assertEqual(len(song["tracks"]), 1)
        self.assertEqual(song["tracks"][0]["events"][0]["notes"], ["C4"])
        self.assertNotIn("cursor", song["tracks"][0])


    def test_start_song_accepts_first_track_mix_settings(self) -> None:
        self.music.start_song(tempo=96, instrument="pluck", title="Mix", volume=0.45, pan=0.25)
        self.music.add_note("C4", 1)
        track = self.music.export_song()["tracks"][0]
        self.assertEqual(track["volume"], 0.45)
        self.assertEqual(track["pan"], 0.25)

    def test_rest_chord_and_current_beat(self) -> None:
        self.music.start_song()
        self.music.add_rest(1)
        self.music.add_chord(["C4", "E4", "G4"], 2)

        self.assertEqual(self.music.current_beat(), 3)
        song = self.music.export_song()
        event = song["tracks"][0]["events"][0]
        self.assertEqual(event["beat"], 1)
        self.assertEqual(event["notes"], ["C4", "E4", "G4"])
        self.assertEqual(song["length_beats"], 3)

    def test_multiple_tracks_and_explicit_beats(self) -> None:
        self.music.start_song(instrument="soft_synth")
        self.music.add_note("C4", 1)
        self.music.new_track("bass", instrument="bass", volume=0.6, pan=-0.2)
        self.music.add_note("C2", 2, beat=4)
        self.music.use_track("melody")
        self.music.move_to(2)
        self.music.add_note("G4", 1)

        song = self.music.export_song()
        self.assertEqual(len(song["tracks"]), 2)
        self.assertEqual(song["length_beats"], 6)
        self.assertEqual(song["tracks"][1]["events"][0]["beat"], 4)

    def test_drum_event(self) -> None:
        self.music.start_song(instrument="drums")
        self.music.add_drum("kick", 0.25, 0.9)
        song = self.music.export_song()
        event = song["tracks"][0]["events"][0]
        self.assertEqual(event["kind"], "drum")
        self.assertEqual(event["sound"], "kick")

    def test_export_returns_a_copy(self) -> None:
        self.music.start_song()
        self.music.add_note("C4", 1)
        first = self.music.export_song()
        first["tracks"][0]["events"][0]["notes"][0] = "A9"
        second = self.music.export_song()
        self.assertEqual(second["tracks"][0]["events"][0]["notes"], ["C4"])

    def test_validation_messages(self) -> None:
        with self.assertRaises(ValueError):
            self.music.start_song(tempo=10)
        with self.assertRaises(ValueError):
            self.music.start_song(instrument="unknown")
        self.music.start_song()
        with self.assertRaises(ValueError):
            self.music.add_note("not-a-note", 1)
        with self.assertRaises(ValueError):
            self.music.add_note("C10", 1)
        with self.assertRaises(TypeError):
            self.music.add_note(60, 1)  # type: ignore[arg-type]
        with self.assertRaises(ValueError):
            self.music.add_drum("tom")

    def test_limits_prevent_accidental_runaway_output(self) -> None:
        self.music.start_song()
        with self.assertRaises(ValueError):
            self.music.add_note("C4", 100)
        self.music.move_to(511.9)
        with self.assertRaises(ValueError):
            self.music.add_note("C4", 1)

    def test_all_examples_run_and_create_music(self) -> None:
        for path in sorted((ROOT / "examples").glob("*.py")):
            with self.subTest(example=path.name):
                self.music = importlib.reload(caya_music)
                with contextlib.redirect_stdout(io.StringIO()):
                    runpy.run_path(str(path), run_name="__main__")
                song = self.music.export_song()
                event_count = sum(len(track["events"]) for track in song["tracks"])
                self.assertGreater(event_count, 0)
                self.assertGreater(song["length_beats"], 0)


if __name__ == "__main__":
    unittest.main()
