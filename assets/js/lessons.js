export const ACTIVITY_ORDER = ["example", "practice", "advanced"];

export const ACTIVITY_META = {
  example: { label: "例題", short: "例", required: true },
  practice: { label: "練習問題", short: "練", required: true },
  advanced: { label: "発展問題", short: "発", required: false },
};

export const LESSONS = [
  {
    id: "define-functions",
    number: 1,
    shortTitle: "自作関数",
    title: "自分で関数を定義し、最初の音を置く",
    duration: "約15分",
    route: "講義ルート",
    concepts: ["def", "引数", "関数呼び出し", "文字列", "数値"],
    overview:
      "最初から完成した作曲関数を読み込むのではなく、ブラウザと音をつなぐ最小命令を使って、自分でstart_songとadd_noteを定義します。関数を作る行と、関数を使う行を見分けましょう。",
    point:
      "defは処理の設計図を作り、丸括弧の中の引数は外から受け取る値を表します。定義しただけでは音は置かれず、後で関数を呼び出したときに中の処理が実行されます。",
    bridge:
      "このレッスンでは関数を自分で定義しました。Lesson 2からは、別ファイルに用意された関数をimportで読み込みます。これは標準ライブラリや外部ライブラリを利用する考え方へつながります。",
    syntax: [
      {
        code: "def add_note(note, duration):",
        title: "関数を定義する",
        detail: "add_noteという名前の関数を作り、noteとdurationを受け取ります。行末のコロンと次の行の字下げが必要です。",
      },
      {
        code: "record_note(note, duration)",
        title: "関数の中の処理",
        detail: "この教材が用意した最小命令へ値を渡します。字下げされているため、add_noteが呼ばれたときだけ実行されます。",
      },
      {
        code: 'add_note("C4", 1)',
        title: "自作関数を呼び出す",
        detail: "音名C4と長さ1を引数として渡します。この教材では1を1拍として扱います。",
      },
    ],
    steps: [
      { title: "1. 定義と呼び出しを色分けして読む", text: "defから始まる部分が関数の定義、下に並ぶadd_noteの行が関数の呼び出しです。" },
      { title: "2. 1音だけ変えて実行する", text: "最後の音名だけを変え、ピアノロールの高さと音の違いを確かめます。" },
      { title: "3. 関数の中を変える", text: "発展問題ではvelocityという3つ目の引数を追加し、関数の設計を拡張します。" },
    ],
    variants: {
      example: {
        title: "自作したadd_noteで4音を並べる",
        description: "関数の定義と呼び出しの対応を確認する例題です。まずコードを上から読み、その後に1音だけ変更してください。",
        tasks: [
          '最後の"C5"を"A4"へ変え、音の高さがどう変わるか確かめる。',
          "2番目の音の長さを1から0.5へ変え、後の音が始まる位置を観察する。",
        ],
        reflection: "defの行を実行した時点では音が増えず、add_noteを呼び出すたびに音が増える理由を説明してください。",
        code: `# begin_song と record_note は、ブラウザと音をつなぐ最小命令です。
# ここでは、それらを使って作曲用の関数を自分で定義します。

def start_song(tempo, instrument, title):
    begin_song(tempo, instrument, title)


def add_note(note, duration):
    record_note(note, duration)


start_song(
    tempo=96,
    instrument="soft_synth",
    title="自作関数ではじめる4音"
)

add_note("C4", 1)
add_note("E4", 1)
add_note("G4", 1)
add_note("C5", 2)
`,
      },
      practice: {
        title: "自分の5音モチーフを作る",
        description: "音名と長さを少なくとも2か所変更し、5音目を追加してください。コードは変更前でも動きますが、変更してから実行すると学習記録へ反映されます。",
        tasks: [
          "1拍の音と0.5拍の音を両方使う。",
          "同じ音を2回続ける場所を1か所作る。",
          "5回目のadd_noteを自分で追加する。",
        ],
        reflection: "どの引数を変えると音の高さが変わり、どの引数を変えると時間の並びが変わったか説明してください。",
        code: `# 練習問題：音名・長さ・行数を変更して、自分の5音を作ります。

def start_song(tempo, instrument, title):
    begin_song(tempo, instrument, title)


def add_note(note, duration):
    record_note(note, duration)


start_song(100, "bell", "5音のモチーフ")

add_note("C4", 0.5)
add_note("D4", 0.5)
add_note("E4", 1)
add_note("G4", 1)
# この下に5音目を追加してください。
`,
      },
      advanced: {
        title: "音の強さも受け取る関数へ拡張する",
        description: "3つ目の引数velocityと初期値を追加し、同じ音列へ強弱を付けます。",
        tasks: [
          "velocity=0.8が省略時の値になることを確認する。",
          "1拍目だけ0.95、他を0.55〜0.75にしてアクセントを作る。",
          "初期値を0.6へ変更し、省略した音だけがどう変わるか比べる。",
        ],
        reflection: "初期値を持つ引数を使うと、関数の呼び出しがどのように簡潔になるか説明してください。",
        code: `# 発展問題：強さを指定できるadd_noteへ拡張します。

def start_song(tempo, instrument, title):
    begin_song(tempo, instrument, title)


def add_note(note, duration, velocity=0.8):
    record_note(note, duration, velocity)


start_song(112, "soft_synth", "強弱を持つ自作関数")

add_note("C4", 0.5, 0.95)
add_note("E4", 0.5, 0.60)
add_note("G4", 0.5)
add_note("C5", 1, 0.72)
`,
      },
    },
  },
  {
    id: "imports-variables",
    number: 2,
    shortTitle: "importと変数",
    title: "別モジュールの関数を読み込み、設定へ名前を付ける",
    duration: "約15分",
    route: "講義ルート",
    concepts: ["import", "モジュール", "変数", "代入", "再利用"],
    overview:
      "Lesson 1で定義した作曲関数は、caya_musicという別ファイルにもまとめられています。必要な関数をimportし、テンポ・音色・音名・長さへ分かりやすい変数名を付けます。",
    point:
      "importは別モジュールの機能を現在のコードで使えるようにします。イコールは右側の値を左側の変数へ代入する操作です。",
    bridge:
      "caya_musicはこの教材専用のモジュールです。Lesson 6ではPython標準ライブラリのrandomをimportし、同じ仕組みで乱数機能を利用します。",
    syntax: [
      { code: "from caya_music import start_song, add_note", title: "必要な関数を読み込む", detail: "別ファイルから使う名前を明示します。どこから来た機能かがコードから分かります。" },
      { code: "tempo = 108", title: "数値を代入する", detail: "108という数値をtempoという名前で再利用できるようにします。" },
      { code: 'sound = "pluck"', title: "文字列を代入する", detail: "音色名を文字列としてsoundへ入れます。右側の操作欄からも変更できます。" },
    ],
    steps: [
      { title: "1. importの行を読む", text: "caya_musicからstart_songとadd_noteの2つだけを読み込んでいます。" },
      { title: "2. 変数が使われる場所を探す", text: "tempo、sound、note、lengthが、後の関数呼び出しでどのように使われるか線で結ぶつもりで読みます。" },
      { title: "3. GUIとコードを往復する", text: "テンポや音色を画面から変えると代入行も変わります。変更後はPythonを再実行します。" },
    ],
    variants: {
      example: {
        title: "変数でテンポと音色をまとめる",
        description: "同じ値を繰り返し書かず、設定へ名前を付ける例題です。Pluck音色も安全に再生できます。",
        tasks: ["tempoを72、108、144へ変えて速さの印象を比較する。", 'soundを"bell"や"warm_pad"へ変える。'],
        reflection: "値を直接書く場合と変数を使う場合で、変更しやすさがどう違うか説明してください。",
        code: `from caya_music import start_song, add_note

# 右側の値を左側の変数へ代入する
tempo = 108
sound = "pluck"
note = "E4"
length = 0.5

start_song(
    tempo=tempo,
    instrument=sound,
    title="変数で作るリズム"
)

add_note(note, length)
add_note(note, length)
add_note("G4", length)
add_note("A4", length)
add_note(note, 1)
`,
      },
      practice: {
        title: "4つの変数だけで曲の印象を変える",
        description: "関数呼び出しの部分は変えず、冒頭の変数だけを変更して別の曲にしてください。",
        tasks: ["tempo、sound、root、short_lengthを全て変更する。", "short_lengthの2倍をlong_lengthへ代入する。", "実行前に、どのような音になるか予想する。"],
        reflection: "一つの変数を変えたとき、複数のadd_noteへ同じ変更が反映される理由を説明してください。",
        code: `from caya_music import start_song, add_note

tempo = 92
sound = "soft_synth"
root = "C4"
short_length = 0.5
long_length = short_length * 2

start_song(tempo, sound, "変数だけで変える曲")

add_note(root, short_length)
add_note("E4", short_length)
add_note("G4", short_length)
add_note(root, long_length)
`,
      },
      advanced: {
        title: "計算で長さと強さを作る",
        description: "変数同士の計算を使い、基準値から別の値を作ります。",
        tasks: ["beatを1/3へ変えて三連符にする。", "accentとnormalの差を大きくする。", "octave_noteを別の高い音へ変える。"],
        reflection: "数値を直接何度も書くより、基準値から計算する利点を説明してください。",
        code: `from caya_music import start_song, add_note

tempo = 126
sound = "pluck"
beat = 0.5
accent = 0.95
normal = accent - 0.30
octave_note = "C5"

start_song(tempo, sound, "計算で作るアクセント")

add_note("C4", beat, accent)
add_note("E4", beat, normal)
add_note("G4", beat, normal)
add_note(octave_note, beat * 2, accent)
`,
      },
    },
  },
  {
    id: "lists-indexes",
    number: 3,
    shortTitle: "リスト",
    title: "音をリストへまとめ、番号で取り出す",
    duration: "約15分",
    route: "講義ルート",
    concepts: ["リスト", "添字", "len", "append"],
    overview:
      "旋律で使う音を一つのリストへまとめます。音の候補をまとめておくと、順番を入れ替えたり、後の繰り返しや乱数へ渡したりできます。",
    point:
      "Pythonの添字は0から始まります。5個の要素を持つリストで使える添字は0から4です。",
    bridge: "次のLesson 4では、添字をforループの中で変化させ、リストから音を自動的に取り出します。",
    syntax: [
      { code: 'notes = ["C4", "D4", "E4"]', title: "リストを作る", detail: "複数の値をカンマで区切り、角括弧で囲みます。" },
      { code: "notes[0]", title: "添字で取り出す", detail: "0は先頭、1は2番目を表します。番号は要素数より1小さいところまでです。" },
      { code: "len(notes)", title: "要素数を調べる", detail: "リストの中に何個の要素があるかを整数で返します。" },
    ],
    steps: [
      { title: "1. 添字と音名を対応させる", text: "notes[0]からnotes[4]までを紙や実行ログへ書き出します。" },
      { title: "2. リストだけを変更する", text: "下のadd_noteはそのままにし、リスト内の音名を変更して結果を比べます。" },
      { title: "3. 範囲外エラーも確かめる", text: "練習後に一度だけnotes[10]を試し、IndexErrorの表示を読んでから元へ戻します。" },
    ],
    variants: {
      example: {
        title: "リストから順番に音を取り出す",
        description: "添字とリスト要素の対応をピアノロールで確認します。",
        tasks: ["notes[2]を2回続けて使う。", 'リストの最後へ"C5"を追加し、notes[5]を鳴らす。'],
        reflection: "notes[0]が最初の音になる理由と、len(notes)が返す値を説明してください。",
        code: `from caya_music import start_song, add_note

tempo = 100
sound = "bell"
notes = ["C4", "D4", "E4", "G4", "A4"]

start_song(tempo, sound, "リストから選ぶ旋律")
print("音の候補数:", len(notes))

add_note(notes[0], 0.5)
add_note(notes[2], 0.5)
add_note(notes[4], 0.5)
add_note(notes[1], 0.5)
add_note(notes[3], 1)
`,
      },
      practice: {
        title: "音の順番をリストとして設計する",
        description: "melodyリストの中身を変更し、下のadd_noteは変更せずに旋律を作ります。",
        tasks: ["8個の音を持つリストにする。", "同じ音を3回使うが、3回連続にはしない。", "最後の音を最初の音と同じにする。"],
        reflection: "旋律の情報をリストにまとめると、コードのどこが読みやすくなるか説明してください。",
        code: `from caya_music import start_song, add_note

melody = ["C4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"]
lengths = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0]

start_song(104, "soft_synth", "リストで設計する8音")

add_note(melody[0], lengths[0])
add_note(melody[1], lengths[1])
add_note(melody[2], lengths[2])
add_note(melody[3], lengths[3])
add_note(melody[4], lengths[4])
add_note(melody[5], lengths[5])
add_note(melody[6], lengths[6])
add_note(melody[7], lengths[7])
`,
      },
      advanced: {
        title: "appendで候補を後から追加する",
        description: "空のリストへ要素を追加し、リストが変化する過程をprintで確認します。",
        tasks: ["appendを使って6音以上にする。", "追加前後のlenを表示する。", "最後から1番目を表すnotes[-1]も使う。"],
        reflection: "appendは元のリストへどのような変化を与えるか説明してください。",
        code: `from caya_music import start_song, add_note

notes = ["C4", "E4", "G4"]
print("追加前:", notes, "要素数:", len(notes))

notes.append("A4")
notes.append("C5")
print("追加後:", notes, "要素数:", len(notes))

start_song(96, "warm_pad", "appendで育つリスト")

add_note(notes[0], 1)
add_note(notes[1], 1)
add_note(notes[-1], 2)
`,
      },
    },
  },
  {
    id: "loops-triplets",
    number: 4,
    shortTitle: "forと三連符",
    title: "forとrangeで反復し、二重ループで三連符を作る",
    duration: "約20分",
    route: "講義ルート",
    concepts: ["for", "range", "インデント", "二重ループ", "三連符"],
    overview:
      "同じ処理を何度も書かず、forループで反復します。外側と内側のループを組み合わせると、小節と小節内の音という二つの時間尺度を表せます。",
    point:
      "forの次の行は字下げし、その範囲が繰り返されます。1/3拍を3個並べると1拍になり、三連符の流れを作れます。",
    bridge: "Lesson 5では、反復の途中でifを使い、位置によって音や休符を変化させます。",
    syntax: [
      { code: "for i in range(8):", title: "8回繰り返す", detail: "iは0から7まで変化し、字下げされた処理が8回実行されます。" },
      { code: "notes[i % len(notes)]", title: "リストを循環する", detail: "余りを使うと、iが大きくなっても添字を0からリスト末尾の範囲に戻せます。" },
      { code: "for bar in range(4):", title: "外側のループ", detail: "小節単位の反復を表し、その内側へ音の反復を書けます。" },
    ],
    steps: [
      { title: "1. iの値をprintする", text: "ループの中でiを表示し、0から始まることを確かめます。" },
      { title: "2. rangeと長さを別々に変える", text: "回数と1音の長さを一度に変えず、曲全体の長さへの影響を比較します。" },
      { title: "3. 二重ループを読む", text: "外側のbarが1回進む間に、内側のiが最初から最後まで動くことを確認します。" },
    ],
    variants: {
      example: {
        title: "短いリストをforで繰り返す",
        description: "4音のモチーフを2周させ、iと添字の関係を実行ログで確認します。",
        tasks: ["range(8)をrange(12)へ変える。", "1音の長さを0.5から0.25へ変え、全体長を比較する。"],
        reflection: "4個しかないnotesから8個の音が作られる仕組みを、%を使って説明してください。",
        code: `from caya_music import start_song, add_note

notes = ["C4", "E4", "G4", "A4"]

start_song(112, "pluck", "forで繰り返すモチーフ")

for i in range(8):
    index = i % len(notes)
    print("i =", i, "index =", index)
    add_note(notes[index], 0.5)
`,
      },
      practice: {
        title: "外側のrange(4)で4小節を作る",
        description: "barとiの二重ループを使い、同じモチーフを4回繰り返します。各小節の最後だけ変更してください。",
        tasks: ["外側のrange(4)は残し、motifを4音から別の4音へ変更する。", "barが3のときに使いたい終止音をlast_noteへ設定する。", "printでbarとiを確認する。"],
        reflection: "外側のループ1回に対して内側のループが何回動くか、合計音数と結び付けて説明してください。",
        code: `from caya_music import start_song, add_note

motif = ["C4", "E4", "G4", "E4"]
last_note = "C5"

start_song(108, "soft_synth", "二重ループの4小節")

for bar in range(4):
    for i in range(4):
        note = motif[i]
        if bar == 3 and i == 3:
            note = last_note
        print("bar =", bar, "i =", i)
        add_note(note, 0.5)
`,
      },
      advanced: {
        title: "《魔王》の伴奏を思わせる三連符の反復",
        description: "シューベルト《魔王》の切迫した伴奏を直接再現するのではなく、外側の4小節と内側の三連符反復という構造を参考にします。",
        tasks: ["duration=1/3で、3音が1拍になることを長さ表示で確認する。", "tripletの3音を変更し、緊張感がどう変わるか聴き比べる。", "range(12)をrange(6)やrange(9)へ変え、1小節の長さがどう変わるか確認する。"],
        reflection: "外側range(4)、内側range(12)、長さ1/3から、合計拍数を計算してください。",
        code: `from caya_music import start_song, add_note

triplet = ["G4", "Bb4", "D5"]
duration = 1 / 3

start_song(144, "pluck", "切迫する三連符")

for bar in range(4):
    for i in range(12):
        note = triplet[i % 3]
        add_note(note, duration, 0.72)

print("1小節の拍数:", 12 * duration)
print("曲全体の拍数:", 4 * 12 * duration)
`,
      },
    },
  },
  {
    id: "conditions-rhythm",
    number: 5,
    shortTitle: "ifと条件",
    title: "ifとelseで休符・アクセント・終止を作る",
    duration: "約18分",
    route: "講義ルート",
    concepts: ["if", "else", "比較", "%", "論理演算"],
    overview:
      "ループの全てを同じにせず、位置や条件によって処理を変えます。休符、強拍、フレーズ終端など、音楽の規則を条件式として表します。",
    point:
      "条件式がTrueのときif側、Falseのときelse側が実行されます。余りを使うと4拍ごと、2回ごとといった周期を作れます。",
    bridge: "Lesson 6では、条件で絞った候補の中から乱数で音を選び、偶然と規則を組み合わせます。",
    syntax: [
      { code: "if i % 4 == 3:", title: "4回ごとの位置を判定", detail: "iを4で割った余りが3になる位置、つまり4番目ごとを選びます。" },
      { code: "else:", title: "それ以外", detail: "ifの条件に当てはまらなかった場合の処理を書きます。" },
      { code: "if bar == 3 and i == 3:", title: "複数条件", detail: "andを使うと、二つの条件が両方Trueのときだけ特別な処理を行います。" },
    ],
    steps: [
      { title: "1. 条件がTrueになるiを予想する", text: "実行前に0から15まででi % 4 == 3になる値を書き出します。" },
      { title: "2. 休符を図で確認する", text: "ピアノロールに音のない空間が周期的にできることを確認します。" },
      { title: "3. 条件を一つずつ追加する", text: "最初はifとelseだけ、その後にelifやandを追加します。" },
    ],
    variants: {
      example: {
        title: "4番目ごとに休符を入れる",
        description: "一定の音列へ周期的な空白を作り、ifとelseの分岐を観察します。",
        tasks: ["% 4 == 3を% 4 == 0へ変える。", "休符の長さだけを0.25へ変える。"],
        reflection: "条件を変えると、休符が置かれる位置がなぜ移動するか説明してください。",
        code: `from caya_music import start_song, add_note, add_rest

notes = ["C4", "D4", "E4", "G4"]
start_song(116, "soft_synth", "条件で作る休符")

for i in range(16):
    if i % 4 == 3:
        add_rest(0.5)
    else:
        add_note(notes[i % len(notes)], 0.5)
`,
      },
      practice: {
        title: "拍の頭だけ強くする",
        description: "音を休ませず、4ステップごとの先頭だけvelocityを大きくします。",
        tasks: ["accentとnormalの値を変更する。", "% 4 == 0を% 8 == 0へ変える。", "強い音の位置をイベント表のvelocity列で確かめる。"],
        reflection: "音高も長さも同じなのに、velocityだけでリズムの感じ方が変わる理由を考えてください。",
        code: `from caya_music import start_song, add_note

notes = ["C4", "E4", "G4", "A4"]
accent = 0.95
normal = 0.55

start_song(120, "pluck", "条件で作るアクセント")

for i in range(16):
    if i % 4 == 0:
        velocity = accent
    else:
        velocity = normal
    add_note(notes[i % len(notes)], 0.5, velocity)
`,
      },
      advanced: {
        title: "小節末と曲末を別々に変える",
        description: "if、elif、elseを使い、通常音・小節末・曲末という3種類の処理を作ります。",
        tasks: ["final_noteを別の終止音へ変える。", "bar_end_noteを小節ごとに変える規則を加える。", "elifとelseの順番を入れ替えると何が起こるか予想する。"],
        reflection: "最も限定された条件を先に書く必要がある理由を説明してください。",
        code: `from caya_music import start_song, add_note

scale = ["C4", "D4", "E4", "G4"]
bar_end_note = "G4"
final_note = "C5"

start_song(104, "bell", "条件で作る終止")

for i in range(16):
    if i == 15:
        note = final_note
        duration = 2
    elif i % 4 == 3:
        note = bar_end_note
        duration = 1
    else:
        note = scale[i % len(scale)]
        duration = 0.5
    add_note(note, duration)
`,
      },
    },
  },
  {
    id: "random-constraints",
    number: 6,
    shortTitle: "乱数",
    title: "randomとseedで、再現できる偶然を作る",
    duration: "約20分",
    route: "講義ルート",
    concepts: ["import random", "choice", "seed", "確率", "制約"],
    overview:
      "候補の中から乱数で音を選びます。ただし、使う音域、長さ、終止音などは人が設計します。偶然を入れながらも、結果を再現できるようseedを使います。",
    point:
      "自動作曲の質は乱数そのものではなく、どの候補を用意し、どの規則で制限するかに大きく左右されます。",
    bridge: "Lesson 7では、乱数や反復を関数へまとめ、旋律・低音・ドラムを別トラックとして組み立てます。",
    syntax: [
      { code: "import random", title: "標準ライブラリを読み込む", detail: "Pythonに標準で用意されたrandomモジュールを使えるようにします。" },
      { code: "random.seed(42)", title: "乱数列を再現する", detail: "同じseedと同じコードなら、同じ選択順を再現できます。" },
      { code: "random.choice(scale)", title: "候補から1つ選ぶ", detail: "scaleリストの各要素を同じ確率で1つ選びます。" },
    ],
    steps: [
      { title: "1. seedを固定して2回実行する", text: "同じ音列が作られることを確認します。" },
      { title: "2. seedだけを変える", text: "候補や回数は変えず、結果の違いを比較します。" },
      { title: "3. 制約を増やす", text: "最後の音を固定する、跳躍を制限するなど、人が与える規則を追加します。" },
    ],
    variants: {
      example: {
        title: "seedで同じランダム旋律を再現する",
        description: "同じコードを2回実行し、結果が一致することを確かめます。",
        tasks: ["seedを7、42、100へ変えて比較する。", "scaleへ1音追加し、選択肢の変化を聴く。"],
        reflection: "ランダムなのに同じ結果を再現できる理由をseedと結び付けて説明してください。",
        code: `from caya_music import start_song, add_note
import random

scale = ["C4", "D4", "E4", "G4", "A4"]
random.seed(42)

start_song(110, "bell", "再現できるランダム旋律")

for i in range(16):
    note = random.choice(scale)
    add_note(note, 0.5)
`,
      },
      practice: {
        title: "音高・長さ・強さを別々に選ぶ",
        description: "複数の候補リストから乱数で選び、音の密度と表情を変えます。",
        tasks: ["durationsへ1/3を追加する。", "velocitiesの幅を狭くして落ち着いた曲にする。", "最後の音だけrootへ固定するifを追加する。"],
        reflection: "候補リストの内容が、生成される曲の性格をどのように制約しているか説明してください。",
        code: `from caya_music import start_song, add_note
import random

scale = ["C4", "D4", "E4", "G4", "A4"]
durations = [0.25, 0.5, 0.5, 1.0]
velocities = [0.55, 0.70, 0.85]
root = "C4"
random.seed(12)

start_song(118, "pluck", "複数の候補から選ぶ曲")

for i in range(16):
    note = random.choice(scale)
    duration = random.choice(durations)
    velocity = random.choice(velocities)
    if i == 15:
        note = root
        duration = 2
    add_note(note, duration, velocity)
`,
      },
      advanced: {
        title: "隣の音へ少しずつ移動するランダムウォーク",
        description: "毎回どの音へでも飛ぶのではなく、現在位置から-1、0、+1だけ移動して旋律の跳躍を制限します。",
        tasks: ["stepsの候補へ-2と+2を追加し、跳躍の印象を比べる。", "indexの上限・下限を守るminとmaxの働きを説明する。", "最後の4音だけ下降する規則を追加する。"],
        reflection: "完全なrandom.choice(scale)とランダムウォークで、旋律の連続性がどう変わるか説明してください。",
        code: `from caya_music import start_song, add_note
import random

scale = ["C4", "D4", "E4", "G4", "A4", "C5"]
steps = [-1, 0, 1]
index = 2
random.seed(24)

start_song(106, "soft_synth", "制約付きランダムウォーク")

for i in range(24):
    add_note(scale[index], 0.5)
    move = random.choice(steps)
    index = max(0, min(len(scale) - 1, index + move))
`,
      },
    },
  },
  {
    id: "functions-tracks",
    number: 7,
    shortTitle: "関数とトラック",
    title: "関数へ作曲規則をまとめ、複数トラックを編曲する",
    duration: "約25分",
    route: "発展・グループワーク入口",
    concepts: ["def", "引数", "戻り値", "複数トラック", "編曲"],
    overview:
      "繰り返し使う作曲規則を関数へまとめ、旋律、低音、和音、ドラムを別々のトラックとして配置します。ここから先は、作品の目的に合わせて関数を設計する段階です。",
    point:
      "関数はコードを短くするだけでなく、『モチーフを作る』『ドラムを置く』という音楽上の役割へ名前を付ける道具です。",
    bridge: "作った.pyファイルはGoogle Colabへ持ち出し、Matplotlib、NumPy、MIDI、データ可聴化などへ発展できます。",
    syntax: [
      { code: "def play_motif(notes, repeats=2):", title: "作曲規則を関数にする", detail: "音のリストと反復回数を受け取り、同じ仕組みを別の材料へ再利用します。" },
      { code: 'new_track("bass", instrument="bass")', title: "トラックを追加する", detail: "異なる役割と音色を持つ演奏レイヤーを作ります。" },
      { code: 'add_note("C2", 2, beat=0)', title: "時刻を指定して置く", detail: "現在位置ではなく、beatで指定した位置へ音を配置できます。" },
    ],
    steps: [
      { title: "1. トラックごとの役割を決める", text: "旋律、低音、和音、打楽器が同じことをしないよう、役割を短い言葉で決めます。" },
      { title: "2. 1トラックずつ実行する", text: "一度に全てを変えず、旋律だけ、次に低音、最後にドラムの順で確かめます。" },
      { title: "3. 関数の引数を作品の操作つまみにする", text: "音、反復回数、長さ、強さを引数にすると、グループで役割分担しやすくなります。" },
    ],
    variants: {
      example: {
        title: "モチーフ関数と3トラックを組み合わせる",
        description: "旋律関数、低音、ドラムを重ね、トラックごとのイベントを表で確認します。",
        tasks: ["play_motifのrepeatsを変更する。", "bass_notesを別の進行へ変える。", "スネアの位置を2拍目と4拍目から変更する。"],
        reflection: "関数とトラックが、それぞれコードの整理と音楽の整理にどう役立つか説明してください。",
        code: `from caya_music import (
    start_song, add_note, new_track, add_drum
)


def play_motif(notes, repeats=2, duration=0.5):
    for repeat in range(repeats):
        for note in notes:
            add_note(note, duration)


start_song(112, "pluck", "関数と3トラック")

motif = ["C4", "E4", "G4", "A4"]
play_motif(motif, repeats=4)

new_track("bass", instrument="bass", volume=0.72, pan=-0.10)
bass_notes = ["C2", "A1", "F2", "G2"]
for bar, note in enumerate(bass_notes):
    add_note(note, 2, beat=bar * 2)

new_track("drums", instrument="drums", volume=0.72)
for step in range(16):
    beat = step * 0.5
    add_drum("hihat", 0.12, 0.45, beat=beat)
    if step % 4 == 0:
        add_drum("kick", 0.25, 0.90, beat=beat)
    if step % 4 == 2:
        add_drum("snare", 0.20, 0.72, beat=beat)
`,
      },
      practice: {
        title: "引数で変化するアルペジオ関数を作る",
        description: "音の材料、開始時刻、反復回数、長さを引数にし、同じ関数からA部分とB部分を作ります。",
        tasks: ["section_aとsection_bを別の和音構成音へ変える。", "B部分だけdurationを1/3にする。", "関数へvelocity引数を追加する。"],
        reflection: "A部分とB部分の共通点を関数へ、違いを引数へ分ける考え方を説明してください。",
        code: `from caya_music import start_song, add_note, move_to


def arpeggio(notes, start, repeats, duration):
    move_to(start)
    for repeat in range(repeats):
        for note in notes:
            add_note(note, duration)


start_song(108, "bell", "引数で作るA-B-A")

section_a = ["C4", "E4", "G4", "C5"]
section_b = ["A3", "C4", "E4", "A4"]

arpeggio(section_a, start=0, repeats=2, duration=0.5)
arpeggio(section_b, start=4, repeats=2, duration=0.5)
arpeggio(section_a, start=8, repeats=2, duration=0.5)
`,
      },
      advanced: {
        title: "旋律・和音・低音・ドラムを関数で編曲する",
        description: "4つの役割を関数へ分け、16拍の小作品を完成させます。グループワーク用の出発点です。",
        tasks: ["各関数を担当者ごとに分けても読み合わせできるようコメントを書く。", "8拍目以降に一つだけ変化を追加する。", "トラックのvolumeとpanを調整し、役割が聞き分けられるようにする。"],
        reflection: "作品全体の構造、各トラックの役割、Pythonの関数設計を対応させて説明してください。",
        code: `from caya_music import (
    start_song, add_note, add_chord, new_track, add_drum
)


def write_melody():
    phrase = ["E4", "G4", "A4", "G4", "E4", "D4", "C4", "D4"]
    for repeat in range(4):
        for note in phrase:
            add_note(note, 0.5, 0.72)


def write_chords():
    chords = [
        ["C4", "E4", "G4"],
        ["A3", "C4", "E4"],
        ["F3", "A3", "C4"],
        ["G3", "B3", "D4"],
    ]
    for bar, chord in enumerate(chords):
        add_chord(chord, 4, 0.45, beat=bar * 4)


def write_bass():
    roots = ["C2", "A1", "F2", "G2"]
    for bar, note in enumerate(roots):
        add_note(note, 4, 0.72, beat=bar * 4)


def write_drums():
    for step in range(32):
        beat = step * 0.5
        add_drum("hihat", 0.10, 0.36, beat=beat)
        if step % 8 in (0, 4):
            add_drum("kick", 0.22, 0.88, beat=beat)
        if step % 8 in (2, 6):
            add_drum("snare", 0.18, 0.68, beat=beat)


start_song(114, "pluck", "4つの役割で作る作品")
write_melody()

new_track("chords", instrument="warm_pad", volume=0.50, pan=0.20)
write_chords()

new_track("bass", instrument="bass", volume=0.68, pan=-0.15)
write_bass()

new_track("drums", instrument="drums", volume=0.65)
write_drums()
`,
      },
    },
  },
];

export function getLesson(id) {
  return LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[0];
}

export function getActivity(lesson, activityId) {
  const fallback = ACTIVITY_ORDER.find((id) => lesson.variants[id]) ?? "example";
  return lesson.variants[activityId] ?? lesson.variants[fallback];
}
