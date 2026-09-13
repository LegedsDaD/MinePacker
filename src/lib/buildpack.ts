import JSZip from "jszip";

export const CREATOR = "LegedsDaD";
export const FORGE_NAME = "MinePacker";
export const FORGE_VERSION = "2.0";
export const PACK_EXT = ".minepacker.zip";

export type Vec3 = [number, number, number];

export type BuildingEntry = {
  pos?: Vec3;
  from?: Vec3;
  to?: Vec3;
  clear?: Vec3;
  block?: string;
};

export type Building = {
  name?: string;
  namespace?: string;
  command?: string;
  blocks: (BuildingEntry | string)[];
};

export type ParsedBlock = { x: number; y: number; z: number; block: string };
export type Op = { a: Vec3; b: Vec3; block: string };

export const DEFAULT_NAMESPACE = "ubuilder";
export const RESERVED = ["generate", "genrate", "load", "info", "list"];
const MAX_REGION = 20000;
const MANIFEST = "minepacker.manifest.json";

export function sanitizeId(raw: string, fallback = "my_build"): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-.]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || fallback;
}

// ---------------------------------------------------------------- parse ----
function asCoord(t: unknown, what: string): Vec3 {
  if (
    !Array.isArray(t) ||
    t.length !== 3 ||
    t.some((v) => typeof v !== "number" || !Number.isInteger(v))
  ) {
    throw new Error(`${what} must be [x, y, z] integers`);
  }
  return [t[0] as number, t[1] as number, t[2] as number];
}

function normalizeBlock(raw: unknown, idx: number): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`blocks[${idx}] needs a "block" id, e.g. "minecraft:oak_planks"`);
  }
  let r = raw.trim().toLowerCase();
  if (!r.includes(":")) r = `minecraft:${r}`;
  if (!BLOCK_RE.test(r)) {
    throw new Error(
      `blocks[${idx}]: "${raw}" is not a valid block id (expected e.g. "minecraft:oak_planks")`
    );
  }
  return r;
}

// Minecraft resource-location rules: [a-z0-9_.-] for the path/namespace.
const ID_RE = /^[a-z0-9_.-]+$/;
// Full block id: <namespace>:<path>, each part [a-z0-9_.-] plus / in the path.
const BLOCK_RE = /^[a-z0-9_.-]+:[a-z0-9_./-]+(\[[^\]]*\])?(\{.*\})?$/;

const ALLOWED_TOP_KEYS = new Set(["name", "namespace", "command", "blocks"]);
const ALLOWED_ENTRY_KEYS = new Set(["pos", "from", "to", "clear", "block"]);

export function parseBuilding(raw: string): Building {
  if (!raw || !raw.trim()) {
    throw new Error("empty file - paste a building JSON that follows the template");
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`invalid JSON - ${(e as Error).message}`);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("root must be a JSON object { ... } - see the TEMPLATE tab");
  }
  const b = data as Record<string, unknown>;

  // reject unknown top-level keys early so typos surface immediately
  for (const key of Object.keys(b)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      throw new Error(`unknown field "${key}" - allowed: name, namespace, command, blocks`);
    }
  }

  // required string fields
  for (const key of ["name", "namespace", "command"] as const) {
    const v = b[key];
    if (typeof v !== "string" || !v.trim()) {
      throw new Error(`missing required field "${key}" - see the TEMPLATE tab`);
    }
  }

  // strict namespace + command validation (so /function always resolves)
  const ns = (b.namespace as string).trim().toLowerCase();
  const cmd = (b.command as string).trim().toLowerCase();
  if (!ID_RE.test(ns)) {
    throw new Error(
      `"namespace" must use only lowercase letters, numbers, _ . - (got "${b.namespace}")`
    );
  }
  if (!ID_RE.test(cmd)) {
    throw new Error(
      `"command" must use only lowercase letters, numbers, _ . - (got "${b.command}")`
    );
  }
  if (RESERVED.includes(cmd)) {
    throw new Error(`"command": "${cmd}" is reserved - use a different build name`);
  }

  // blocks list
  if (!Array.isArray(b.blocks)) {
    throw new Error('"blocks" must be a list [ ... ]');
  }
  if (b.blocks.length === 0) {
    throw new Error('"blocks" must contain at least one entry');
  }

  return {
    name: (b.name as string).trim(),
    namespace: ns,
    command: cmd,
    blocks: b.blocks as (BuildingEntry | string)[],
  };
}

/** The exact command a player runs for this building. */
export function runCommandFor(b: Building): string {
  return `/function ${sanitizeId(b.namespace ?? DEFAULT_NAMESPACE, DEFAULT_NAMESPACE)}:${sanitizeId(
    b.command ?? b.name ?? "my_build"
  )}`;
}

export function expandBuilding(b: Building): ParsedBlock[] {
  const map = new Map<string, string>();
  b.blocks.forEach((entry, idx) => {
    if (typeof entry === "string") {
      // section labels / comments: "--- floor ---", "# walls", "// roof"
      const t = entry.trim();
      if (t === "" || /^(-{2,}|#|\/\/)/.test(t)) return;
      if (!entry.includes("~")) {
        throw new Error(
          `blocks[${idx}]: compact strings look like "minecraft:glass~2,1,4" (or use "--- a label ---")`
        );
      }
      const [head, tail] = entry.split("~");
      const coords = tail.split(",").map((p) => {
        const n = Number(p.trim());
        if (!Number.isInteger(n)) throw new Error(`blocks[${idx}]: bad coordinates "${tail}"`);
        return n;
      });
      if (coords.length !== 3) throw new Error(`blocks[${idx}]: need 3 coordinates`);
      const key = coords.join(",");
      if (head.trim().toLowerCase() === "clear") map.delete(key);
      else map.set(key, normalizeBlock(head, idx));
      return;
    }
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`blocks[${idx}] must be an object { ... } or a compact string`);
    }
    for (const key of Object.keys(entry)) {
      if (!ALLOWED_ENTRY_KEYS.has(key)) {
        throw new Error(
          `blocks[${idx}]: unknown key "${key}" - allowed: pos, from, to, clear, block`
        );
      }
    }
    if (entry.clear) {
      map.delete(asCoord(entry.clear, `blocks[${idx}].clear`).join(","));
      return;
    }
    if (entry.from && entry.to) {
      const a = asCoord(entry.from, `blocks[${idx}].from`);
      const c = asCoord(entry.to, `blocks[${idx}].to`);
      const [x0, x1] = [Math.min(a[0], c[0]), Math.max(a[0], c[0])];
      const [y0, y1] = [Math.min(a[1], c[1]), Math.max(a[1], c[1])];
      const [z0, z1] = [Math.min(a[2], c[2]), Math.max(a[2], c[2])];
      const size = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
      if (size > MAX_REGION) throw new Error(`blocks[${idx}]: region too large (max ${MAX_REGION})`);
      const block = normalizeBlock(entry.block, idx);
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
          for (let z = z0; z <= z1; z++) map.set(`${x},${y},${z}`, block);
      return;
    }
    if (entry.pos) {
      map.set(asCoord(entry.pos, `blocks[${idx}].pos`).join(","), normalizeBlock(entry.block, idx));
      return;
    }
    throw new Error(`blocks[${idx}] needs "pos" or a "from"/"to" pair`);
  });
  if (map.size === 0) throw new Error("no blocks left after expansion — nothing to build");
  const out: ParsedBlock[] = [];
  map.forEach((block, key) => {
    const [x, y, z] = key.split(",").map(Number);
    out.push({ x, y, z, block });
  });
  return out;
}

export function footprint(blocks: ParsedBlock[]) {
  const xs = blocks.map((b) => b.x);
  const ys = blocks.map((b) => b.y);
  const zs = blocks.map((b) => b.z);
  return {
    w: Math.max(...xs) - Math.min(...xs) + 1,
    h: Math.max(...ys) - Math.min(...ys) + 1,
    d: Math.max(...zs) - Math.min(...zs) + 1,
  };
}

// ------------------------------------------------------------- compress ----
export function compressBlocks(blocks: ParsedBlock[]): Op[] {
  const remaining = new Map<string, string>();
  const idx = new Map<string, Vec3>();
  blocks.forEach((b) => {
    const k = `${b.x},${b.y},${b.z}`;
    remaining.set(k, b.block);
    idx.set(k, [b.x, b.y, b.z]);
  });
  const dirs: Vec3[] = [
    [1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ];
  const ops: Op[] = [];
  while (remaining.size > 0) {
    const firstKey = remaining.keys().next().value as string;
    const [x, y, z] = idx.get(firstKey)!;
    const block = remaining.get(firstKey)!;
    let bestLen = 1;
    let bestDir = dirs[0];
    for (const d of dirs) {
      let len = 1;
      let cx = x + d[0],
        cy = y + d[1],
        cz = z + d[2];
      while (remaining.get(`${cx},${cy},${cz}`) === block) {
        len++;
        cx += d[0];
        cy += d[1];
        cz += d[2];
      }
      if (len > bestLen) {
        bestLen = len;
        bestDir = d;
      }
    }
    let ex = x,
      ey = y,
      ez = z;
    for (let i = 0; i < bestLen; i++) {
      remaining.delete(`${ex},${ey},${ez}`);
      ex += bestDir[0];
      ey += bestDir[1];
      ez += bestDir[2];
    }
    ops.push({
      a: [x, y, z],
      b: [
        x + bestDir[0] * (bestLen - 1),
        y + bestDir[1] * (bestLen - 1),
        z + bestDir[2] * (bestLen - 1),
      ],
      block,
    });
  }
  ops.sort((p, q) => p.a[1] - q.a[1] || p.a[0] - q.a[0] || p.a[2] - q.a[2]);
  return ops;
}

// -------------------------------------------------------- mcfunction text --
const rel = (n: number) => `~${n}`;

export function originOf(ops: Op[]): Vec3 {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  for (const o of ops) for (let i = 0; i < 3; i++) lo[i] = Math.min(lo[i], o.a[i], o.b[i]);
  return lo;
}

export function buildFunctionText(label: string, ns: string, count: number, ops: Op[]) {
  const lo = originOf(ops);
  const lines: string[] = [
    "# ============================================================",
    `#  ${label} - ${FORGE_NAME} v${FORGE_VERSION} - by ${CREATOR}`,
    `#  ${count} blocks | ${ops.length} commands | origin lands at your feet`,
    "# ============================================================",
    `title @s actionbar {"text":"Forging ${label} ...","color":"yellow"}`,
    "",
  ];
  for (const { a, b, block } of ops) {
    const A = [a[0] - lo[0], a[1] - lo[1], a[2] - lo[2]];
    const B = [b[0] - lo[0], b[1] - lo[1], b[2] - lo[2]];
    lines.push(
      A[0] === B[0] && A[1] === B[1] && A[2] === B[2]
        ? `setblock ${rel(A[0])} ${rel(A[1])} ${rel(A[2])} ${block}`
        : `fill ${rel(A[0])} ${rel(A[1])} ${rel(A[2])} ${rel(B[0])} ${rel(B[1])} ${rel(B[2])} ${block}`
    );
  }
  lines.push(
    "",
    "playsound minecraft:entity.player.levelup master @s ~ ~ ~",
    `tellraw @s [{"text":"[${ns}] ","color":"green"},{"text":"${label} placed - ${count} blocks in ${ops.length} commands","color":"gray"}]`
  );
  return lines.join("\n") + "\n";
}

export function dispatcherText(ns: string, def: string) {
  return (
    `# default build — change by re-forging or editing this file\n` +
    `function ${ns}:${def}\n`
  );
}

export function listText(ns: string, builds: PackBuild[]) {
  const head =
    `tellraw @s [{"text":"[${FORGE_NAME}] ","color":"green"},` +
    `{"text":"${builds.length} build${builds.length === 1 ? "" : "s"} in this pack:","color":"gray"}]\n`;
  const rows = builds
    .map(
      (b) =>
        `tellraw @s [{"text":"  - ","color":"dark_gray"},` +
        `{"text":"/function ${ns}:${b.name}","color":"aqua","click_event":{"action":"suggest_command","command":"/function ${ns}:${b.name}"}},` +
        `{"text":"  ${b.blocks} blocks / ${b.commands} cmds","color":"dark_gray"}]`
    )
    .join("\n");
  return head + rows + "\n";
}

export function loadText(ns: string) {
  return (
    `tellraw @s [{"text":"[${FORGE_NAME}] ","color":"green"},` +
    `{"text":"pack loaded - run ","color":"gray"},` +
    `{"text":"/function ${ns}:list","color":"aqua"},` +
    `{"text":" to see every build command.","color":"gray"}]\n`
  );
}

export function infoText(ns: string, builds: PackBuild[], def: string) {
  const blocks = builds.reduce((s, b) => s + b.blocks, 0);
  const cmds = builds.reduce((s, b) => s + b.commands, 0);
  return (
    `tellraw @s [{"text":"[${FORGE_NAME} v${FORGE_VERSION}] ","color":"green"},` +
    `{"text":"namespace ","color":"gray"},{"text":"${ns}","color":"yellow"},` +
    `{"text":" - ${builds.length} builds - ${blocks} blocks - ${cmds} commands - default ","color":"gray"},` +
    `{"text":"${def}","color":"aqua"},{"text":" - pack by ${CREATOR}","color":"dark_gray"}]\n`
  );
}

export function mcmetaText(packName: string, builds: PackBuild[]) {
  return JSON.stringify(
    {
      pack: {
        pack_format: 48,
        supported_formats: {
          min_inclusive: 48,
          max_inclusive: 71,
        },
        description: `${packName} - ${builds.length} build${
          builds.length === 1 ? "" : "s"
        } - ${FORGE_NAME} v${FORGE_VERSION} by ${CREATOR}`,
      },
    },
    null,
    2
  );
}

// ------------------------------------------------------------- manifest ----
export type PackBuild = { name: string; blocks: number; commands: number };

export type Manifest = {
  forge: string;
  version: string;
  creator: string;
  packName: string;
  namespace: string;
  default: string;
  builds: PackBuild[];
};

export function makeManifest(
  packName: string,
  namespace: string,
  def: string,
  builds: PackBuild[]
): Manifest {
  return {
    forge: FORGE_NAME,
    version: FORGE_VERSION,
    creator: CREATOR,
    packName,
    namespace,
    default: def,
    builds,
  };
}

// ------------------------------------------------------------- packaging ---
// Minecraft renamed the datapack folders across versions:
//   - 1.20.4 and earlier (pack_format <= 26): "functions" + "tags/functions"
//   - 1.21+            (pack_format 48+):     "function"  + "tags/function"
// We write BOTH layouts so a generated pack works on every version, and the
// game simply ignores whichever folder it does not recognise.
const FN_DIRS = ["function", "functions"] as const;
const TAG_DIRS = ["tags/function", "tags/functions"] as const;

/** Write one .mcfunction into both the singular and plural function folders. */
function writeFunction(zip: JSZip, ns: string, name: string, content: string) {
  for (const fn of FN_DIRS) {
    zip.file(`data/${ns}/${fn}/${name}.mcfunction`, content);
  }
}

function writeShared(zip: JSZip, manifest: Manifest) {
  const { namespace: ns, builds, default: def, packName } = manifest;
  zip.file(MANIFEST, JSON.stringify(manifest, null, 2));
  zip.file("pack.mcmeta", mcmetaText(packName, builds));

  writeFunction(zip, ns, "generate", dispatcherText(ns, def));
  writeFunction(zip, ns, "genrate", `# legacy spelling - both work\nfunction ${ns}:generate\n`);
  writeFunction(zip, ns, "load", loadText(ns));
  writeFunction(zip, ns, "list", listText(ns, builds));
  writeFunction(zip, ns, "info", infoText(ns, builds, def));

  // load tag (both folder names) so :load runs automatically on /reload
  const loadTag = JSON.stringify({ values: [`${ns}:load`] }, null, 2);
  for (const tag of TAG_DIRS) {
    zip.file(`data/minecraft/${tag}/load.json`, loadTag);
  }
}

export type ForgeOptions = {
  namespace?: string;
  command?: string;
  packName?: string;
};

export type ForgeResult = {
  blob: Blob;
  fileName: string;
  packName: string;
  namespace: string;
  command: string;
  builds: PackBuild[];
  blocks: number;
  commands: number;
  functionText: string;
};

export async function forgeZip(building: Building, opts: ForgeOptions = {}): Promise<ForgeResult> {
  const ns = sanitizeId(opts.namespace ?? building.namespace ?? DEFAULT_NAMESPACE, DEFAULT_NAMESPACE);
  const cmd = sanitizeId(opts.command ?? building.command ?? building.name ?? "my_build");
  if (RESERVED.includes(cmd)) throw new Error(`"${cmd}" is a reserved function name — pick another`);
  const packName = sanitizeId(opts.packName ?? building.name ?? cmd);

  const blocks = expandBuilding(building);
  const ops = compressBlocks(blocks);
  const functionText = buildFunctionText(cmd, ns, blocks.length, ops);
  const builds: PackBuild[] = [{ name: cmd, blocks: blocks.length, commands: ops.length }];

  const zip = new JSZip();
  writeFunction(zip, ns, cmd, functionText);
  writeShared(zip, makeManifest(packName, ns, cmd, builds));

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    fileName: `${packName}${PACK_EXT}`,
    packName,
    namespace: ns,
    command: cmd,
    builds,
    blocks: blocks.length,
    commands: ops.length,
    functionText,
  };
}

// ---------------------------------------------------------------- merge ----
export type LoadedPack = {
  zip: JSZip;
  namespace: string;
  packName: string;
  default: string;
  builds: PackBuild[];
};

const NOT_MINEPACKER =
  "not a MinePacker pack — merge only accepts .minepacker.zip files created by MinePacker. Convert a JSON on the Convert tab first.";

export async function readPack(file: Blob, fallbackName = "merged_pack"): Promise<LoadedPack> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("that file is not a readable .zip archive");
  }

  // MinePacker packs are self-describing via minepacker.manifest.json,
  // so merging only accepts packs this tool actually produced.
  const manifestFile = zip.file(MANIFEST);
  if (!manifestFile) throw new Error(NOT_MINEPACKER);

  let manifest: Manifest;
  try {
    manifest = JSON.parse(await manifestFile.async("string")) as Manifest;
  } catch {
    throw new Error(NOT_MINEPACKER);
  }
  if (manifest.forge !== FORGE_NAME || !manifest.namespace || !Array.isArray(manifest.builds)) {
    throw new Error(NOT_MINEPACKER);
  }
  return {
    zip,
    namespace: sanitizeId(manifest.namespace, DEFAULT_NAMESPACE),
    packName: sanitizeId(manifest.packName ?? fallbackName, fallbackName),
    default: manifest.default || manifest.builds[0]?.name || "",
    builds: manifest.builds,
  };
}

export type MergeOptions = {
  command: string;
  makeDefault?: boolean;
  overwrite?: boolean;
  packName?: string;
};

export type MergeResult = {
  blob: Blob;
  fileName: string;
  namespace: string;
  command: string;
  builds: PackBuild[];
  default: string;
  added: PackBuild;
  replaced: boolean;
};

export async function mergeIntoPack(
  pack: LoadedPack,
  building: Building,
  opts: MergeOptions
): Promise<MergeResult> {
  const ns = pack.namespace;
  const cmd = sanitizeId(opts.command);
  if (RESERVED.includes(cmd)) throw new Error(`"${cmd}" is a reserved function name — pick another`);

  const exists = pack.builds.some((b) => b.name === cmd);
  if (exists && !opts.overwrite) {
    throw new Error(`"${cmd}" already exists in this pack — rename it or enable overwrite`);
  }

  const blocks = expandBuilding(building);
  const ops = compressBlocks(blocks);
  const entry: PackBuild = { name: cmd, blocks: blocks.length, commands: ops.length };

  const zip = pack.zip;
  writeFunction(zip, ns, cmd, buildFunctionText(cmd, ns, blocks.length, ops));

  const builds = exists
    ? pack.builds.map((b) => (b.name === cmd ? entry : b))
    : [...pack.builds, entry];
  const def = opts.makeDefault || !pack.default ? cmd : pack.default;
  const packName = sanitizeId(opts.packName ?? pack.packName, "merged_pack");

  writeShared(zip, makeManifest(packName, ns, def, builds));

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    fileName: `${packName}${PACK_EXT}`,
    namespace: ns,
    command: cmd,
    builds,
    default: def,
    added: entry,
    replaced: exists,
  };
}

/** Triggers a download. Returns the object URL so the UI can offer a manual
 *  fallback link where programmatic downloads are sandboxed. */
export function downloadBlob(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 90_000);
  return url;
}

export function stripPackExt(name: string): string {
  return name.replace(/\.minepacker\.zip$/i, "").replace(/\.zip$/i, "");
}

// ----------------------------------------------------------- sample house --
export const sampleBuilding: Building = {
  name: "oak_house",
  namespace: "ubuilder",
  command: "oak_house",
  blocks: [
    { from: [0, 0, 0], to: [8, 0, 8], block: "minecraft:oak_planks" },
    { from: [0, 1, 0], to: [0, 3, 8], block: "minecraft:oak_planks" },
    { from: [8, 1, 0], to: [8, 3, 8], block: "minecraft:oak_planks" },
    { from: [1, 1, 0], to: [7, 3, 0], block: "minecraft:oak_planks" },
    { from: [1, 1, 8], to: [7, 3, 8], block: "minecraft:oak_planks" },
    { pos: [2, 2, 0], block: "minecraft:glass" },
    { pos: [6, 2, 0], block: "minecraft:glass" },
    { pos: [2, 2, 8], block: "minecraft:glass" },
    { pos: [6, 2, 8], block: "minecraft:glass" },
    { pos: [0, 2, 4], block: "minecraft:glass" },
    { pos: [8, 2, 4], block: "minecraft:glass" },
    { pos: [3, 1, 8], block: "minecraft:oak_log" },
    { pos: [3, 2, 8], block: "minecraft:oak_log" },
    { pos: [5, 1, 8], block: "minecraft:oak_log" },
    { pos: [5, 2, 8], block: "minecraft:oak_log" },
    { pos: [4, 3, 8], block: "minecraft:oak_log" },
    { pos: [0, 1, 0], block: "minecraft:oak_log" },
    { pos: [0, 3, 0], block: "minecraft:oak_log" },
    { pos: [8, 1, 0], block: "minecraft:oak_log" },
    { pos: [8, 3, 0], block: "minecraft:oak_log" },
    { pos: [0, 1, 8], block: "minecraft:oak_log" },
    { pos: [0, 3, 8], block: "minecraft:oak_log" },
    { pos: [8, 1, 8], block: "minecraft:oak_log" },
    { pos: [8, 3, 8], block: "minecraft:oak_log" },
    { clear: [4, 1, 8] },
    { clear: [4, 2, 8] },
    { from: [0, 4, 0], to: [8, 4, 8], block: "minecraft:oak_slab" },
    { from: [2, 5, 2], to: [6, 5, 6], block: "minecraft:oak_slab" },
    { from: [0, 5, 0], to: [1, 6, 1], block: "minecraft:stone_bricks" },
  ],
};

export const sampleJson = JSON.stringify(sampleBuilding, null, 2);

// ------------------------------------------------------------ templates ----
// Strict, pure-JSON template. Every field is required and validated. No string
// "label" entries are used here so the file is guaranteed to be valid JSON and
// to convert successfully on the first try.
export const REQUIRED_TEMPLATE = `{
  "name": "oak_house",
  "namespace": "ubuilder",
  "command": "oak_house",
  "blocks": [
    { "from": [0, 0, 0], "to": [8, 0, 8], "block": "minecraft:oak_planks" },
    { "from": [0, 1, 0], "to": [0, 3, 8], "block": "minecraft:oak_planks" },
    { "from": [8, 1, 0], "to": [8, 3, 8], "block": "minecraft:oak_planks" },
    { "from": [1, 1, 0], "to": [7, 3, 0], "block": "minecraft:oak_planks" },
    { "from": [1, 1, 8], "to": [7, 3, 8], "block": "minecraft:oak_planks" },
    { "pos": [0, 1, 0], "block": "minecraft:oak_log" },
    { "pos": [0, 3, 0], "block": "minecraft:oak_log" },
    { "pos": [8, 1, 0], "block": "minecraft:oak_log" },
    { "pos": [8, 3, 0], "block": "minecraft:oak_log" },
    { "pos": [2, 2, 0], "block": "minecraft:glass" },
    { "pos": [6, 2, 0], "block": "minecraft:glass" },
    { "pos": [0, 2, 4], "block": "minecraft:glass" },
    { "pos": [8, 2, 4], "block": "minecraft:glass" },
    { "clear": [4, 1, 8] },
    { "clear": [4, 2, 8] },
    { "from": [0, 4, 0], "to": [8, 4, 8], "block": "minecraft:oak_slab" },
    { "from": [2, 5, 2], "to": [6, 5, 6], "block": "minecraft:oak_slab" },
    { "pos": [4, 3, 4], "block": "minecraft:glowstone" }
  ]
}`;

export const TEMPLATE_MINIMAL = `{
  "name": "tiny_platform",
  "namespace": "ubuilder",
  "command": "tiny_platform",
  "blocks": [
    { "from": [0, 0, 0], "to": [4, 0, 4], "block": "minecraft:stone_bricks" }
  ]
}`;

/** Full copy-pasteable Markdown document for the template page. */
export const FULL_MARKDOWN = (() => {
  const f = "```";
  return `# MinePacker — building template

MinePacker turns a building JSON into a Minecraft datapack
(\`*.minepacker.zip\`). Follow this file, paste it into the **Convert** tab,
then drop the downloaded zip into your world's \`datapacks\` folder and run
\`/reload\`.

## 1 · The command this creates

Minecraft uses \`/function <namespace>:<command>\` — namespace BEFORE the
colon, command AFTER it.

| json field | example | becomes |
|---|---|---|
| \`"namespace"\` | \`"ubuilder"\` | the part before \`:\` |
| \`"command"\` | \`"oak_house"\` | the part after \`:\` |

Result: \`/function ubuilder:oak_house\`

## 2 · The required template

Save this as \`oak_house.json\`:

${f}json
${REQUIRED_TEMPLATE}
${f}

## 3 · What goes inside "blocks"

- **Region (a filled box)** — floors, walls, roofs:

${f}json
{ "from": [0, 0, 0], "to": [8, 0, 8], "block": "minecraft:oak_planks" }
${f}

- **Single block** — windows, lamps, details:

${f}json
{ "pos": [2, 2, 0], "block": "minecraft:glass" }
${f}

- **Clear** — deletes a block placed earlier (doors, windows). Apply it
  AFTER the wall:

${f}json
{ "clear": [4, 1, 8] }
${f}

- **Compact strings** — one-liners:

${f}
"minecraft:glass~2,2,0"     → single glass block at [2,2,0]
"clear~4,1,8"               → removes the block at [4,1,8]
"--- walls ---"             → label/comment, ignored by the converter
${f}

## 4 · Rules

- All four top-level fields are required: \`name\`, \`namespace\`,
  \`command\`, \`blocks\`.
- Coordinates are whole numbers \`[x, y, z]\` (east, up, south). Build as
  if the front-bottom-left corner is \`[0,0,0]\` — when you run the command
  in-game, that corner lands exactly where you are standing.
- Entries apply in order, top to bottom; later entries overwrite earlier
  ones, and \`clear\` punches holes.
- \`namespace\` and \`command\` must be lowercase letters, numbers and
  underscores. \`command\` can't be \`generate\`, \`genrate\`, \`load\`,
  \`list\` or \`info\` (reserved).
- The \`minecraft:\` prefix on block ids is added automatically.

## 5 · Install

1. Put \`*.minepacker.zip\` into \`<world>/datapacks/\` (don't unzip it).
2. Re-enter the world or run \`/reload\`.
3. Stand at the build spot and run
   \`/function <namespace>:<command>\`.
4. \`/function <namespace>:list\` shows every build in the pack.

The pack works on Minecraft Java Edition 1.21 through 1.21.5+ (pack_format
48–71). No mods required.

## 6 · Adding more buildings

Give every new JSON the SAME \`namespace\` and a DIFFERENT \`command\`, then
use the **Merge** tab: load a \`.minepacker.zip\`, add the new JSON, and
download one pack containing every build. Merge only accepts zips created
by MinePacker.

---
Made with MinePacker · by LegedsDaD
`;
})();

export const sampleTowerJson = JSON.stringify(
  {
    name: "watch_tower",
    namespace: "ubuilder",
    command: "watch_tower",
    blocks: [
      { from: [0, 0, 0], to: [4, 0, 4], block: "minecraft:stone_bricks" },
      { from: [0, 1, 0], to: [0, 9, 0], block: "minecraft:stone_bricks" },
      { from: [4, 1, 0], to: [4, 9, 0], block: "minecraft:stone_bricks" },
      { from: [0, 1, 4], to: [0, 9, 4], block: "minecraft:stone_bricks" },
      { from: [4, 1, 4], to: [4, 9, 4], block: "minecraft:stone_bricks" },
      { from: [1, 9, 0], to: [3, 9, 4], block: "minecraft:stone_bricks" },
      { from: [0, 9, 1], to: [4, 9, 3], block: "minecraft:stone_bricks" },
      { from: [1, 10, 0], to: [3, 10, 0], block: "minecraft:cobblestone" },
      { from: [1, 10, 4], to: [3, 10, 4], block: "minecraft:cobblestone" },
      { pos: [2, 11, 2], block: "minecraft:glowstone" },
    ],
  },
  null,
  2
);

/** Distinct block ids used by a build, most-used first. */
export function blockPalette(blocks: ParsedBlock[]): { id: string; count: number }[] {
  const tally = new Map<string, number>();
  blocks.forEach((b) => tally.set(b.block, (tally.get(b.block) ?? 0) + 1));
  return [...tally.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}
