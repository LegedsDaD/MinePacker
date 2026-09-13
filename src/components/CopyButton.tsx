import { useState, type ReactNode } from "react";

export default function CopyButton({
  text,
  label = "copy",
  doneLabel = "copied ✓",
  variant = "ghost",
  className = "",
  children,
}: {
  text: string;
  label?: string;
  doneLabel?: string;
  variant?: "ghost" | "solid";
  className?: string;
  children?: ReactNode;
}) {
  const [done, setDone] = useState(false);
  const palette =
    variant === "solid"
      ? "border-transparent bg-[var(--green)] px-3 py-1.5 text-[10px] font-bold uppercase text-[#0c130a] hover:brightness-110"
      : "border-[var(--line)] bg-[#161e13] px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-[#9fce82] hover:border-[var(--line-strong)] hover:bg-[#1b2716]";

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={`btn-pixel rounded-lg border font-mono ${palette} ${className}`}
    >
      {children ?? (done ? doneLabel : label)}
    </button>
  );
}
