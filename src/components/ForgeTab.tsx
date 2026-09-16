import { useMemo, useState } from "react";
import {
  blockPalette,
  compressBlocks,
  downloadBlob,
  expandBuilding,
  footprint,
  forgeZip,
  buildFunctionText,
  parseBuilding,
  sampleJson,
  sanitizeId,
  type ForgeResult,
} from "../lib/buildpack";
import RunCommand from "./RunCommand";
import FunctionCode from "./FunctionCode";

type Status = { kind: "ok" | "err"; text: string; url?: string; file?: string } | null;

export default function ForgeTab({ onNeedTemplate }: { onNeedTemplate?: () => void }) {
  const [raw, setRaw] = useState(sampleJson);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const parsed = useMemo(() => {
    try {
      const building = parseBuilding(raw);
      const blocks = expandBuilding(building);
      const ops = compressBlocks(blocks);
      return { ok: true as const, building, blocks, ops };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [raw]);

  const ns = parsed.ok ? sanitizeId(parsed.building.namespace!, "ubuilder") : "ubuilder";
  const cmd = parsed.ok ? sanitizeId(parsed.building.command!) : "your_build";
  const dims = parsed.ok ? footprint(parsed.blocks) : null;
  const palette = parsed.ok ? blockPalette(parsed.blocks).slice(0, 8) : [];

  const onFile = async (f: File) => {
    setRaw(await f.text());
    setStatus(null);
  };

  const convert = async () => {
    if (!parsed.ok) {
      setStatus({ kind: "err", text: "fix the JSON first — " + parsed.error });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res: ForgeResult = await forgeZip(parsed.building);
      const url = downloadBlob(res.blob, res.fileName);
      setStatus({
        kind: "ok",
        text: `${res.fileName} — ${res.blocks} blocks → ${res.commands} commands. Put it in your world's datapacks folder, run /reload, then run the command.`,
        url,
        file: res.fileName,
      });
    } catch (e) {
      setStatus({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const functionCode = parsed.ok
    ? buildFunctionText(cmd, ns, parsed.blocks.length, parsed.ops)
    : "";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* editor */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="pixel-border overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-black/20 px-4 py-3">
            <span className="pixel-sq bg-[var(--green)]" />
            <span className="font-mono text-[12px] font-semibold text-[var(--text)]">building.json</span>
            <span className="font-mono text-[10.5px] text-[var(--muted)]">
              {raw.split("\n").length} lines
            </span>
            <label className="btn-pixel ml-auto cursor-pointer rounded-lg border border-[var(--line)] bg-[#161e13] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[#9fce82] hover:bg-[#1b2716]">
              ↑ upload .json
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setStatus(null);
            }}
            spellCheck={false}
            className={`h-[440px] w-full resize-none bg-transparent p-4 font-mono text-[12.5px] leading-[1.6] text-[#c3d0b5] outline-none placeholder:text-[#48583c] ${
              parsed.ok ? "" : "bg-[var(--red)]/[0.04]"
            }`}
            placeholder="paste a building json that follows the template…"
          />
          <div
            className={`flex flex-wrap items-center gap-3 border-t px-4 py-2.5 font-mono text-[11.5px] ${
              parsed.ok
                ? "border-[var(--line)] bg-black/20 text-[var(--green)]"
                : "border-[var(--red)]/30 bg-[var(--red)]/[0.06] text-[var(--red)]"
            }`}
          >
            <span>
              {parsed.ok
                ? `✓ valid — ${parsed.blocks.length} blocks compress to ${parsed.ops.length} commands`
                : `✗ ${parsed.error}`}
            </span>
            {!parsed.ok && onNeedTemplate && (
              <button
                onClick={onNeedTemplate}
                className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--gold)] hover:underline"
              >
                open template →
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={convert}
            disabled={busy}
            className="btn-pixel rounded-xl bg-[var(--gold)] px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-[#231a04] hover:brightness-105"
          >
            {busy ? "converting…" : "convert → .minepacker.zip ↓"}
          </button>
          <p className="max-w-[300px] font-mono text-[11px] leading-relaxed text-[var(--muted)]">
            runs fully in your browser — nothing is uploaded.
          </p>
        </div>

        {status && (
          <div
            className={`pixel-border px-4 py-3 font-mono text-[12px] leading-relaxed ${
              status.kind === "ok"
              ? "border-[var(--green)]/30 bg-[var(--green)]/[0.06] text-[var(--green)]"
              : "border-[var(--red)]/30 bg-[var(--red)]/[0.06] text-[var(--red)]"
            }`}
          >
            <span>{status.kind === "ok" ? "✓ " : "✗ "}</span>
            {status.text}
            {status.kind === "ok" && status.url && (
              <div className="mt-1.5">
                <a
                  href={status.url}
                  download={status.file}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--gold)] underline decoration-dotted underline-offset-2"
                >
                  download {status.file} manually
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* right column */}
      <div className="flex min-w-0 flex-col gap-4">
        <RunCommand namespace={ns} command={cmd} ready={parsed.ok} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="target" value="MC 26.2" />
          <Stat label="blocks" value={parsed.ok ? String(parsed.blocks.length) : "—"} />
          <Stat label="commands" value={parsed.ok ? String(parsed.ops.length) : "—"} />
          <Stat label="footprint" value={dims ? `${dims.w}×${dims.h}×${dims.d}` : "—"} />
        </div>

        {parsed.ok && palette.length > 0 && (
          <div className="pixel-border p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              blocks used
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {palette.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full border border-[var(--line)] bg-black/25 px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]"
                >
                  <span className="text-[#c3d0b5]">{p.id.replace("minecraft:", "")}</span> ×{p.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {parsed.ok && <FunctionCode code={functionCode} namespace={ns} command={cmd} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-border px-3.5 py-3">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-mono text-[15px] font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}
