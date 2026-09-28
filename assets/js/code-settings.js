/**
 * テンポや音色を、教材コードの対応する行へ反映します。
 *
 * 変数への代入だけでなく、start_song(...) 内のキーワード引数も対象にします。
 * キーワード引数の末尾にあるカンマや行末コメントは保持します。
 */
export function replaceSetting(code, setting, value) {
  const lines = String(code).split("\n");
  const assignmentNames = setting === "instrument" ? ["sound", "instrument"] : ["tempo"];
  const formatted = setting === "instrument" ? `"${value}"` : String(value);

  for (const name of assignmentNames) {
    // Only a top-level literal assignment is safe. Do not replace calculations, TODOs,
    // function arguments, strings/comments, or similarly named local variables.
    const literal = setting === "instrument" ? `(["'])[^"']*\\1` : `[-+]?\\d+(?:\\.\\d+)?`;
    const pattern = new RegExp(`^${name}\\s*=\\s*${literal}(,?)(\\s*(?:#.*)?)$`);
    const index = lines.findIndex(line => pattern.test(line));
    if (index >= 0) {
      const match = lines[index].match(pattern);
      if (!match) continue;
      const trailingComma = match[setting === "instrument" ? 2 : 1];
      const comment = match[setting === "instrument" ? 3 : 2];
      const quote = setting === "instrument" ? match[1] : null;
      lines[index] = `${name} = ${quote ? `${quote}${value}${quote}` : formatted}${trailingComma}${comment}`;
      return { code: lines.join("\n"), line: index + 1 };
    }
  }

  // 1行の中に書かれた start_song(tempo=96, ...) などにも対応します。
  const argumentPattern =
    setting === "instrument"
      ? /(instrument\s*=\s*)["'][^"']+["']/
      : /(tempo\s*=\s*)\d+(?:\.\d+)?/;
  const index = lines.findIndex((line) => argumentPattern.test(line) && !line.trimStart().startsWith("#"));
  if (index >= 0) {
    lines[index] = lines[index].replace(argumentPattern, (_whole, prefix) => `${prefix}${formatted}`);
    lines[index] = lines[index].replace(/^(\s*)(tempo|instrument)\s*=\s*/, "$1$2 = ");
    return { code: lines.join("\n"), line: index + 1 };
  }
  // The curriculum also uses start_song(96, "bell", ...). Only literal positional
  // arguments are changed; variable references and calculations remain untouched.
  const positionalPattern = setting === "tempo"
    ? /(start_song\(\s*)\d+(?:\.\d+)?(?=\s*,)/
    : /(start_song\(\s*\d+(?:\.\d+)?\s*,\s*)(["'])[^"']*\2/;
  const positionalIndex = lines.findIndex(line => positionalPattern.test(line) && !line.trimStart().startsWith("#"));
  if (positionalIndex >= 0) {
    lines[positionalIndex] = lines[positionalIndex].replace(positionalPattern,
      setting === "tempo" ? `$1${formatted}` : (_whole, prefix, quote) => `${prefix}${quote}${value}${quote}`);
    return { code: lines.join("\n"), line: positionalIndex + 1 };
  }
  return null;
}
