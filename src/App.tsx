import { useState } from "react";
import ForgeTab from "./components/ForgeTab";
import MergeTab from "./components/MergeTab";
import TemplateTab from "./components/TemplateTab";
import Reveal from "./components/Reveal";
import CopyButton from "./components/CopyButton";
import Logo from "./components/Logo";
import { CREATOR, FORGE_VERSION } from "./lib/buildpack";

type Tab = "template" | "convert" | "merge";

const TABS: [Tab, string][] = [
  ["template", "required template"],
  ["convert", "json → zip"],
  ["merge", "merge into zip"],
];

function HeroCard() {
  return (
    <div className="pixel-border shadow-hard overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-black/25 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#b3533f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#d9a441]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6ecb53]" />
        <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">oak_house.json</span>
      </div>
      <div className="space-y-3 p-5 font-mono text-[12.5px] leading-relaxed">
        <div className="text-[var(--muted)]">{"{"}</div>
        <div className="pl-5">
          <span className="text-[#8fdc6a]">"namespace"</span>
          <span className="text-[var(--muted)]">: </span>
          <span className="text-[var(--gold)]">"ubuilder"</span>
          <span className="text-[var(--muted)]">,</span>
        </div>
        <div className="pl-5">
          <span className="text-[#8fdc6a]">"command"</span>
          <span className="text-[var(--muted)]">: </span>
          <span className="text-[var(--teal)]">"oak_house"</span>
          <span className="text-[var(--muted)]">,</span>
        </div>
        <div className="pl-5">
          <span className="text-[#8fdc6a]">"blocks"</span>
          <span className="text-[var(--muted)]">: [ … ]</span>
        </div>
        <div className="text-[var(--muted)]">{"}"}</div>

        <div className="flex items-center gap-3 pt-1 text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--line-strong)]" />
          <span className="text-sm">↓</span>
          <span className="h-px flex-1 bg-[var(--line-strong)]" />
        </div>

        <div className="rounded-xl border border-[var(--line-strong)] bg-black/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Logo size={18} />
            <span className="text-[12px] text-[var(--text)]">oak_house.minepacker.zip</span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/[0.07] p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <code className="break-all text-[13.5px] font-bold text-[var(--green)]">
              /function <span className="text-[var(--gold)]">ubuilder</span>
              <span className="text-[var(--muted)]">:</span>
              <span className="text-[var(--teal)]">oak_house</span>
            </code>
            <span className="ml-auto">
              <CopyButton text="/function ubuilder:oak_house" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("template");

  const goTab = (t: Tab) => {
    setTab(t);
    document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative min-h-screen">
      <div className="bg-layers" />

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(10,14,10,0.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-pixel text-[12px] tracking-wider text-[var(--text)]">
              MINE<span className="text-[var(--green)]">PACKER</span>
            </span>
          </a>
          <span className="hidden rounded-full border border-[var(--line)] bg-black/25 px-2 py-0.5 font-mono text-[10px] text-[var(--muted)] sm:inline">
            v{FORGE_VERSION} · by {CREATOR}
          </span>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => goTab(id)} className="tab-pill">
                {label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => goTab("convert")}
            className="btn-pixel ml-auto rounded-lg bg-[var(--green)] px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0c130a] hover:brightness-105 md:ml-2"
          >
            convert
          </button>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <Reveal>
              <div className="kicker">
                <Logo size={16} />
                minecraft datapack converter
              </div>
              <h1 className="mt-5 text-[40px] font-bold leading-[1.08] tracking-tight sm:text-[52px]">
                <span className="glow-text">JSON in.</span>
                <br />
                Building placed.
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
                Follow the required template, paste your house or structure JSON, and download a{" "}
                <span className="font-mono text-[var(--gold)]">.minepacker.zip</span> datapack for any world.
                Merge more buildings into the same pack — every build gets its own{" "}
                <span className="font-mono text-[var(--green)]">/function</span> command, shown ready to copy.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => goTab("template")}
                  className="btn-pixel rounded-xl bg-[var(--green)] px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-[#0c130a] hover:brightness-105"
                >
                  get the template
                </button>
                <button
                  onClick={() => goTab("convert")}
                  className="btn-pixel rounded-xl border border-[var(--line-strong)] bg-[#141b11] px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-[#9fce82] hover:bg-[#1b2716]"
                >
                  convert a json
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-2 font-mono text-[10.5px] text-[var(--muted)]">
                {["100% in-browser", "no uploads", "Minecraft 26.2", "pack_format 107.1", "vanilla · no mods"].map((c) => (
                  <span key={c} className="rounded-full border border-[var(--line)] bg-black/20 px-2.5 py-1">
                    {c}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={180}>
            <HeroCard />
          </Reveal>
        </section>

        {/* console */}
        <section id="console" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="kicker">
                  <span className="pixel-sq bg-[var(--gold)]" />
                  the workshop
                </div>
                <h2 className="mt-3 text-[26px] font-bold tracking-tight text-[#eef3e2] sm:text-[30px]">
                  Template · Convert · Merge
                </h2>
              </div>
              <div className="flex gap-1.5 rounded-xl border border-[var(--line)] bg-black/25 p-1.5">
                {TABS.map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`tab-pill ${tab === id ? "active" : ""}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="pixel-border mt-8 p-4 sm:p-6">
              {tab === "template" && <TemplateTab />}
              {tab === "convert" && <ForgeTab onNeedTemplate={() => setTab("template")} />}
              {tab === "merge" && <MergeTab onNeedTemplate={() => setTab("template")} />}
            </div>
          </Reveal>
        </section>

        {/* footer */}
        <footer className="border-t border-[var(--line)] bg-black/20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="font-pixel text-[11px] tracking-wider text-[var(--text)]">
                MINE<span className="text-[var(--green)]">PACKER</span>
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)]">· created by {CREATOR}</span>
            </div>
            <p className="font-mono text-[10.5px] text-[var(--muted)]">
              install: drop the .minepacker.zip into world/datapacks · /reload · /function ns:build · not
              affiliated with Mojang
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
