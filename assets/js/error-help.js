const HELP = {
  SyntaxError: {
    title: "コードの書き方をPythonが読み取れませんでした",
    explanation:
      "括弧・引用符・コロンなどが不足しているか、Pythonの文法に合わない並びになっている可能性があります。",
    suggestions: [
      "エラー行と、その1行前を見比べてください。原因が直前の行にあることもあります。",
      "for、if、else、defの行末に半角のコロン : があるか確認してください。",
      "丸括弧 ( )、角括弧 [ ]、引用符 \" \" が左右で対応しているか確認してください。",
    ],
  },
  IndentationError: {
    title: "字下げ（インデント）が揃っていません",
    explanation:
      "Pythonでは行頭の空白が処理のまとまりを表します。forやifの中は、通常は半角スペース4個ぶん字下げします。",
    suggestions: [
      "for、if、else、defの次の行が字下げされているか確認してください。",
      "同じまとまりにある行は、行頭の空白数を揃えてください。",
      "Tabとスペースを混ぜず、このエディタでは半角スペース4個を使ってください。",
    ],
  },
  TabError: {
    title: "Tabとスペースが混在しています",
    explanation:
      "見た目が似ていても、Tab文字と半角スペースは別の文字です。Pythonは混在した字下げを正しく判定できないことがあります。",
    suggestions: [
      "問題の行の先頭を一度削除し、半角スペース4個で字下げし直してください。",
      "このエディタでTabキーを押すと、半角スペース4個が入力されます。",
    ],
  },
  NameError: {
    title: "その変数名や関数名は、まだ作られていません",
    explanation:
      "名前の綴りが違うか、その名前へ値を代入する前に使っている可能性があります。Pythonでは大文字と小文字も区別されます。",
    suggestions: [
      "エラーに表示された名前と、代入した行の名前を1文字ずつ比べてください。",
      "その名前を作る行が、使う行より上にあるか確認してください。",
      "tempoとtemop、noteとnotesのような似た名前に注意してください。",
    ],
  },
  TypeError: {
    title: "値の種類が、処理の想定と合っていません",
    explanation:
      "数値が必要な場所へ文字列を渡した、リストが必要な場所へ1つの値を渡した、などの可能性があります。",
    suggestions: [
      "引用符で囲まれた値は文字列、囲まれていない0.5や4は数値です。",
      "add_noteの音名は \"C4\" のような文字列、長さは0.5のような数値にしてください。",
      "関数の丸括弧に渡した値の順番も確認してください。",
    ],
  },
  IndexError: {
    title: "リストに存在しない番号を指定しています",
    explanation:
      "Pythonのリスト番号は0から始まります。要素が5個なら、使える番号は0から4までです。",
    suggestions: [
      "len(リスト名)で要素数を確かめてください。",
      "notes[5]ではなくnotes[4]までではないか確認してください。",
      "繰り返しで番号を使う場合は、i % len(notes)の形も検討してください。",
    ],
  },
  ValueError: {
    title: "値の種類は合っていますが、内容が許容範囲外です",
    explanation:
      "音名の形式、テンポ、音の長さ、音量などに、このアプリで扱えない値が指定された可能性があります。",
    suggestions: [
      "元のエラーメッセージには、必要な形式や範囲が日本語で示されています。",
      "音名は \"C4\"、\"F#4\"、\"Bb3\" のように指定してください。",
      "テンポは40から240、velocityとvolumeは0から1の範囲です。",
    ],
  },
  ModuleNotFoundError: {
    title: "読み込もうとしたモジュールが見つかりません",
    explanation:
      "このブラウザ環境には、Python標準ライブラリと教材用のcaya_musicが用意されています。外部パッケージは自動では追加されません。",
    suggestions: [
      "importの綴りを確認してください。",
      "教材では from caya_music import * と import random をそのまま使えます。",
      "外部パッケージを使う発展制作はGoogle Colabで行う方が適しています。",
    ],
  },
  RuntimeError: {
    title: "実行中に安全上の上限へ達しました",
    explanation:
      "イベント数や曲の長さなどが、この教材で安全に扱う上限を超えた可能性があります。",
    suggestions: [
      "rangeの回数が意図せず大きくなっていないか確認してください。",
      "ループが何重にもなっていないか確認してください。",
      "元のエラーメッセージに示された上限以内へ調整してください。",
    ],
  },
  TimeoutError: {
    title: "Pythonの実行が制限時間を超えました",
    explanation:
      "終了しないwhile文や非常に大きな繰り返しがある可能性があります。画面を止めないため、Python実行環境をいったん再起動しました。",
    suggestions: [
      "while Trueのように終了条件がないループがないか確認してください。",
      "rangeの値を16や32程度へ戻して試してください。",
      "二重・三重のfor文では、全体の繰り返し回数を掛け算で見積もってください。",
    ],
  },
};

export function extractErrorLine(traceback = "") {
  const matches = [...String(traceback).matchAll(/student_code\.py["']?, line (\d+)/g)];
  if (!matches.length) {
    return null;
  }
  return Number(matches[matches.length - 1][1]);
}

export function buildErrorHelp(result) {
  const type = result?.errorType || "Error";
  const base = HELP[type] ?? {
    title: "実行中にエラーが起きました",
    explanation:
      "元のエラーメッセージを読み、最後の1行に書かれた種類と内容から原因を探します。",
    suggestions: [
      "最後に変更した箇所を1つ元へ戻してみてください。",
      "エラー行だけでなく、その直前の行も確認してください。",
      "初期コードへ戻し、少しずつ変更して原因を切り分けてください。",
    ],
  };

  const message = String(result?.error ?? "");
  const suggestions = [...base.suggestions];

  if (type === "SyntaxError" && /expected ':'/.test(message)) {
    suggestions.unshift("このエラーでは、行末のコロン : が不足している可能性が高いです。");
  }
  if (type === "NameError") {
    const name = message.match(/name '([^']+)' is not defined/)?.[1];
    if (name) {
      suggestions.unshift(`Pythonは「${name}」という名前を見つけられませんでした。綴りと代入位置を確認してください。`);
    }
  }
  if (type === "IndexError") {
    suggestions.unshift("リストの先頭は0番です。要素数そのものを添字にすると1つ大きすぎます。");
  }

  return {
    type,
    title: base.title,
    explanation: base.explanation,
    suggestions,
    line: extractErrorLine(result?.traceback),
    original: result?.traceback || result?.error || "詳細情報はありません。",
  };
}
