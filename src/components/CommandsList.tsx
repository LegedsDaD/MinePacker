import CopyButton from "./CopyButton";
import type { PackBuild } from "../lib/buildpack";

/**
 * Every build command contained in a (future) zip — one row per function,
 * plus the pack's helper commands.
 */
export default function CommandsList({
  namespace,
  builds,
  defaultBuild,
  highlight,
  title = "commands in this zip",
}: {
  namespace: string;
  builds: PackBuild[];
  defaultBuild?: string;
  highlight?: string;
  title?: string;
}) {
  return (
    <div className="pixel-border overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-black/20 px-4 py-2.5">
        <span className="pixel-sq bg-[var(--green)]" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {title}
        </span>
        <span className="ml-auto rounded-full bg-[var(--green)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--green)]">
          {builds.length} build{builds.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {builds.length === 0 && (
          <li className="px-4 py-3 font-mono text-[12px] text-[var(--muted)]">
            no builds yet — the first one will appear here
          </li>
        )}
        {builds.map((b) => {
          const cmd = `/function ${namespace}:${b.name}`;
          const hot = highlight === b.name;
          return (
            <li
              key={b.name}
              className={`flex flex-wrap items-center gap-2 px-4 py-2.5 ${
                hot ? "bg-[var(--green)]/[0.07]" : ""
              }`}
            >
              <code className="font-mono text-[12.5px] text-[var(--green)]">{cmd}</code>
              {b.name === defaultBuild && (
                <span className="rounded-full bg-[var(--gold)]/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--gold)]">
                  default
                </span>
              )}
              {hot && (
                <span className="rounded-full bg-[var(--green)]/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--green)]">
                  new
                </span>
              )}
              <span className="ml-auto font-mono text-[10.5px] text-[var(--muted)]">
                {b.blocks > 0 ? `${b.blocks} blocks · ${b.commands} cmds` : "in pack"}
              </span>
              <CopyButton text={cmd} />
            </li>
          );
        })}
        {[
          { cmd: `/function ${namespace}:list`, note: "lists every build" },
          { cmd: `/function ${namespace}:generate`, note: "runs the default build" },
          { cmd: `/function ${namespace}:info`, note: "pack stats" },
        ].map((r) => (
          <li key={r.cmd} className="flex flex-wrap items-center gap-2 px-4 py-2.5 opacity-80">
            <code className="font-mono text-[12px] text-[var(--teal)]">{r.cmd}</code>
            <span className="font-mono text-[10.5px] text-[var(--muted)]">{r.note}</span>
            <span className="ml-auto">
              <CopyButton text={r.cmd} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
