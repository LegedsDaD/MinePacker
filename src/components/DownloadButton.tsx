import { useState } from "react";
import { downloadBlob } from "../lib/buildpack";

export default function DownloadButton({
  content,
  fileName,
  mime = "application/octet-stream",
  label,
  variant = "gold",
  className = "",
}: {
  content: string;
  fileName: string;
  mime?: string;
  label: string;
  variant?: "gold" | "green" | "ghost";
  className?: string;
}) {
  const [fallback, setFallback] = useState<string | null>(null);

  const palette =
    variant === "gold"
      ? "bg-[var(--gold)] text-[#231a04] hover:brightness-105"
      : variant === "green"
      ? "bg-[var(--green)] text-[#0c130a] hover:brightness-105"
      : "bg-[#161e13] text-[#9fce82] border border-[var(--line)] hover:bg-[#1b2716]";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        onClick={() => setFallback(downloadBlob(new Blob([content], { type: mime }), fileName))}
        className={`btn-pixel px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${palette} ${className}`}
      >
        ↓ {label}
      </button>
      {fallback && (
        <a
          href={fallback}
          download={fileName}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10.5px] text-[var(--muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--green)]"
        >
          didn’t start? save manually
        </a>
      )}
    </span>
  );
}
