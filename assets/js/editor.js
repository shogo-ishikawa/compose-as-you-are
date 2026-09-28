export class CodeEditor {
  constructor(textarea, { onChange = () => {}, onRunShortcut = () => {} } = {}) {
    this.textarea = textarea;
    this.onChange = onChange;
    this.onRunShortcut = onRunShortcut;
    this.errorLine = null;
    this.changedLine = null;
    this.changedTimer = null;

    if (window.CodeMirror) {
      this.cm = window.CodeMirror.fromTextArea(textarea, {
        mode: "python",
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        lineWrapping: false,
        viewportMargin: Infinity,
        extraKeys: {
          Tab(cm) {
            if (cm.somethingSelected()) {
              cm.indentSelection("add");
            } else {
              cm.replaceSelection("    ", "end");
            }
          },
          "Shift-Tab": "indentLess",
          "Ctrl-Enter": () => this.onRunShortcut(),
          "Cmd-Enter": () => this.onRunShortcut(),
        },
      });
      this.cm.on("change", (_instance, change) => {
        if (change.origin !== "setValue") {
          this.onChange(this.getValue());
        }
      });
    } else {
      this.cm = null;
      textarea.addEventListener("input", () => this.onChange(this.getValue()));
      textarea.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          this.onRunShortcut();
        }
        if (event.key === "Tab") {
          event.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.setRangeText("    ", start, end, "end");
          this.onChange(this.getValue());
        }
      });
    }
  }

  getValue() {
    return this.cm ? this.cm.getValue() : this.textarea.value;
  }

  setValue(value, { preserveCursor = false } = {}) {
    if (this.cm) {
      const cursor = preserveCursor ? this.cm.getCursor() : { line: 0, ch: 0 };
      this.cm.setValue(value);
      if (preserveCursor) {
        this.cm.setCursor(cursor);
      }
      this.cm.clearHistory();
      this.cm.refresh();
    } else {
      const start = preserveCursor ? this.textarea.selectionStart : 0;
      this.textarea.value = value;
      if (preserveCursor) {
        this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(start, value.length);
      }
    }
  }

  focus() {
    if (this.cm) {
      this.cm.focus();
    } else {
      this.textarea.focus();
    }
  }

  clearErrorLine() {
    if (this.cm && this.errorLine !== null) {
      this.cm.removeLineClass(this.errorLine, "background", "error-line");
    }
    this.errorLine = null;
  }

  highlightErrorLine(lineNumber) {
    this.clearErrorLine();
    const zeroBased = Number(lineNumber) - 1;
    if (!Number.isInteger(zeroBased) || zeroBased < 0) {
      return;
    }
    if (this.cm) {
      const maxLine = this.cm.lineCount() - 1;
      this.errorLine = Math.min(zeroBased, maxLine);
      this.cm.addLineClass(this.errorLine, "background", "error-line");
      this.cm.scrollIntoView({ line: this.errorLine, ch: 0 }, 80);
      this.cm.setCursor({ line: this.errorLine, ch: 0 });
    } else {
      const lines = this.textarea.value.split("\n");
      let start = 0;
      for (let i = 0; i < Math.min(zeroBased, lines.length); i += 1) {
        start += lines[i].length + 1;
      }
      const end = start + (lines[zeroBased]?.length ?? 0);
      this.textarea.focus();
      this.textarea.setSelectionRange(start, end);
    }
  }

  highlightChangedLine(lineNumber) {
    const zeroBased = Number(lineNumber) - 1;
    if (!this.cm || !Number.isInteger(zeroBased) || zeroBased < 0) {
      return;
    }
    if (this.changedLine !== null) {
      this.cm.removeLineClass(this.changedLine, "background", "changed-line");
    }
    if (this.changedTimer) {
      window.clearTimeout(this.changedTimer);
    }
    this.changedLine = Math.min(zeroBased, this.cm.lineCount() - 1);
    this.cm.addLineClass(this.changedLine, "background", "changed-line");
    this.cm.scrollIntoView({ line: this.changedLine, ch: 0 }, 60);
    this.changedTimer = window.setTimeout(() => {
      if (this.changedLine !== null) {
        this.cm.removeLineClass(this.changedLine, "background", "changed-line");
      }
      this.changedLine = null;
    }, 1400);
  }

  replaceCode(value, changedLine = null) {
    if (this.cm) {
      const cursor = this.cm.getCursor();
      // replaceRange is one undoable edit; setValue would discard the student's Undo history.
      this.cm.replaceRange(value, { line: 0, ch: 0 }, { line: this.cm.lineCount(), ch: 0 }, "+setting");
      this.cm.setCursor(cursor);
    } else {
      this.textarea.value = value;
    }
    this.onChange(value);
    if (changedLine) {
      this.highlightChangedLine(changedLine);
    }
  }
}
