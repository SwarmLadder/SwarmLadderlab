import { useLayoutEffect, useRef } from "react";
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
  useLayoutEffect(() => {
    const e = ref.current!;
    e.style.height = "auto";
    e.style.height = e.scrollHeight + 4 + "px";
  }, [value]);
  return (
    <textarea
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
  );
}
