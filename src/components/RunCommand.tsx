import CopyButton from "./CopyButton";

export default function RunCommand({
  namespace,
  command,
  ready = true,
  title = "run this in-game",
  note,
}: {
  namespace: string;
  command: string;
  ready?: boolean;
  title?: string;
  note?: string;
}) {
  const main = `/function ${namespace}:${command}`;

  return (
    <div className="pixel-border overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-black/20 px-4 py-2.5">
        <span className="pixel-sq bg-[var(--gold)]" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {title}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider ${
            ready
              ? "bg-[var(--green)]/12 text-[var(--green)]"
              : "bg-[var(--gold)]/12 text-[var(--gold)]"
          }`}
        >
          {ready ? "ready" : "waiting for valid json"}
        </span>
      </div>

      <div className="p-4">
        <div className="code-surface flex flex-wrap items-center gap-3 p-4">
          <code className="break-all font-mono text-[15px] font-bold leading-relaxed sm:text-[18px]">
            <span className="text-[var(--text)]">/function </span>
            <span className="text-[var(--gold)]">{namespace}</span>
            <span className="text-[var(--muted)]">:</span>
            <span className="text-[var(--teal)]">{command}</span>
          </code>
          <span className="ml-auto">
            <CopyButton text={main} label="copy" variant="solid" />
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] text-[var(--muted)]">
          <span>
            <span className="text-[var(--gold)]">namespace</span> ← "namespace" field
          </span>
          <span>
            <span className="text-[var(--teal)]">command</span> ← "command" field
          </span>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          {note ??
            "Stand where the front-bottom-left corner should land, then run it. Use it anywhere, as many times as you like."}
        </p>
      </div>
    </div>
  );
}
