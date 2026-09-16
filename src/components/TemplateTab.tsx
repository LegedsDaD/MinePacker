import { REQUIRED_TEMPLATE, FULL_MARKDOWN, CREATOR } from "../lib/buildpack";
import CopyButton from "../components/CopyButton";
import DownloadButton from "../components/DownloadButton";

const FIELDS: [string, string][] = [
  ["name", "Pack and downloaded file name. Lowercase, no spaces."],
  ["namespace", "The part BEFORE the colon in /function <namespace>:<command>."],
  ["command", "The part AFTER the colon — this build's own function name. Unique within the pack."],
  ["blocks", "The building itself — a non-empty list of the 4 entry forms below."],
];

const ENTRY_FORMS: { title: string; accent: string; desc: string; code: string }[] = [
  {
    title: "Region · from → to",
    accent: "var(--gold)",
    desc: "A filled box between two corners — floors, walls, roofs, pillars. The most efficient form.",
    code: `{ "from": [0, 0, 0],
  "to":   [8, 0, 8],
  "block": "minecraft:oak_planks" }`,
  },
  {
    title: "Single block · pos",
    accent: "var(--green)",
    desc: "One block at one coordinate — windows, lamps and decoration.",
    code: `{ "pos": [2, 2, 0],
  "block": "minecraft:glass" }`,
  },
  {
    title: "Clear · holes",
    accent: "var(--red)",
    desc: "Deletes a block placed earlier. Build the wall first, then clear the doorway.",
    code: `{ "clear": [4, 1, 8] }
{ "clear": [4, 2, 8] }`,
  },
  {
    title: "Compact string",
    accent: "var(--teal)",
    desc: "Optional one-line shorthand for a single block or a clear entry. Object entries are easiest to edit.",
    code: `"minecraft:glass~2,2,0"
"clear~4,1,8"`,
  },
];

const RULES: { ok: boolean; text: string }[] = [
  { ok: true, text: "All four top-level fields are required: name, namespace, command, blocks." },
  { ok: true, text: "Generated packs use data pack format 107.1 for Minecraft Java 26.2." },
  { ok: true, text: "Each .mcfunction command is written on its own line with no leading slash." },
  { ok: true, text: "Use # for comments and blank lines; both are ignored by Minecraft." },
  { ok: true, text: "Coordinates are whole numbers [x, y, z] — x east, y up, z south." },
  { ok: true, text: "Start your build at [0,0,0]; that corner lands where you stand in-game." },
  { ok: true, text: "Entries apply in order — later ones overwrite earlier ones; clear punches holes." },
  { ok: true, text: 'A bare "glass" becomes "minecraft:glass" automatically.' },
  { ok: false, text: "No decimals, capital letters or spaces in names/commands." },
  { ok: false, text: "command can't be generate, genrate, load, list or info (reserved)." },
];

const INSTALL = [
  ["1", "Put the downloaded *.minepacker.zip into <world>/datapacks/ — don't unzip it."],
  ["2", "Re-enter the world, or run /reload."],
  ["3", "Stand at the build spot and run /function <namespace>:<command>."],
  ["4", "Run /function <namespace>:list to see every build in the pack."],
];

export default function TemplateTab() {
  return (
    <div className="space-y-8">
      {/* ------------------------------------------------ template ---- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="pixel-border overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-black/20 px-4 py-3">
            <span className="pixel-sq bg-[var(--green)]" />
            <span className="font-mono text-[12px] font-semibold text-[var(--text)]">template.json</span>
            <span className="font-mono text-[10.5px] text-[var(--muted)]">required format</span>
            <div className="ml-auto flex gap-2">
              <CopyButton text={REQUIRED_TEMPLATE} />
              <DownloadButton content={REQUIRED_TEMPLATE} fileName="template.json" mime="application/json" label="download" variant="gold" />
            </div>
          </div>
          <pre className="max-h-[520px] overflow-auto p-4 font-mono text-[12px] leading-[1.65] text-[#c3d0b5]">
            {REQUIRED_TEMPLATE}
          </pre>
        </div>

        <div className="flex flex-col gap-6">
          <div className="pixel-border p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--green)]">
                required fields
              </h3>
              <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--gold)]">
                Minecraft 26.2 Strict
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {FIELDS.map(([k, d]) => (
                <li key={k} className="border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[12.5px] font-bold text-[var(--gold)]">{k}</code>
                    <span className="rounded-full bg-[var(--red)]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--red)]">
                      required
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">{d}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-[var(--line-strong)] bg-black/25 p-3 font-mono text-[11.5px] leading-relaxed text-[var(--muted)]">
              in-game:{" "}
              <span className="font-bold text-[var(--green)]">
                /function <span className="text-[var(--gold)]">namespace</span>:
                <span className="text-[var(--teal)]">command</span>
              </span>
            </div>
          </div>

          <div className="pixel-border p-5">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--gold)]">
              26.2 function-file rules
            </h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
              MinePacker writes plain text <code className="text-[var(--teal)]">.mcfunction</code> files
              under <code className="text-[var(--gold)]">data/&lt;namespace&gt;/function/</code>. Each line is
              a Minecraft command, never a chat command.
            </p>
            <pre className="mt-3 overflow-auto rounded-lg border border-[var(--line)] bg-black/30 p-3 font-mono text-[11.5px] leading-[1.7] text-[#c3d0b5]">
{`# comments begin with a hashtag
say Hello from MinePacker
setblock ~0 ~0 ~0 minecraft:stone
fill ~0 ~0 ~0 ~4 ~0 ~4 minecraft:oak_planks`}
            </pre>
            <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
              <li>✓ save the file with the .mcfunction extension</li>
              <li>✓ one command per line</li>
              <li>✓ no leading / inside the file</li>
              <li>✓ blank lines and # comments are safe</li>
            </ul>
          </div>

          <div className="pixel-border p-5">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--teal)]">
              install
            </h3>
            <ol className="mt-3 space-y-2.5">
              {INSTALL.map(([n, t]) => (
                <li key={n} className="flex gap-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green)]/15 font-mono text-[10px] font-bold text-[var(--green)]">
                    {n}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- full markdown ---- */}
      <div className="pixel-border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-black/20 px-4 py-3">
          <span className="pixel-sq bg-[var(--teal)]" />
          <div>
            <div className="font-mono text-[12px] font-semibold text-[var(--text)]">
              template.md — full copyable markdown
            </div>
            <div className="font-mono text-[10.5px] text-[var(--muted)]">
              the complete guide in one block — paste it into Discord, Notion or a README
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <CopyButton text={FULL_MARKDOWN} label="copy markdown" />
            <DownloadButton content={FULL_MARKDOWN} fileName="template.md" mime="text/markdown" label="download .md" variant="green" />
          </div>
        </div>
        <pre className="max-h-[420px] overflow-auto p-5 font-mono text-[12px] leading-[1.7] text-[#b8c6a9]">
          {FULL_MARKDOWN}
        </pre>
      </div>

      {/* ------------------------------------------------ entry forms --- */}
      <div>
        <div className="kicker mb-4">
          <span className="pixel-sq bg-[var(--green)]" />
          the 4 things you can put in “blocks”
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ENTRY_FORMS.map((e) => (
            <div
              key={e.title}
              className="pixel-border p-4 transition-transform duration-200 hover:-translate-y-1"
              style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${e.accent} 18%, transparent)` }}
            >
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: e.accent }}>
                {e.title}
              </h4>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{e.desc}</p>
              <pre className="mt-3 overflow-auto rounded-lg border border-[var(--line)] bg-black/30 p-3 font-mono text-[11.5px] leading-[1.6] text-[#c3d0b5]">
                {e.code}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------------------------- rules & coords --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="pixel-border p-5">
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--gold)]">
            rules
          </h3>
          <ul className="mt-4 space-y-2.5">
            {RULES.map((r) => (
              <li key={r.text} className="flex gap-2.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                <span style={{ color: r.ok ? "var(--green)" : "var(--red)" }}>{r.ok ? "✓" : "✗"}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--line)] pt-3 font-mono text-[10.5px] text-[var(--muted)]">
            Template format by {CREATOR}
          </p>
        </div>

        <div className="pixel-border p-5">
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--teal)]">
            coordinates cheatsheet
          </h3>
          <div className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
            <p>
              <code className="text-[var(--gold)]">x</code> east (width) ·{" "}
              <code className="text-[var(--gold)]">y</code> up (height) ·{" "}
              <code className="text-[var(--gold)]">z</code> south (depth)
            </p>
            <pre className="overflow-auto rounded-lg border border-[var(--line)] bg-black/30 p-3 font-mono text-[11.5px] leading-[1.7] text-[#c3d0b5]">
{`9x9 floor           "from":[0,0,0] "to":[8,0,8]
wall 4 blocks high  "from":[0,1,0] "to":[0,4,0]
lamp on top         "pos":[4,5,4]
door hole           "clear":[4,1,8]`}
            </pre>
            <p className="rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-3">
              Building a village? Keep the same <code className="text-[var(--gold)]">namespace</code> in
              every JSON, give each a different <code className="text-[var(--teal)]">command</code>, then
              stack them with the Merge tab into one .minepacker.zip.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
