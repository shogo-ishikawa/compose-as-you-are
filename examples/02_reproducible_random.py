from caya_music import *
import random

seed = 42
tempo = 108
scale = ["C4", "D4", "E4", "G4", "A4", "C5"]

random.seed(seed)

start_song(
    tempo=tempo,
    instrument="bell",
    title="再現できるランダム旋律",
)

for i in range(24):
    if random.random() < 0.15:
        add_rest(0.5)
    else:
        note = random.choice(scale)
        strength = random.choice([0.55, 0.7, 0.85])
        add_note(note, 0.5, strength)
