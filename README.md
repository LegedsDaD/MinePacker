# MinePacker

MinePacker is a browser-based converter for turning JSON building descriptions into installable Minecraft Java Edition datapacks. Each generated pack uses the `.minepacker.zip` suffix and contains copyable `/function namespace:command` build commands.

Created by **LegedsDaD**.

## Features

- Convert structure JSON into a downloadable `.minepacker.zip` datapack.
- Merge another structure JSON into an existing MinePacker pack.
- Keep multiple independently callable builds in one datapack.
- Display and copy every build command contained in a pack.
- Show, copy, and download the complete generated `.mcfunction` source.
- Download the required JSON template and a full Markdown authoring guide.
- Compress adjacent blocks into efficient `fill` commands.
- Process files locally in the browser; structure files are not uploaded.

## Minecraft command format

Minecraft functions use this format:

```mcfunction
/function <namespace>:<command>
```

Given this JSON:

```json
{
  "name": "oak_house",
  "namespace": "ubuilder",
  "command": "oak_house",
  "blocks": [
    {
      "from": [0, 0, 0],
      "to": [8, 0, 8],
      "block": "minecraft:oak_planks"
    }
  ]
}
```

Run the generated build with:

```mcfunction
/function ubuilder:oak_house
```

## Local development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

The production output is written to `dist/`.

## Generated pack contents

```text
oak_house.minepacker.zip
├── pack.mcmeta
├── minepacker.manifest.json
└── data
    ├── minecraft/tags/function/load.json
    └── ubuilder/function
        ├── oak_house.mcfunction
        ├── generate.mcfunction
        ├── genrate.mcfunction
        ├── list.mcfunction
        ├── load.mcfunction
        └── info.mcfunction
```

MinePacker merge accepts only packs containing a valid `minepacker.manifest.json` created by MinePacker. This keeps the build registry and generated command list synchronized.

## Merge options

Both merge options are optional and disabled by default.

### Make this the default build

This changes `/function <namespace>:generate` so it calls the newly added build. It does not delete or rename the previous default build; that structure remains callable through its direct command.

### Overwrite if the command already exists

This allows the new JSON to replace an existing build with the same command name. MinePacker replaces only that matching `.mcfunction` file and updates its manifest counts. Other builds remain unchanged. With this option disabled, a command-name collision safely cancels the merge.

## Installing a generated pack

1. Copy the generated `.minepacker.zip` into `<world>/datapacks/` without unzipping it.
2. Enter the world or run `/reload`.
3. Stand where the structure's front-bottom-left corner should be placed.
4. Run `/function <namespace>:<command>`.
5. Run `/function <namespace>:list` to see all available builds in the pack.

## Project structure

```text
src/
├── App.tsx
├── components/
│   ├── CommandsList.tsx
│   ├── CopyButton.tsx
│   ├── DownloadButton.tsx
│   ├── ForgeTab.tsx
│   ├── FunctionCode.tsx
│   ├── Logo.tsx
│   ├── MergeTab.tsx
│   ├── RunCommand.tsx
│   └── TemplateTab.tsx
└── lib/
    └── buildpack.ts
```

## Compatibility

- Minecraft Java Edition 1.21+
- Vanilla datapacks; no mods required
- Modern browsers with `Blob`, File API, and object URL support

MinePacker is not affiliated with Mojang Studios or Microsoft.
