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
    const pattern = new RegExp(`^(\\s*)${name}\\s*=\\s*.*?(,?)(\\s*(?:#.*)?)$`);
    const index = lines.findIndex((line) => pattern.test(line) && !line.trimStart().startsWith("#"));
    if (index >= 0) {
      const match = lines[index].match(pattern);
      if (!match) continue;
      const [, indent, trailingComma, comment] = match;
      lines[index] = `${indent}${name} = ${formatted}${trailingComma}${comment}`;
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
    return { code: lines.join("\n"), line: index + 1 };
  }
  return null;
}
