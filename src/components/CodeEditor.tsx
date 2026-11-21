"use client";
// The code editor used across the Lab: CodeMirror with Python support, completion
// (keywords, built-ins, local names, live names from the Python session, snippets),
// syntax checking as you type and the line of a runtime error underlined in red.
import { useEffect, useRef } from "react";
import { EditorState, Compartment, Prec } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection,
  dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, placeholder as placeholderExt,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python, pythonLanguage } from "@codemirror/lang-python";
import { sql, SQLite } from "@codemirror/lang-sql";
import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, snippetCompletion,
  type CompletionContext, type CompletionResult,
} from "@codemirror/autocomplete";
import { linter, lintGutter, forceLinting, type Diagnostic } from "@codemirror/lint";
import { bracketMatching, indentOnInput, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { classHighlighter } from "@lezer/highlight";
import type { Runner } from "../workers/runner";
import { nativeCompletions, rustLanguage, shellLanguage } from "../lib/nativeLanguages";

export type RuntimeError = { line: number; message: string } | null;
type Props = {
  value: string;
  onChange: (s: string) => void;
  onRun: () => void;
  runner?: { current: Runner | null };
  error?: RuntimeError;
  label?: string;
  placeholder?: string;
  fill?: boolean; // grow to fill the parent (playground) instead of fitting the code
  onCursor?: (line: number, col: number) => void;
  onProblems?: (count: number) => void;
  language?: "python" | "sql" | "rust" | "git" | "linux" | "c";
};

const SNIPPETS = [
  snippetCompletion("def ${name}(${params}):\n\t${pass}", { label: "def", detail: "function", type: "keyword" }),
  snippetCompletion("for ${item} in ${items}:\n\t${pass}", { label: "for", detail: "loop", type: "keyword" }),
  snippetCompletion("while ${condition}:\n\t${pass}", { label: "while", detail: "loop", type: "keyword" }),
  snippetCompletion("if ${condition}:\n\t${pass}", { label: "if", detail: "block", type: "keyword" }),
  snippetCompletion("class ${Name}:\n\tdef __init__(self${, args}):\n\t\t${pass}", { label: "class", detail: "class", type: "keyword" }),
  snippetCompletion("try:\n\t${pass}\nexcept ${Exception} as error:\n\t${print(error)}", { label: "try", detail: "try / except", type: "keyword" }),
  snippetCompletion("with open(${path}) as ${file}:\n\t${pass}", { label: "with", detail: "open a file", type: "keyword" }),
  snippetCompletion('print(f"${}")', { label: "printf", detail: "print an f-string", type: "function" }),
];

const LITERAL: [RegExp, string][] = [
  [/^[rbuf]*["']/i, "str"],
  [/^\[/, "list"],
  [/^\{\s*\}|^\{[^:]*:/, "dict"],
  [/^\{/, "set"],
  [/^\(/, "tuple"],
  [/^-?\d+\.\d*/, "float"],
  [/^-?\d+/, "int"],
  [/^(str|list|dict|set|tuple|int|float)\(/, "$1"],
];
function guessType(doc: string, name: string): string | null {
  if (!/^[A-Za-z_]\w*$/.test(name)) return null;
  const found = [...doc.matchAll(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, "gm"))].pop();
  if (!found) return null;
  for (const [re, kind] of LITERAL) {
    const m = found[1].match(re);
    if (m) return kind === "$1" ? m[1] : kind;
  }
  return null;
}

export function CodeEditor({ value, onChange, onRun, runner, error = null, label, placeholder, fill, onCursor, onProblems, language = "python" }: Props) {
  const isSql = language === "sql";
  const isPython = language === "python";
  label ??= { python: "Python code", sql: "SQL code", rust: "Rust code", git: "Git commands", linux: "Linux commands", c: "C17 source" }[language];
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({ onChange, onRun, onCursor, onProblems, error, runner });
  latest.current = { onChange, onRun, onCursor, onProblems, error, runner };
  const a11y = useRef(new Compartment());

  useEffect(() => {
    // Live names from the running session: attributes after a dot, variables otherwise.
    async function sessionNames(context: CompletionContext): Promise<CompletionResult | null> {
      const word = context.matchBefore(/[A-Za-z_][\w.]*$/);
      const r = latest.current.runner?.current;
      if (!word || !r?.isReady) return null;
      const dot = word.text.lastIndexOf(".");
      if (dot < 0 && !context.explicit && word.text.length < 2) return null;
      let names = await r.complete(word.text);
      // Not run yet? Guess the type from how the name was assigned, e.g. word = "ladder".
      if (!names.length && dot > 0) {
        const base = word.text.slice(0, dot);
        const kind = guessType(context.state.doc.toString(), base);
        if (kind) names = await r.complete(kind + "." + word.text.slice(dot + 1));
      }
      if (!names.length) return null;
      return {
        from: dot < 0 ? word.from : word.from + dot + 1,
        options: names.map((n) => ({ label: n, type: dot < 0 ? "variable" : "property", boost: dot < 0 ? -1 : 0 })),
        validFor: /^\w*$/,
      };
    }
    function snippets(context: CompletionContext): CompletionResult | null {
      const word = context.matchBefore(/\w+$/);
      if (!word || (word.from === word.to && !context.explicit)) return null;
      const line = context.state.doc.lineAt(context.pos);
      if (line.text.slice(0, word.from - line.from).trim()) return null; // only at the start of a line
      return { from: word.from, options: SNIPPETS, validFor: /^\w*$/ };
    }
    const check = linter(
      async (v): Promise<Diagnostic[]> => {
        const doc = v.state.doc;
        const out: Diagnostic[] = [];
        const err = latest.current.error;
        if (err && err.line >= 1 && err.line <= doc.lines) {
          const line = doc.line(err.line);
          out.push({ from: line.from, to: Math.max(line.to, line.from + 1), severity: "error", message: err.message, source: language === "rust" ? "Rust" : "Python" });
        }
        const r = latest.current.runner?.current;
        if (isPython && r?.isReady) {
          for (const p of await r.lint(v.state.doc.toString())) {
            if (p.line > doc.lines) continue;
            const line = doc.line(p.line);
            const from = Math.min(line.from + Math.max(0, p.col - 1), line.to);
            out.push({ from, to: Math.min(Math.max(from + 1, line.to), doc.length), severity: "error", message: p.message, source: "Python" });
          }
        }
        latest.current.onProblems?.(out.length);
        return out;
      },
      { delay: 500 },
    );
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        indentUnit.of(isSql ? "  " : "    "),
        EditorState.tabSize.of(isSql ? 2 : 4),
        // Native Rust and Git use the same colored editor and keyboard shortcuts.
        isSql ? sql({ dialect: SQLite, upperCaseKeywords: true })
          : language === "rust" ? rustLanguage
          : language === "git" || language === "linux" ? shellLanguage
          : language === "c" ? []
          : [python(), pythonLanguage.data.of({ autocomplete: sessionNames }), pythonLanguage.data.of({ autocomplete: snippets })],
        autocompletion({ activateOnTyping: true, icons: true, closeOnBlur: true,
          ...(language === "rust" || language === "git" || language === "linux" ? { override: [nativeCompletions(language)] } : {}) }),
        syntaxHighlighting(classHighlighter),
        isPython || language === "rust" ? [check, lintGutter()] : [],
        placeholder ? placeholderExt(placeholder) : [],
        Prec.highest(
          keymap.of([
            { key: "Shift-Enter", run: () => (latest.current.onRun(), true) },
            { key: "Mod-Enter", run: () => (latest.current.onRun(), true) },
          ]),
        ),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
        a11y.current.of(EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false", autocorrect: "off", autocapitalize: "off" })),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) latest.current.onChange(u.state.doc.toString());
          if (u.selectionSet || u.docChanged) {
            const head = u.state.selection.main.head;
            const line = u.state.doc.lineAt(head);
            latest.current.onCursor?.(line.number, head - line.from + 1);
          }
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current! });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // The editor is created once; later prop changes are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside changes (reset, a starter snippet, restored code) replace the document.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  // A new runtime error is shown at once rather than after the next keystroke.
  useEffect(() => {
    if ((isPython || language === "rust") && view.current) forceLinting(view.current);
  }, [error]);

  return <div ref={host} className={"editor" + (fill ? " fill" : "")} />;
}
