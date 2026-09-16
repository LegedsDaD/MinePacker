import { useMemo, useRef, useState } from "react";
import {
  buildFunctionText,
  compressBlocks,
  downloadBlob,
  expandBuilding,
  mergeIntoPack,
  parseBuilding,
  readPack,
  sampleTowerJson,
  sanitizeId,
  stripPackExt,
  type LoadedPack,
  type PackBuild,
} from "../lib/buildpack";
import RunCommand from "./RunCommand";
import CommandsList from "./CommandsList";
import FunctionCode from "./FunctionCode";

type Status = { kind: "ok" | "err"; text: string; url?: string; file?: string } | null;

export default function MergeTab({ onNeedTemplate }: { onNeedTemplate?: () => void }) {
  const [packFile, setPackFile] = useState<File | null>(null);
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const [packErr, setPackErr] = useState<string | null>(null);
  const [raw, setRaw] = useState(sampleTowerJson);
  const [makeDefault, setMakeDefault] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [optsOpen, setOptsOpen] = useState(false);
  const zipInput = useRef<HTMLInputElement>(null);

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

  const cmd = parsed.ok ? sanitizeId(parsed.building.command!) : "your_build";
  const ns = pack
    ? pack.namespace
    : parsed.ok
    ? sanitizeId(parsed.building.namespace!, "ubuilder")
    : "ubuilder";
  const nsMismatch =
    pack && parsed.ok && sanitizeId(parsed.building.namespace!, "ubuilder") !== pack.namespace;
  const conflict = pack?.builds.some((b) => b.name === cmd) ?? false;
  const functionCode = parsed.ok
    ? buildFunctionText(cmd, ns, parsed.blocks.length, parsed.ops)
    : "";

  // what the NEW zip will contain
  const previewBuilds: PackBuild[] = useMemo(() => {
    const added: PackBuild | null = parsed.ok
      ? { name: cmd, blocks: parsed.blocks.length, commands: parsed.ops.length }
      : null;
    const base = (pack?.builds ?? []).filter((b) => b.name !== cmd);
    return added ? [...base, added] : base;
  }, [pack, parsed, cmd]);

  const loadZip = async (file: File) => {
    setPackErr(null);
    setStatus(null);
    setPackFile(file);
    try {
      const p = await readPack(file, stripPackExt(file.name) || "merged_pack");
      setPack(p);
      setHighlight(null);
    } catch (e) {
      setPack(null);
      setPackErr((e as Error).message);
    }
  };

  const merge = async () => {
    if (!pack || !packFile) {
      setStatus({ kind: "err", text: "load a .minepacker.zip first" });
      return;
    }
    if (!parsed.ok) {
      setStatus({ kind: "err", text: "fix the JSON first — " + parsed.error });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      // re-read the original file so repeated merges always start clean
      const fresh = await readPack(packFile, pack.packName);
      const res = await mergeIntoPack(fresh, parsed.building, {
        command: cmd,
        makeDefault,
        overwrite,
        packName: pack.packName,
      });
      const url = downloadBlob(res.blob, res.fileName);
      // stack future merges on top of the just-created zip
      const newFile = new File([res.blob], res.fileName, { type: "application/zip" });
      setPackFile(newFile);
      setPack({ ...fresh, builds: res.builds, default: res.default });
      setHighlight(res.command);
      setStatus({
        kind: "ok",
        text: `${res.replaced ? "replaced" : "added"} "${res.command}" — ${res.fileName} downloaded. The pack now holds ${
          res.builds.length
        } build${res.builds.length === 1 ? "" : "s"}, each with its own command.`,
        url,
        file: res.fileName,
      });
    } catch (e) {
      setStatus({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* -------------------------------------------- step 1: zip ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) loadZip(f);
            }}
            className={`pixel-border flex flex-col items-center justify-center gap-2.5 px-6 py-10 text-center transition-colors ${
              drag ? "border-[var(--green)] bg-[var(--green)]/[0.06]" : ""
            }`}
          >
            <span className="text-[26px] leading-none opacity-80">⬒</span>
            <div className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
              step 1 · drop a .minepacker.zip
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--gold)]">
                MinePacker packs only
              </span>
              <span className="rounded-full border border-[var(--green)]/30 bg-[var(--green)]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--green)]">
                MC 26.2 Target
              </span>
            </div>
            <p className="max-w-sm text-[12px] leading-relaxed text-[var(--muted)]">
              Merge works only with zips made by MinePacker — their manifest lists every function inside,
              so nothing can get out of sync. Convert a JSON on the Convert tab first.
            </p>
            <button
              onClick={() => zipInput.current?.click()}
              className="btn-pixel mt-1 rounded-lg border border-[var(--line)] bg-[#161e13] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[#9fce82] hover:bg-[#1b2716]"
            >
              browse .minepacker.zip
            </button>
            <input
              ref={zipInput}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadZip(f);
                e.target.value = "";
              }}
            />
          </div>

          {packErr && (
            <div className="pixel-border border-[var(--red)]/30 bg-[var(--red)]/[0.06] px-4 py-3 font-mono text-[12px] text-[var(--red)]">
              ✗ {packErr}
            </div>
          )}

          {pack && (
            <>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <span className="pixel-sq bg-[var(--green)]" />
                <span className="font-mono text-[12px] font-semibold text-[var(--text)]">
                  {packFile?.name}
                </span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  ns: {pack.namespace}
                </span>
              </div>
              <CommandsList
                namespace={pack.namespace}
                builds={pack.builds}
                defaultBuild={pack.default}
                title={`functions inside ${packFile?.name ?? "this pack"}`}
              />
            </>
          )}

          <div className="pixel-border overflow-hidden">
            <button
              onClick={() => setOptsOpen((o) => !o)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/20"
              aria-expanded={optsOpen}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className={`shrink-0 text-[var(--green)] transition-transform duration-200 ${
                  optsOpen ? "rotate-180" : ""
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
                merge options
              </span>
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
                optional
              </span>
              <span className="ml-auto font-mono text-[10.5px] text-[var(--muted)]">
                {optsOpen ? "click to hide" : "click to open"}
              </span>
            </button>

            {optsOpen && (
              <div className="space-y-3 border-t border-[var(--line)] bg-black/15 p-4">
                <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
                  Both options are off by default — a plain merge just adds the new build to the pack and
                  leaves the existing default untouched.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                    <div className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[var(--gold)]">
                      Make default
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                      Every build always keeps its direct command. Turning this on only changes the shortcut
                      <code className="mx-1 text-[var(--teal)]">/function {ns}:generate</code>
                      so it points to the newly added build. The previous build remains available through its
                      own command.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                    <div className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[var(--gold)]">
                      Overwrite a command
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                      Use this only when the new JSON intentionally replaces a build with the same command.
                      MinePacker replaces that one <code className="text-[var(--teal)]">.mcfunction</code>
                      file and updates its counts; every differently named build stays unchanged.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={makeDefault}
                  onChange={setMakeDefault}
                  label="Make this the default build"
                  hint={
                    makeDefault
                      ? `on — /function ${ns}:generate and /function ${ns}:genrate will place THIS build`
                      : `off (default) — the pack's current default stays; /function ${ns}:${cmd} still places this one directly`
                  }
                />
                <Toggle
                  checked={overwrite}
                  onChange={setOverwrite}
                  label="Overwrite if the command already exists"
                  hint={
                    conflict
                      ? `⚠ "${cmd}" is already in this pack — turn this on to replace that function with the new JSON`
                      : `off (default) — if a build called "${cmd}" already exists, the merge is refused instead of overwriting anything`
                  }
                  warn={conflict && !overwrite}
                />
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------- step 2: json ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="pixel-border overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-black/20 px-4 py-3">
              <span className="pixel-sq bg-[var(--gold)]" />
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
                step 2 · the json to add
              </span>
              <label className="btn-pixel ml-auto cursor-pointer rounded-lg border border-[var(--line)] bg-[#161e13] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[#9fce82] hover:bg-[#1b2716]">
                ↑ .json
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setRaw(await f.text());
                    setStatus(null);
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
                setHighlight(null);
              }}
              spellCheck={false}
              className={`h-[300px] w-full resize-none bg-transparent p-4 font-mono text-[12.5px] leading-[1.6] text-[#c3d0b5] outline-none ${
                parsed.ok ? "" : "bg-[var(--red)]/[0.04]"
              }`}
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
                  ? `✓ valid — ${parsed.blocks.length} blocks → ${parsed.ops.length} commands`
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

          {nsMismatch && (
            <div className="pixel-border border-[var(--gold)]/30 bg-[var(--gold)]/[0.06] px-4 py-3 font-mono text-[11.5px] leading-relaxed text-[var(--gold)]">
              ⚠ your json says namespace “{sanitizeId(parsed.building.namespace!, "ubuilder")}” but the pack
              uses “{pack!.namespace}”. The pack’s namespace wins — it will run as{" "}
              <span className="text-[var(--green)]">
                /function {pack!.namespace}:{cmd}
              </span>
              .
            </div>
          )}

          <RunCommand
            namespace={ns}
            command={cmd}
            ready={parsed.ok}
            note={
              pack
                ? "This is the command for the build you're adding. The full list for the new zip is below."
                : "Load a zip first — same command will work once merged."
            }
          />

          {parsed.ok && <FunctionCode code={functionCode} namespace={ns} command={cmd} />}

          <CommandsList
            namespace={ns}
            builds={previewBuilds}
            defaultBuild={makeDefault ? cmd : pack?.default}
            highlight={highlight ?? cmd}
            title="commands the new zip will contain"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={merge}
          disabled={busy || !pack}
          className="btn-pixel rounded-xl bg-[var(--green)] px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-[#0c130a] hover:brightness-105"
        >
          {busy ? "merging…" : "merge → new .minepacker.zip ↓"}
        </button>
        <p className="max-w-md font-mono text-[11px] leading-relaxed text-[var(--muted)]">
          {pack
            ? "the original zip is never modified — you download a new pack containing every build."
            : "load a .minepacker.zip to enable merging."}
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
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  warn,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2.5 text-left transition-colors hover:bg-black/30"
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border font-mono text-[9px] ${
          checked
            ? "border-[var(--green)] bg-[var(--green)] text-[#0c130a]"
            : "border-[#3a4a2c] text-transparent"
        }`}
      >
        ✓
      </span>
      <span>
        <span className="block font-mono text-[12px] text-[var(--text)]">{label}</span>
        <span className={`block text-[11px] ${warn ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>
          {hint}
        </span>
      </span>
    </button>
  );
}
