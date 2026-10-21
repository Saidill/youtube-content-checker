"use client";

import { useState } from "react";
import { Bot, ChevronDown, Loader2 } from "lucide-react";
import { ModelInfo } from "@/lib/api";
import { VerdictBadge } from "./VerdictBadge";

interface Props {
  models: ModelInfo[];
  selectedModel: string;
  runningModel: string; // id model yang sedang dijalankan, "" kalau tidak ada
  predictions: Record<string, number>;
  disabled: boolean;
  onSelect: (modelId: string) => void;
}

function ModelCard({
  model,
  selected,
  running,
  prob,
  disabled,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  running: boolean;
  prob: number | undefined;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left p-3 rounded-lg border transition-all disabled:opacity-60 ${
        selected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-yt-card hover:border-gray-500"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {running ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          ) : (
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${selected ? "bg-blue-500" : "bg-gray-600"}`}
            />
          )}
          <p className={`text-sm font-semibold ${selected ? "text-blue-400" : "text-white"}`}>
            {model.label}
          </p>
        </div>

        <div className="pl-4">
          {running ? (
            <p className="text-xs text-gray-500 font-mono">Menganalisis…</p>
          ) : prob != null ? (
            <VerdictBadge prob={prob} />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ModelList(props: Props & { onAfterSelect?: () => void }) {
  return (
    <>
      {props.models.map((m) => (
        <ModelCard
          key={m.id}
          model={m}
          selected={props.selectedModel === m.id}
          running={props.runningModel === m.id}
          prob={props.predictions[m.id]}
          disabled={props.disabled}
          onSelect={() => {
            props.onSelect(m.id);
            props.onAfterSelect?.();
          }}
        />
      ))}
    </>
  );
}

/** Sidebar kiri (desktop). */
export function ModelSidebar(props: Props) {
  return (
    <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-yt-border p-3 gap-2 overflow-y-auto">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
        Pilih Model AI
      </p>
      <ModelList {...props} />
      <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-300 font-semibold mb-1">Tentang Model</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Model ditraining dengan 40.044 video YouTube untuk mendeteksi konten
          yang tidak layak untuk anak-anak.
        </p>
      </div>
    </div>
  );
}

/** Dropdown (mobile). */
export function ModelDropdown(props: Props) {
  const [open, setOpen] = useState(false);
  const selected = props.models.find((m) => m.id === props.selectedModel);
  const prob = props.predictions[props.selectedModel];

  return (
    <div className="lg:hidden p-3 border-b border-yt-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-2 bg-yt-card rounded-lg border border-yt-border"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-white">{selected?.label || "Pilih Model"}</span>
          {prob != null && <VerdictBadge prob={prob} />}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <ModelList {...props} onAfterSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
