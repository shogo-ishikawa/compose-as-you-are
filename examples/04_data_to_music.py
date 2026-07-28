from caya_music import *

# 模擬的な温度データを音へ変換する例
# 値の大小をリストの番号へ対応させます
temperatures = [18, 19, 21, 24, 27, 29, 28, 25, 22, 20]
scale = ["C4", "D4", "E4", "G4", "A4", "C5"]

start_song(
    tempo=92,
    instrument="warm_pad",
    title="温度データの可聴化",
)

minimum = min(temperatures)
maximum = max(temperatures)
width = maximum - minimum

for value in temperatures:
    ratio = (value - minimum) / width
    index = round(ratio * (len(scale) - 1))
    note = scale[index]
    add_note(note, 0.75, 0.68)
    print(value, "度 →", note)
