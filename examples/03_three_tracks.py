from caya_music import *


def repeat_phrase(notes, repeats, duration=0.5):
    """音のリストを指定回数だけ繰り返します。"""
    for repeat in range(repeats):
        for note in notes:
            add_note(note, duration, 0.72)


start_song(
    tempo=110,
    instrument="pluck",
    title="3トラックの小品",
)

# メロディ
phrase = ["C4", "D4", "E4", "G4", "A4", "G4", "E4", "D4"]
repeat_phrase(phrase, 2)

# ベース
new_track("bass", instrument="bass", volume=0.72)
for note in ["C2", "A1", "F2", "G2"] * 2:
    add_note(note, 2, 0.72)

# ドラム
new_track("drums", instrument="drums", volume=0.60)
for i in range(32):
    if i % 4 == 0:
        add_drum("kick", 0.5, 0.90)
    elif i % 4 == 2:
        add_drum("snare", 0.5, 0.72)
    else:
        add_drum("hihat", 0.5, 0.38)
