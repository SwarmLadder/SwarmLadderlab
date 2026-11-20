// Small, dependency-free CodeMirror stream grammars for Rust and Git/Bash.
// This supplies actual syntax-token classes in the same editor as Python and SQL.
// It is editor highlighting, not a compiler, shell, or Git validator.
import { StreamLanguage, type StreamParser, type StringStream } from "@codemirror/language";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

type RustState = { blockDepth: number };
const rustKeywords = new Set(
  "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while yield".split(" "),
);
const rustTypes = new Set(
  "bool char str String Vec Option Result Some None Ok Err Box HashMap BTreeMap HashSet Arc Rc Cell RefCell Mutex AtomicUsize usize isize u8 u16 u32 u64 u128 i8 i16 i32 i64 i128 f32 f64".split(" "),
);
const rustMacros = new Set("println print eprintln eprint format vec assert assert_eq assert_ne debug_assert todo unimplemented panic matches".split(" "));

function nestedComment(stream: StringStream, state: RustState): string {
  while (!stream.eol()) {
    if (stream.match("/*")) state.blockDepth++;
    else if (stream.match("*/")) {
      state.blockDepth--;
      if (state.blockDepth === 0) break;
    } else stream.next();
  }
  return "comment";
}
const rustStream: StreamParser<RustState> = {
  startState: () => ({ blockDepth: 0 }),
  token(stream, state) {
    if (state.blockDepth) return nestedComment(stream, state);
    if (stream.eatSpace()) return null;
    if (stream.match("//")) { stream.skipToEnd(); return "comment"; }
    if (stream.match("/*")) { state.blockDepth = 1; return nestedComment(stream, state); }
    if (stream.match(/^r(#+)?"[\s\S]*?"/)) return "string";
    if (stream.match(/^"(?:\\.|[^"\\])*"/)) return "string";
    if (stream.match(/^"/)) { stream.skipToEnd(); return "string"; }
    if (stream.match(/^'(?:\\.|[^'\\])'/)) return "string";
    if (stream.match(/^'[A-Za-z_]\w*/)) return "meta";
    if (stream.match(/^(?:0x[\da-fA-F_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?)(?:[a-z]\w*)?/)) return "number";
    if (stream.match(/^#\s*\[/)) return "meta";
    if (stream.match(/^[A-Za-z_][A-Za-z_0-9]*/)) {
      const word = stream.current();
      if (rustKeywords.has(word)) return "keyword";
      if (rustTypes.has(word) || /^[A-Z]/.test(word)) return "typeName";
      if (stream.peek() === "!" && rustMacros.has(word)) return "def";
      if (stream.peek() === "(") return "def";
      return "variableName";
    }
    if (stream.match(/^(?:->|=>|::|&&|\|\||==|!=|<=|>=|[+\-*/%&|^!<>=?]+)/)) return "operator";
    stream.next();
    return "punctuation";
  },
};

type ShellState = { quote: "" | "'" | '"' };
const bashKeywords = new Set("if then else elif fi for do done while case esac in function export local readonly set unset source return exit".split(" "));
const shellCommands = new Set("git echo printf cat ls cd pwd mkdir touch write help clear python cargo rustc".split(" "));
const shellStream: StreamParser<ShellState> = {
  startState: () => ({ quote: "" }),
  token(stream, state) {
    if (state.quote) {
      const quote = state.quote;
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (escaped) { escaped = false; continue; }
        if (ch === "\\" && quote === '"') { escaped = true; continue; }
        if (ch === quote) { state.quote = ""; break; }
      }
      return "string";
    }
    if (stream.eatSpace()) return null;
    if (stream.match("#")) { stream.skipToEnd(); return "comment"; }
    if (stream.match(/^\$\{?[A-Za-z_]\w*\}?/)) return "meta";
    if (stream.match(/^"(?:\\.|[^"\\])*"/) || stream.match(/^'(?:[^']*)'/)) return "string";
    if (stream.peek() === "'" || stream.peek() === '"') {
      state.quote = stream.next() as ShellState["quote"];
      return shellStream.token(stream, state);
    }
    if (stream.match(/^--?[a-zA-Z][\w-]*/)) return "meta";
    if (stream.match(/^\d+/)) return "number";
    if (stream.match(/^[A-Za-z_][\w.-]*/)) {
      const word = stream.current();
      if (bashKeywords.has(word)) return "keyword";
      if (shellCommands.has(word)) return "def";
      return "variableName";
    }
    if (stream.match(/^(?:&&|\|\||>>|<<|[=|&;<>])/)) return "operator";
    stream.next();
    return "punctuation";
  },
};
export const rustLanguage = StreamLanguage.define(rustStream);
export const shellLanguage = StreamLanguage.define(shellStream);

const rustSuggestions = [
  "fn", "let", "mut", "pub", "struct", "enum", "impl", "trait", "match", "if", "else",
  "for", "while", "loop", "return", "Some", "None", "Ok", "Err", "Result", "Option",
  "String", "Vec", "println!", "format!", "assert_eq!", "todo!", "use", "mod",
];
const gitSuggestions = [
  "git status", "git init", "git add", "git commit -m", "git log", "git branch",
  "git switch", "git switch -c", "git diff", "git restore", "git restore --staged",
  "git show", "git help", "cat", "ls", "write", "help",
];
export function nativeCompletions(kind: "rust" | "git") {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(kind === "rust" ? /[\w!]+$/ : /[\w-]+$/);
    if (!match || (!match.text && !context.explicit)) return null;
    const suggestions = kind === "rust" ? rustSuggestions : gitSuggestions;
    const options = suggestions
      .filter((s) => s.toLowerCase().includes(match.text.toLowerCase()))
      .map((label) => ({ label, type: kind === "rust" ? "keyword" : "text" }));
    return options.length ? { from: match.from, options, validFor: /^[\w!-]*$/ } : null;
  };
}
