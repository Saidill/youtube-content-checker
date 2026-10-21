"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { Navbar } from "@/components/Navbar";
import { ModelDropdown, ModelSidebar } from "@/components/ModelSelector";
import { VideoDetails } from "@/components/VideoDetails";
import { PredictionCard } from "@/components/PredictionCard";
import { ProfanityCard } from "@/components/ProfanityCard";
import { TextFeaturesCard } from "@/components/TextFeaturesCard";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/StatusViews";

export default function Home() {
  const [input, setInput] = useState("");
  const a = useAnalysis();

  const labelOf = (id: string) => a.models.find((m) => m.id === id)?.label ?? id;
  const selectorProps = {
    models: a.models,
    selectedModel: a.selectedModel,
    runningModel: a.analyzing ? a.selectedModel : a.switchingModel,
    predictions: a.predictions,
    disabled: a.busy,
    onSelect: (id: string) => a.selectModel(id, input),
  };

  return (
    <div className="min-h-screen bg-yt-dark flex flex-col">
      <Navbar
        input={input}
        onInputChange={setInput}
        onSubmit={() => a.analyze(input)}
        loading={a.analyzing}
      />

      <div className="flex-1 flex">
        <ModelSidebar {...selectorProps} />

        {/* ── Tengah: video + metadata ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <ModelDropdown {...selectorProps} />
          {a.error && <ErrorBanner message={a.error} />}
          {a.analyzing && <LoadingState />}
          {!a.analyzing && !a.result && !a.error && <EmptyState />}
          {a.result && <VideoDetails result={a.result} />}
        </div>

        {/* ── Kanan: panel hasil AI ── */}
        {a.result && (
          <div className="w-80 shrink-0 border-l border-yt-border overflow-y-auto scrollbar-hide p-3 space-y-3">
            <PredictionCard
              pred={a.result.prediction}
              modelLabel={labelOf(a.result.prediction.model_used)}
              runningLabel={a.switchingModel ? labelOf(a.switchingModel) : undefined}
            />

            {a.result.ai.category && (
              <div className="flex items-center gap-2 p-2.5 bg-yt-card rounded-lg border border-yt-border">
                <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Kategori Konten</p>
                  <p className="text-sm text-white font-semibold">{a.result.ai.category}</p>
                </div>
              </div>
            )}

            {/* Ringkasan AI — sementara dinonaktifkan
            <AiSection
              icon={<FileText className="w-4 h-4 text-blue-400" />}
              title="Ringkasan AI"
              content={a.result.ai.summary}
              color="border-blue-500/30"
            /> */}

            <ProfanityCard data={a.result.profanity} />
            <TextFeaturesCard data={a.result.text_features} />
          </div>
        )}
      </div>
    </div>
  );
}
