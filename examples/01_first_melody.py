from caya_music import *

# 変数で曲の設定をまとめる
tempo = 96
sound = "soft_synth"
notes = ["C4", "E4", "G4", "A4", "G4", "E4"]

start_song(
    tempo=tempo,
    instrument=sound,
    title="はじめての旋律",
)

# リストの音を順番に使う
for note in notes:
    add_note(note, 0.5)

add_note("C4", 2)
