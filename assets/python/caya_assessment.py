"""Formative checks for the SPICA-aligned course; not an examination sandbox.

Runs real Python, checks generated data, and exercises functions with other
inputs. The public answer examples are teaching material, not secret tests.
"""
from __future__ import annotations

import ast
import contextlib
from copy import deepcopy
import importlib
import io
import math
import random
import re
import traceback

TASKS = {f"{lesson}.{activity}" for lesson in
         ("variables", "lists", "loops", "conditions", "functions", "random", "arrangement")
         for activity in ("example", "practice", "advanced")}


class LimitedOutput(io.StringIO):
    def write(self, text):
        text = str(text)
        remaining = max(0, 24000 - self.tell())
        super().write(text[:remaining])
        return len(text)


@contextlib.contextmanager
def record_random():
    original_seed, original_choice = random.seed, random.choice
    trace = {"seeds": [], "choices": 0}

    def seed(value=None, *args, **kwargs):
        trace["seeds"].append(value)
        return original_seed(value, *args, **kwargs)

    def choice(sequence):
        trace["choices"] += 1
        return original_choice(sequence)

    random.seed, random.choice = seed, choice
    try:
        yield trace
    finally:
        random.seed, random.choice = original_seed, original_choice


def execute(source, overrides=None):
    """Fresh namespace, music data and random state for every execution."""
    import caya_music
    music = importlib.reload(caya_music)
    random.seed(20260928)
    tree = ast.parse(source, filename="student_code.py")
    for name, value in (overrides or {}).items():
        assignment = next((node for node in tree.body if
            isinstance(node, ast.Assign) and len(node.targets) == 1 and
            isinstance(node.targets[0], ast.Name) and node.targets[0].id == name), None)
        if assignment is None:
            raise ValueError(f"入力を変える確認: {name} = ... の代入行を見つけられません。問題で指定した変数名を確認してください。")
        assignment.value = ast.copy_location(ast.parse(repr(value), mode="eval").body, assignment.value)
    ast.fix_missing_locations(tree)
    namespace = {"__name__": "__main__", "__builtins__": __builtins__,
                 "begin_song": music.start_song, "record_note": music.add_note}
    stdout, stderr = LimitedOutput(), LimitedOutput()
    with record_random() as trace, contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        exec(compile(tree, "student_code.py", "exec"), namespace)
    return {"song": music.export_song(), "namespace": namespace, "trace": trace,
            "stdout": stdout.getvalue(), "stderr": stderr.getvalue(), "music": music}


def close(actual, expected):
    if isinstance(expected, bool):
        return actual is expected
    if isinstance(expected, (int, float)):
        return (not isinstance(actual, bool) and isinstance(actual, (int, float))
                and math.isfinite(float(actual)) and
                math.isclose(actual, expected, rel_tol=1e-7, abs_tol=1e-7))
    if isinstance(expected, (list, tuple)):
        return isinstance(actual, (list, tuple)) and len(actual) == len(expected) and all(
            close(a, b) for a, b in zip(actual, expected))
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(key in actual and close(actual[key], value)
                                               for key, value in expected.items())
    return actual == expected


def description(value):
    text = repr(value)
    return text if len(text) <= 1000 else text[:1000] + " …"


def note_events(song, track_name=None):
    return [event for track in song["tracks"]
            if track_name is None or track["name"] == track_name
            for event in track["events"] if event["kind"] == "note"]


def shape(song, track_name=None):
    events = note_events(song, track_name)
    result = {
        "音": [e["notes"][0] if len(e["notes"]) == 1 else e["notes"] for e in events],
        "開始拍": [e["beat"] for e in events],
        "長さ": [e["duration"] for e in events],
        "全体の拍数": song["length_beats"],
    }
    return result


def expected_shape(notes, lengths, beats=None, total=None):
    if isinstance(lengths, (int, float)):
        lengths = [lengths] * len(notes)
    if beats is None:
        beats, position = [], 0
        for length in lengths:
            beats.append(position)
            position += length
    if total is None:
        total = max((beat + length for beat, length in zip(beats, lengths)), default=0)
    return {"音": notes, "開始拍": beats, "長さ": lengths, "全体の拍数": total}


def grade(source, task_id, result):
    checks = []
    namespace = result["namespace"]
    tree = ast.parse(source)

    def check(label, actual, expected, hint="問題の条件と、表示された実行結果を比べてください。"):
        passed = bool(close(actual, expected))
        checks.append({"label": label, "passed": passed,
                       "message": "条件を満たしています。" if passed else hint,
                       "expected": description(expected), "actual": description(actual)})

    def attempt(label, operation, hint):
        try:
            actual, expected = operation()
            check(label, actual, expected, hint)
        except BaseException as exc:
            checks.append({"label": label, "passed": False,
                           "message": f"{hint} ({type(exc).__name__}: {str(exc)[:300]})",
                           "expected": "この入力でも最後まで実行できること", "actual": "確認中に例外が起きました"})

    def transformed(label, overrides, expected):
        attempt(label, lambda: (shape(execute(source, overrides)["song"]), expected),
                "数値や音名を直書きせず、指定された入力変数から処理を組み立ててください。")

    def real_node(node_type, label):
        check(label, any(isinstance(node, node_type) for node in ast.walk(tree)), True,
              "コメント中の単語ではなく、実際に実行できるPythonの構文として書いてください。")

    def named_function(name):
        check(f"{name}をdefで定義する", any(isinstance(node, ast.FunctionDef) and node.name == name
              for node in ast.walk(tree)), True, "指定された名前・引数で関数を定義してください。")

    def pure_case(name, arguments, expected):
        run = execute(source)
        args = deepcopy(arguments)
        before = deepcopy(args)
        with contextlib.redirect_stdout(LimitedOutput()), contextlib.redirect_stderr(LimitedOutput()), record_random() as trace:
            value = run["namespace"][name](*args)
        return ({"返り値": value, "入力を変更しない": args == before,
                 "新しいリスト": isinstance(value, list) and (not args or value is not args[0])},
                {"返り値": expected, "入力を変更しない": True, "新しいリスト": True})

    song = result["song"]
    if task_id == "variables.practice":
        check("4音の順序・開始・長さ", shape(song), expected_shape(["C4", "E4", "G4", "C5"], [0.5, 0.5, 0.5, 1.5]),
              "最初の3音にbeat、最後の音にlong_lengthを渡しているか確認します。")
        check("long_lengthは1.5拍", namespace.get("long_length"), 1.5, "beatの3倍を計算します。")
        transformed("beat=0.25でも長さが連動する", {"beat": 0.25},
                    expected_shape(["C4", "E4", "G4", "C5"], [0.25, 0.25, 0.25, 0.75]))
    elif task_id == "variables.advanced":
        check("3音・4拍の曲", shape(song), expected_shape(["C4", "E4", "G4"], [1, 1, 2]))
        check("拍数と秒数を区別する", [namespace.get("seconds_per_beat"), namespace.get("total_beats"), namespace.get("estimated_seconds")],
              [0.5, 4, 2], "60 / tempoで1拍の秒数を求め、合計拍数を掛けます。")
        check("予測秒数をprintする", any(close(float(token), 2) for token in re.findall(r"-?\d+(?:\.\d+)?", result["stdout"])), True,
              "estimated_secondsをprintしてください。")
        for tempo, beat, seconds in [(60, 1, 4), (120, 0.5, 1)]:
            attempt(f"tempo={tempo}, beat={beat}で秒数を確認", lambda t=tempo, b=beat, s=seconds:
                    (execute(source, {"tempo": t, "beat": b})["namespace"].get("estimated_seconds"), s),
                    "tempoとbeatを変えても計算できる式にしてください。")
    elif task_id == "lists.practice":
        check("append後のリスト", namespace.get("melody"), ["C4", "E4", "G4", "C5"])
        check("appendを呼び出している", any(isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
              and node.func.attr == "append" for node in ast.walk(tree)), True, "appendで元のリストに追加します。")
        check("リストから4音を置く", shape(song), expected_shape(["C4", "E4", "G4", "C5"], 0.5))
        check("要素数を表示する", bool(re.search(r"\b4\b", result["stdout"])), True, "len(melody)をprintします。")
        transformed("最初の2要素を変えても取り出せる", {"melody": ["D4", "F4"]}, expected_shape(["D4", "F4", "G4", "C5"], 0.5))
    elif task_id == "lists.advanced":
        check("長さの組はtuple", isinstance(namespace.get("rhythm"), tuple), True)
        info = namespace.get("song_info")
        check("設定はtempoとtitleを持つdict", isinstance(info, dict) and info.get("tempo") == 96
              and isinstance(info.get("title"), str) and bool(info["title"].strip()), True)
        check("更新した音と交互の長さ", shape(song), expected_shape(["C4", "F4", "G4", "B4"], [0.5, 1, 0.5, 1]))
        transformed("別の音データでも添字が働く", {"notes": ["D4", "E4", "A4", "C5"]},
                    expected_shape(["D4", "F4", "A4", "C5"], [0.5, 1, 0.5, 1]))
        transformed("tupleを変えると長さも変わる", {"rhythm": (0.25, 0.5)},
                    expected_shape(["C4", "F4", "G4", "B4"], [0.25, 0.5, 0.25, 0.5]))
    elif task_id == "loops.practice":
        real_node(ast.For, "for文で繰り返す")
        check("8音・4拍", shape(song), expected_shape(["C4"] * 8, 0.5), "rangeの回数と、add_noteのインデントを確認します。")
        transformed("回数を4へ変える", {"repeat_count": 4}, expected_shape(["C4"] * 4, 0.5))
    elif task_id == "loops.advanced":
        check("入れ子のfor文を使う", any(isinstance(node, ast.For) and any(isinstance(child, ast.For)
              for statement in node.body for child in ast.walk(statement)) for node in ast.walk(tree)), True,
              "外側で回数、内側で音のリストを繰り返します。")
        check("3音を3回・合計3拍", shape(song), expected_shape(["C4", "E4", "G4"] * 3, 1 / 3))
        transformed("音列と回数を同時に変える", {"motif": ["D4", "F4"], "repeat_count": 2}, expected_shape(["D4", "F4"] * 2, 1 / 3))
    elif task_id.startswith("conditions."):
        real_node(ast.If, "if文で条件を判定する")
        advanced = task_id.endswith("advanced")
        for steps in ([8, 3, 5] if advanced else [8, 6, 5]):
            notes, positions, velocities = [], [], []
            for i in range(steps):
                if advanced:
                    if i % 4 == 2:
                        continue
                    notes.append("G4" if i % 4 == 0 else "C4")
                    velocities.append(0.9 if i % 4 == 0 else 0.5)
                elif i % 2 == 0:
                    notes.append("C4")
                else:
                    continue
                positions.append(i * 0.5)
            expected = expected_shape(notes, 0.5, positions, steps * 0.5)
            transformed(f"{steps}ステップの音と休符の位置", {"steps": steps}, expected)
            if advanced and steps == 8:
                check("強い音と弱い音の区別", [event["velocity"] for event in note_events(song)], velocities,
                      "第3引数が音の強さです。G4は0.9、C4は0.5にします。")
    elif task_id == "functions.practice":
        named_function("scale_lengths")
        check("返り値を曲に使う", shape(song), expected_shape(["C4"] * 3, [1, 2, 1]))
        for args, expected in [(([1, 0.5], 2), [2, 1]), (([0.25, 1.5], 0.5), [0.125, 0.75]), (([], 3), [])]:
            attempt(f"scale_lengths{args}", lambda a=args, e=expected: pure_case("scale_lengths", a, e),
                    "全要素を処理した新しいリストをreturnし、元の入力は変更しないでください。")
    elif task_id == "functions.advanced":
        named_function("make_phrase")
        check("返り値の6音を演奏する", shape(song), expected_shape(["C4", "E4", "G4"] * 2, 0.5))
        for args, expected in [((["D4", "F4"], 3), ["D4", "F4"] * 3), ((["A4"], 1), ["A4"]), ((["C4"], 0), []), (([], 2), [])]:
            attempt(f"make_phrase{args}", lambda a=args, e=expected: pure_case("make_phrase", a, e),
                    "音列と回数の引数を使い、新しいリストを返してください。0回なら空リストです。")
    elif task_id == "random.practice":
        real_node(ast.For, "for文で音を選ぶ")
        events = note_events(song)
        candidates = namespace.get("candidates", [])
        check("候補から8音・0.5拍ずつ", {"音数": len(events), "候補内": all(len(e["notes"]) == 1 and e["notes"][0] in candidates for e in events),
              "長さ": [e["duration"] for e in events], "全体": song["length_beats"]},
              {"音数": 8, "候補内": True, "長さ": [0.5] * 8, "全体": 4})
        check("seedを1回設定し、choiceを8回呼ぶ", result["trace"], {"seeds": [7], "choices": 8},
              "random.seed(seed_number)をループの外へ、random.choiceをループの中へ置きます。")
        attempt("同じコードを再実行すると再現する", lambda: (shape(execute(source)["song"]), shape(song)),
                "乱数を使う前にseedを設定します。")
        transformed("候補をF4だけ、音数を4へ変える", {"candidates": ["F4"], "note_count": 4}, expected_shape(["F4"] * 4, 0.5))
    elif task_id == "random.advanced":
        named_function("generate_phrase")
        check("演奏部分は8音・4拍", [len(note_events(song)), song["length_beats"]], [8, 4])
        def random_case(seed_value, count):
            run = execute(source)
            expected_rng = random.Random(seed_value)
            expected = [expected_rng.choice(["C4", "D4", "E4", "G4"]) for _ in range(count)]
            with record_random() as trace, contextlib.redirect_stdout(LimitedOutput()), contextlib.redirect_stderr(LimitedOutput()):
                value = run["namespace"]["generate_phrase"](seed_value, count)
            return ({"返り値": value, "seed設定": trace["seeds"], "choice回数": trace["choices"]},
                    {"返り値": expected, "seed設定": [seed_value], "choice回数": count})
        for seed_value, count in [(7, 8), (19, 3), (7, 0), (7, 8)]:
            attempt(f"generate_phrase({seed_value}, {count})", lambda s=seed_value, n=count: random_case(s, n),
                    "関数内で引数のseedを1回設定し、count回のchoiceの結果をリストで返します。")
    elif task_id == "arrangement.practice":
        check("2つのトラックを作る", len(song["tracks"]), 2)
        check("旋律の4音", shape(song, "melody"), expected_shape(["C4", "E4", "G4", "C5"], 0.5))
        check("低音は0拍から2拍", shape(song, "bass"), expected_shape(["C3"], [2]))
        bass = next((track for track in song["tracks"] if track["name"] == "bass"), {})
        check("低音の音色", bass.get("instrument"), "bass")
    elif task_id == "arrangement.advanced":
        named_function("add_phrase")
        active = [track for track in song["tracks"] if track["events"]]
        check("音のあるトラックが2つ以上", len(active) >= 2, True)
        check("同じ関数を2か所以上で使う", sum(isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
              and node.func.id == "add_phrase" for node in ast.walk(tree)) >= 2, True,
              "旋律と低音でadd_phraseをそれぞれ呼び出してください。")
        for track in active:
            starts = [event["beat"] for event in track["events"]]
            ends = [event["beat"] + event["duration"] for event in track["events"]]
            check(f"{track['name']}: 0拍から8拍まで", [min(starts), max(ends), track.get("cursor")], [0, 8, 8],
                  "音列の要素数×1音の長さ×繰り返し回数を8にします。")
        def phrase_case(notes, beat, repeats):
            run = execute(source)
            run["music"].start_song()
            with contextlib.redirect_stdout(LimitedOutput()), contextlib.redirect_stderr(LimitedOutput()):
                run["namespace"]["add_phrase"](notes, beat, repeats)
            return shape(run["music"].export_song()), expected_shape(notes * repeats, beat)
        for notes, beat, repeats in [(["D4", "F4"], 0.25, 3), (["A3"], 1, 2), (["C4"], 0.5, 0)]:
            attempt(f"add_phrase({notes}, {beat}, {repeats})", lambda n=notes, b=beat, r=repeats: phrase_case(n, b, r),
                    "関数の中で、音列・長さ・回数の3つの引数を使ってください。")
    else:
        raise ValueError(f"未定義の確認問題: {task_id}")
    if not checks:
        raise ValueError("確認項目がありません")
    passed = all(item["passed"] for item in checks)
    return {"status": "passed" if passed else "needs-work", "passed": passed, "checks": checks,
            "comment": "今回の確認条件を満たしました。最後に、自分の言葉で仕組みを説明しましょう。" if passed else
                       "実行はできています。未達成の項目を1つ選び、期待値と実際の値を比べて直しましょう。"}


def run_submission(source, task_id=None):
    payload = {"ok": False, "stdout": "", "stderr": "", "song": None,
               "errorType": None, "error": None, "traceback": None, "assessment": None, "line": None}
    if not isinstance(source, str) or len(source) > 60000:
        payload.update(errorType="CodeSizeError", error="コードは60,000文字以内にしてください。")
        return payload
    try:
        tree = ast.parse(source, filename="student_code.py")
        if task_id is not None and task_id not in TASKS:
            payload.update(errorType="AssessmentError", error="問題IDを確認できません。ページを再読み込みしてください。",
                           assessment={"status": "check-error", "passed": False, "checks": []})
            return payload
        holes = [node.lineno for node in ast.walk(tree) if isinstance(node, ast.Constant) and node.value is Ellipsis]
        if task_id and holes:
            payload.update(errorType="IncompleteCode", error="未完成の ... が残っています。TODOの指示を読み、対応する式や処理に置き換えてください。",
                           line=min(holes), assessment={"status": "incomplete", "passed": False, "checks": [],
                                                      "comment": f"未完成の箇所: {', '.join(map(str, sorted(set(holes))))}行目"})
            return payload
        result = execute(source)
        payload.update(ok=True, stdout=result["stdout"], stderr=result["stderr"], song=result["song"])
        if task_id and task_id.endswith(".example"):
            payload["assessment"] = {"status": "example", "passed": False, "checks": [],
                                     "comment": "例題を実行しました。予想と結果を比べ、練習問題で自分のコードを確かめましょう。"}
        elif task_id:
            try:
                payload["assessment"] = grade(source, task_id, result)
            except BaseException as exc:
                payload["assessment"] = {"status": "check-error", "passed": False, "checks": [],
                                         "comment": "答え合わせ側で問題が起きました。学生の誤答とは区別し、この結果は合格として記録しません。",
                                         "detail": f"{type(exc).__name__}: {str(exc)[:500]}"}
    except BaseException as exc:
        payload.update(errorType=type(exc).__name__, error=str(exc)[:2000], traceback=traceback.format_exc()[-8000:])
        if isinstance(exc, SyntaxError):
            payload["line"] = exc.lineno
        else:
            student_frames = [frame for frame in traceback.extract_tb(exc.__traceback__) if frame.filename == "student_code.py"]
            if student_frames:
                payload["line"] = student_frames[-1].lineno
        if task_id:
            payload["assessment"] = {"status": "runtime-error", "passed": False, "checks": [],
                                     "comment": "まだ条件の確認には進めていません。まずPythonのエラーを直してください。"}
    return payload
