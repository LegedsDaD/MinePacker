import { useState } from "react";
import CopyButton from "./CopyButton";
import DownloadButton from "./DownloadButton";

export default function FunctionCode({
  code,
  namespace,
  command,
}: {
  code: string;
  namespace: string;
  command: string;
}) {
  const [open, setOpen] = useState(false);
  const fileName = `${command}.mcfunction`;

  return (
    <div className="pixel-border overflow-hidden">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/20"
        aria-expanded={open}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`shrink-0 text-[var(--teal)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4.5 6 8l4-3.5" />
        </svg>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text)]">
          full mcfunction code
        </span>
        <span className="hidden truncate font-mono text-[10px] text-[var(--muted)] sm:inline">
          data/{namespace}/function/{fileName}
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-[var(--muted)]">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--line)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-black/20 px-4 py-2.5">
            <code className="font-mono text-[10.5px] text-[var(--muted)]">
              data/{namespace}/function/{fileName}
            </code>
            <div className="ml-auto flex flex-wrap gap-2">
              <CopyButton text={code} label="copy all" />
              <DownloadButton
                content={code}
                fileName={fileName}
                mime="text/plain"
                label="download .mcfunction"
                variant="green"
              />
            </div>
          </div>
          <pre className="max-h-[520px] overflow-auto bg-[#090d08] p-4 font-mono text-[11.5px] leading-[1.65] text-[#aebda0]">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}