# Python基礎ガイド

## 関数を定義する

```python
def add_note(note, duration):
    record_note(note, duration)
```

`def`は関数の設計図を作ります。`note`と`duration`は外から受け取る引数です。字下げされた行が関数の中身です。

## 関数を呼び出す

```python
add_note("C4", 1)
```

定義した関数へ、具体的な値を渡して処理を実行します。

## import

```python
from caya_music import start_song, add_note
import random
```

別のモジュールに用意された機能を現在のコードで使えるようにします。`caya_music`はこの教材の作曲モジュール、`random`はPythonの標準ライブラリです。

## 変数と代入

```python
tempo = 108
sound = "pluck"
```

右側の値を左側の名前へ入れます。同じ値を複数の場所で使うとき、変更しやすくなります。

## リスト

```python
notes = ["C4", "E4", "G4"]
```

複数の値を順番にまとめます。最初の要素は`notes[0]`、要素数は`len(notes)`で調べます。

## forとrange

```python
for i in range(8):
    add_note("C4", 0.5)
```

`i`は0から7まで変化し、字下げされた処理が8回実行されます。

## ifとelse

```python
if i % 4 == 3:
    add_rest(0.5)
else:
    add_note("C4", 0.5)
```

条件が真なら`if`側、偽なら`else`側が実行されます。`%`は割り算の余りです。

## 乱数とseed

```python
import random
random.seed(42)
note = random.choice(notes)
```

`choice`は候補から1つを選びます。seedを固定すると、同じコードから同じ選択列を再現できます。

## 複数トラック

```python
new_track("bass", instrument="bass")
add_note("C2", 2)
```

旋律、低音、和音、ドラムを別トラックへ分けると、役割と音量を整理できます。
