export const LESSONS = [
  {
    id: "first-notes",
    number: 1,
    shortTitle: "音を置く",
    title: "関数を呼び出して、最初の4音を作る",
    duration: "約10分",
    route: "講義ルート",
    concepts: ["関数呼び出し", "文字列", "数値"],
    overview:
      "まずは、用意された作曲用の関数を呼び出します。コードを上から1行ずつ読み、音名と長さを変えると、どの部分が音に対応しているかを確かめられます。",
    point:
      "関数は、まとまった処理に名前を付けたものです。丸括弧の中へ渡す値を変えると、同じ関数でも結果が変わります。",
    syntax: [
      {
        code: 'add_note("C4", 1)',
        title: "関数呼び出し",
        detail:
          "add_noteという処理へ、音名\"C4\"と長さ1を渡しています。丸括弧の中の値を引数と呼びます。",
      },
      {
        code: '"C4"',
        title: "文字列",
        detail:
          "文字をデータとして扱うときは、半角の引用符で囲みます。C4は中央付近のドを表します。",
      },
      {
        code: "1 / 0.5 / 2",
        title: "数値",
        detail:
          "このアプリでは1を1拍として扱います。0.5は半拍、2は2拍です。",
      },
    ],
    steps: [
      {
        title: "1. 曲の準備をする",
        text:
          "start_songでテンポ、音色、曲名を決めます。最初は値をそのまま使い、音が鳴ることを確認しましょう。",
      },
      {
        title: "2. add_noteを上から読む",
        text:
          "各行は1つの音イベントを追加します。コードの順番と、ピアノロールの左から右への並びを比べてください。",
      },
      {
        title: "3. 1か所だけ変えて実行する",
        text:
          "例えば最後の\"C5\"を\"A4\"へ変えます。複数箇所を一度に変えず、変更と結果の対応を観察します。",
      },
    ],
    challenge: [
      '最後の音を "C5" から "A4" に変える。',
      "2番目の音の長さを1から0.5へ変える。",
      "5音目を自分で1行追加する。",
    ],
    code: `from caya_music import *

# 曲全体の準備
start_song(
    tempo=96,
    instrument="soft_synth",
    title="はじめの4音"
)

# 音名と長さを順番に指定する
add_note("C4", 1)
add_note("E4", 1)
add_note("G4", 1)
add_note("C5", 2)
`,
  },
  {
    id: "variables",
    number: 2,
    shortTitle: "変数",
    title: "変数に名前を付けて、曲の設定をまとめる",
    duration: "約12分",
    route: "講義ルート",
    concepts: ["変数", "代入", "再利用"],
    overview:
      "同じ値を何度も直接書く代わりに、値へ分かりやすい名前を付けます。テンポや音色を変数にすると、曲の設定がどこにあるかをすぐに見つけられます。",
    point:
      "イコールは数学の等号ではなく、右側の値を左側の名前へ入れる代入です。後の行では、その名前を使って値を取り出せます。",
    syntax: [
      {
        code: "tempo = 108",
        title: "数値を変数へ代入",
        detail:
          "108という数値をtempoという名前で記憶します。変数名は内容が想像できる短い名前にします。",
      },
      {
        code: 'sound = "pluck"',
        title: "文字列を変数へ代入",
        detail:
          "pluckという文字列をsoundへ入れます。右の操作欄で音色を選ぶと、この行も書き換わります。",
      },
      {
        code: "add_note(note, length)",
        title: "変数を使う",
        detail:
          "文字列や数値を直接書く代わりに、既に作った変数を関数へ渡しています。",
      },
    ],
    steps: [
      {
        title: "1. 代入する行を見つける",
        text:
          "tempo、sound、note、lengthの4つが設定です。まず右辺のデータ型が数値か文字列かを確認します。",
      },
      {
        title: "2. 同じ変数が使われる場所を探す",
        text:
          "start_songとadd_noteの丸括弧の中で、上にある変数名が再利用されています。",
      },
      {
        title: "3. GUIとコードのつながりを試す",
        text:
          "右側のテンポや音色を操作すると、Pythonコードの代入行が変わります。その後、必ずPythonを実行してください。",
      },
    ],
    challenge: [
      "tempoを72、120、156の順に変え、印象の違いを言葉にする。",
      'noteを "A4" に変える。',
      "lengthを0.25へ変え、add_noteの行を8個に増やす。",
    ],
    code: `from caya_music import *

# 値に名前を付ける
# 右側の操作欄からも、この2行を書き換えられます
tempo = 108
sound = "pluck"
note = "E4"
length = 0.5

start_song(
    tempo=tempo,
    instrument=sound,
    title="変数で作るリズム"
)

# 同じ変数を何度も使う
add_note(note, length)
add_note(note, length)
add_note("G4", length)
add_note("A4", length)
add_note(note, 1)
`,
  },
  {
    id: "lists",
    number: 3,
    shortTitle: "リスト",
    title: "リストに音をまとめ、番号で取り出す",
    duration: "約13分",
    route: "講義ルート",
    concepts: ["リスト", "添字", "len"],
    overview:
      "旋律で使う音を角括弧の中へまとめます。リストを使うと、音の候補を一つのまとまりとして持ち運び、番号で必要な要素を取り出せます。",
    point:
      "Pythonの番号は0から始まります。最初の要素はnotes[0]、2番目はnotes[1]です。ここは初心者が最も間違えやすい点の一つです。",
    syntax: [
      {
        code: 'notes = ["C4", "D4", "E4"]',
        title: "リストを作る",
        detail:
          "複数の値をカンマで区切り、角括弧で囲みます。ここでは文字列をまとめています。",
      },
      {
        code: "notes[0]",
        title: "添字で取り出す",
        detail:
          "角括弧の中の0は、先頭の要素を指定する番号です。最後の番号は要素数より1小さくなります。",
      },
      {
        code: "len(notes)",
        title: "要素数を調べる",
        detail:
          "lenはリストの長さを返します。このコードではprintを使って実行ログへ表示します。",
      },
    ],
    steps: [
      {
        title: "1. notesの中身を数える",
        text:
          "音名が5個あるので、使える添字は0、1、2、3、4です。notes[5]は範囲外になります。",
      },
      {
        title: "2. 添字と音を表で対応させる",
        text:
          "実行後のイベント表とコードを見比べ、notes[0]がC4、notes[4]がA4になることを確認します。",
      },
      {
        title: "3. リストの中身を変更する",
        text:
          "コード本体を変えず、notesの要素だけを書き換えて旋律全体の材料を変えてみましょう。",
      },
    ],
    challenge: [
      'notesの最後に "C5" を追加し、add_note(notes[5], 1)も追加する。',
      "notes[2]を2回続けて使う。",
      "わざとnotes[10]を書き、IndexErrorのヒントを確認してから直す。",
    ],
    code: `from caya_music import *

tempo = 100
sound = "bell"

# 複数の音を1つのリストにまとめる
notes = ["C4", "D4", "E4", "G4", "A4"]

start_song(
    tempo=tempo,
    instrument=sound,
    title="リストから選ぶ旋律"
)

print("音の候補数:", len(notes))

# リストの番号は0から始まる
add_note(notes[0], 0.5)
add_note(notes[2], 0.5)
add_note(notes[4], 1)
add_note(notes[3], 0.5)
add_note(notes[1], 0.5)
add_note(notes[0], 2)
`,
  },
  {
    id: "loops",
    number: 4,
    shortTitle: "for",
    title: "forとrangeで、短いコードから反復を作る",
    duration: "約15分",
    route: "講義ルート",
    concepts: ["for", "range", "インデント"],
    overview:
      "同じ処理を何度も書く代わりに、for文で繰り返します。音楽には反復が多いため、ループの働きを耳と目の両方で理解できます。",
    point:
      "forの次の行は字下げします。Pythonでは、このインデントが繰り返す範囲を表します。半角スペース4個を基本にしましょう。",
    syntax: [
      {
        code: "for i in range(4):",
        title: "回数を指定するループ",
        detail:
          "range(4)は0、1、2、3を順番に作ります。末尾のコロンを忘れず、次の行を字下げします。",
      },
      {
        code: "for note in notes:",
        title: "リストを順に読むループ",
        detail:
          "notesから要素を1つずつ取り出し、その都度noteという変数へ入れます。",
      },
      {
        code: "    add_note(note, 0.5)",
        title: "インデントされた処理",
        detail:
          "行頭の空白が、for文の中で繰り返す処理であることを示します。",
      },
    ],
    steps: [
      {
        title: "1. range(4)の値をprintで観察する",
        text:
          "実行ログにはiが0から3まで表示されます。4回繰り返しても、最後の値は4ではありません。",
      },
      {
        title: "2. 反復回数とイベント数を比べる",
        text:
          "最初のforは4個、次のforはリストの5要素を2周するので10個のイベントを作ります。",
      },
      {
        title: "3. 字下げを1度だけ崩して戻す",
        text:
          "add_noteの前の空白を削り、エラー表示を確認します。その後、半角スペース4個へ戻します。",
      },
    ],
    challenge: [
      "range(4)をrange(8)へ変える。",
      "notesの順番を逆に並べ替える。",
      "2つ目のfor文のadd_noteを0.25拍にして速いフレーズにする。",
    ],
    code: `from caya_music import *

tempo = 112
sound = "pluck"
notes = ["C4", "D4", "E4", "G4", "A4"]

start_song(
    tempo=tempo,
    instrument=sound,
    title="forで作る反復"
)

# range(4)は0, 1, 2, 3を順に作る
for i in range(4):
    print("いまのi:", i)
    add_note("C4", 0.25)

# リストの要素を順番に取り出す
for repeat in range(2):
    for note in notes:
        add_note(note, 0.5)
`,
  },
  {
    id: "conditions",
    number: 5,
    shortTitle: "if と %",
    title: "ifと剰余演算子で、周期的な休符を入れる",
    duration: "約15分",
    route: "講義ルート",
    concepts: ["if / else", "比較", "剰余 %"],
    overview:
      "毎回まったく同じ処理をするのではなく、番号に応じて音と休符を切り替えます。条件分岐によって、反復の中へ規則的な変化を作ります。",
    point:
      "i % 4はiを4で割った余りです。余りは0、1、2、3を繰り返すため、4回ごとの処理を作るときに便利です。",
    syntax: [
      {
        code: "if i % 4 == 3:",
        title: "条件を判定する",
        detail:
          "iを4で割った余りが3と等しいときだけ、次の字下げされた処理を実行します。比較では==を使います。",
      },
      {
        code: "add_rest(0.5)",
        title: "休符を置く",
        detail:
          "音を追加せず、現在位置だけを0.5拍進めます。ピアノロールでは空白として見えます。",
      },
      {
        code: "else:",
        title: "それ以外の処理",
        detail:
          "ifの条件がFalseだった場合に、elseの下にある処理を実行します。",
      },
    ],
    steps: [
      {
        title: "1. 余りの周期を実行ログで見る",
        text:
          "iとi % 4を表示します。0,1,2,3の繰り返しと、4拍単位のリズムの対応を確認します。",
      },
      {
        title: "2. Trueになる番号を探す",
        text:
          "iが3、7、11、15のときに余りが3となり、その場所へ休符が入ります。",
      },
      {
        title: "3. 条件を変えて比較する",
        text:
          "== 3を== 0へ変えると、各4音の先頭が休符になります。聞こえ方の違いを説明しましょう。",
      },
    ],
    challenge: [
      "休符の条件をi % 4 == 0へ変える。",
      "i % 2 == 1を使い、音と休符を交互にする。",
      "elseの中で、4拍ごとにvelocityを変える条件をもう1つ加える。",
    ],
    code: `from caya_music import *

tempo = 116
sound = "soft_synth"
notes = ["C4", "D4", "E4", "G4", "A4"]

start_song(
    tempo=tempo,
    instrument=sound,
    title="条件で作る休符"
)

for i in range(16):
    remainder = i % 4
    print(i, "を4で割った余り:", remainder)

    if remainder == 3:
        add_rest(0.5)
    else:
        note = notes[i % len(notes)]
        add_note(note, 0.5)
`,
  },
  {
    id: "random",
    number: 6,
    shortTitle: "random",
    title: "randomとseedで、再現できる自動作曲を行う",
    duration: "約18分",
    route: "講義ルート",
    concepts: ["import", "random.choice", "seed"],
    overview:
      "候補となる音をリストに用意し、乱数で選びます。完全に無制限な乱数ではなく、使う音・長さ・休符の規則を人が設計することで、自動作曲になります。",
    point:
      "seedを同じ値にすると、同じ乱数列が作られます。偶然を使いながら結果を再現できるため、実験や比較にも重要です。",
    syntax: [
      {
        code: "import random",
        title: "標準ライブラリを読み込む",
        detail:
          "Pythonに最初から用意されているrandomモジュールの機能を使えるようにします。",
      },
      {
        code: "random.seed(7)",
        title: "乱数の出発点を固定する",
        detail:
          "同じseedと同じコードなら同じ旋律になります。値を変えると別の旋律を探索できます。",
      },
      {
        code: "random.choice(notes)",
        title: "リストから1つ選ぶ",
        detail:
          "notesの中から要素をランダムに1つ取り出します。候補を限定することが作曲ルールになります。",
      },
    ],
    steps: [
      {
        title: "1. seedを変えずに2回実行する",
        text:
          "音の並びが同じになることを、耳だけでなくイベント表でも確認します。",
      },
      {
        title: "2. seedだけを変える",
        text:
          "seedを8や42へ変えます。他の条件を同じにして、乱数の出発点だけの影響を比べます。",
      },
      {
        title: "3. 候補リストを設計する",
        text:
          "notesから音を減らす、同じ音を重複して入れるなど、選ばれやすさや曲調を意図的に変えます。",
      },
    ],
    challenge: [
      "seedを3種類試し、最も気に入った値を残す。",
      'notesへ同じ "C4" を2回入れ、選ばれやすさが変わるか観察する。',
      "random.random() < 0.18の0.18を0.05と0.40で比べる。",
    ],
    code: `from caya_music import *
import random

tempo = 104
sound = "bell"
seed = 7
notes = ["C4", "D4", "E4", "G4", "A4", "C5"]

random.seed(seed)

start_song(
    tempo=tempo,
    instrument=sound,
    title="seedで再現できる自動作曲"
)

for i in range(24):
    # 約18%の確率で休符にする
    if random.random() < 0.18:
        add_rest(0.5)
    else:
        note = random.choice(notes)
        velocity = random.choice([0.55, 0.7, 0.85])
        add_note(note, 0.5, velocity)
`,
  },
  {
    id: "functions-layers",
    number: 7,
    shortTitle: "関数と層",
    title: "defで作曲ルールを関数にし、複数トラックを重ねる",
    duration: "発展 約25分",
    route: "グループワークへの入口",
    concepts: ["def", "引数", "複数トラック"],
    overview:
      "ここまでに使ったリスト、for、ifを関数の中へまとめます。メロディ、ベース、ドラムを別々のトラックとして作り、短いルールを組み合わせて作品へ発展させます。",
    point:
      "関数は処理を再利用するための設計単位です。何を変えたいかを引数にすると、同じ構造から異なるフレーズを作れます。",
    syntax: [
      {
        code: "def make_phrase(notes, repeats):",
        title: "関数を定義する",
        detail:
          "defの後に関数名を書き、丸括弧の中へ外から受け取る値を並べます。定義しただけではまだ実行されません。",
      },
      {
        code: "make_phrase(scale, 2)",
        title: "自分の関数を呼び出す",
        detail:
          "scaleをnotesへ、2をrepeatsへ渡し、関数の中の処理を実行します。",
      },
      {
        code: 'new_track("bass", instrument="bass")',
        title: "新しいトラックを作る",
        detail:
          "以後のadd_noteはbassトラックへ追加されます。トラックごとに音色や音量を設定できます。",
      },
    ],
    steps: [
      {
        title: "1. make_phraseの入口と出口を読む",
        text:
          "notesとrepeatsがどこで使われているか追います。関数内の二重forがフレーズを繰り返します。",
      },
      {
        title: "2. トラックを1つずつ確認する",
        text:
          "メロディだけ、次にベース、最後にドラムという順でコードを一時的にコメントアウトすると役割が分かります。",
      },
      {
        title: "3. グループの作曲ルールを文章にする",
        text:
          "『4拍ごとに高い音』『低音は2拍ずつ』『偶数拍にキック』など、コードを書く前にルールを日本語で定義します。",
      },
    ],
    challenge: [
      "make_phraseへdurationという引数を追加する。",
      "ベースの4音を別の進行へ変える。",
      "スネアをi % 4 == 2の位置へ追加する。",
      "Google Colabで同じ考え方を使い、独自の関数を1つ作る。",
    ],
    code: `from caya_music import *

# リストと繰り返し処理を関数にまとめる
def make_phrase(notes, repeats):
    for repeat in range(repeats):
        for note in notes:
            add_note(note, 0.5, 0.72)


tempo = 108
sound = "pluck"
scale = ["C4", "D4", "E4", "G4", "A4", "G4", "E4", "D4"]

start_song(
    tempo=tempo,
    instrument=sound,
    title="3つの層で作る曲"
)

# 1. メロディ
make_phrase(scale, 2)

# 2. ベース
new_track("bass", instrument="bass", volume=0.72)
for note in ["C2", "A1", "F2", "G2"]:
    add_note(note, 2, 0.75)
for note in ["C2", "A1", "F2", "G2"]:
    add_note(note, 2, 0.75)

# 3. ドラム
new_track("drums", instrument="drums", volume=0.62)
for i in range(32):
    if i % 4 == 0:
        add_drum("kick", 0.5, 0.9)
    elif i % 4 == 2:
        add_drum("snare", 0.5, 0.72)
    else:
        add_drum("hihat", 0.5, 0.42)
`,
  },
];

export function getLesson(id) {
  return LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[0];
}
