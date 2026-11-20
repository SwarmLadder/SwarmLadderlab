import { useLayoutEffect, useMemo, useRef } from "react";
import { highlightPython } from "../lib/pythonSyntax";
export function CodeEditor({
  value,
  onChange,
  onRun,
}: {
  value: string;
  onChange: (s: string) => void;
  onRun: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLPreElement>(null);
  const highlighted = useMemo(() => highlightPython(value + "\n"), [value]);
  function syncScroll() {
    if (!ref.current || !mirror.current) return;
    mirror.current.scrollTop = ref.current.scrollTop;
    mirror.current.scrollLeft = ref.current.scrollLeft;
  }
  useLayoutEffect(() => {
    const e = ref.current!;
    e.style.height = "auto";
    e.style.height = e.scrollHeight + 4 + "px";
    syncScroll();
  }, [value]);
  return (
    <div className="editor">
      <pre
        className="syntax-layer"
        ref={mirror}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <textarea
        onScroll={syncScroll}
        ref={ref}
        aria-label="Python code"
        spellCheck={false}
        wrap="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onRun();
          }
          if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            const el = e.currentTarget;
            el.setRangeText("    ", el.selectionStart, el.selectionEnd, "end");
            onChange(el.value);
          }
        }}
      />
    </div>
  );
}
