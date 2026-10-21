import { AlertCircle, CheckCircle } from "lucide-react";
import { ProfanityResult } from "@/lib/api";
import { CollapsibleCard } from "./CollapsibleCard";

const SEVERITY = {
  clean:    { box: "border-green-500/30 bg-green-500/5",   text: "text-green-400",  dot: "bg-green-400",  label: "Bersih" },
  mild:     { box: "border-yellow-500/30 bg-yellow-500/5", text: "text-yellow-400", dot: "bg-yellow-400", label: "Ringan" },
  moderate: { box: "border-orange-500/30 bg-orange-500/5", text: "text-orange-400", dot: "bg-orange-400", label: "Sedang" },
  severe:   { box: "border-red-500/30 bg-red-500/5",       text: "text-red-400",    dot: "bg-red-400",    label: "Berat" },
};

/** Backend menandai kata kasar dengan [[PROFANE:kata]] — ubah jadi <mark>. */
function renderHighlighted(sentence: string) {
  return sentence.split(/(\[\[PROFANE:[^\]]+\]\])/g).map((part, i) => {
    const match = part.match(/\[\[PROFANE:([^\]]+)\]\]/);
    return match ? (
      <mark key={i} className="bg-red-500/30 text-red-200 px-0.5 rounded font-semibold not-italic">
        {match[1]}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">{children}</p>
  );
}

export function ProfanityCard({ data }: { data: ProfanityResult }) {
  const sev = SEVERITY[data.severity];

  return (
    <CollapsibleCard
      className={sev.box}
      header={
        <>
          <AlertCircle className={`w-4 h-4 ${sev.text}`} />
          <span className="text-sm font-semibold text-white">Kata Tidak Pantas</span>
          <span
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sev.text} bg-white/10`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
            {sev.label}
            {data.count > 0 && <span className="ml-1">({data.count}x ditemukan)</span>}
          </span>
        </>
      }
    >
      {data.severity === "clean" ? (
        <div className="flex items-center gap-2 text-xs text-green-300 bg-green-500/10 rounded-lg p-2.5">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Tidak ditemukan kata tidak pantas dalam konten ini.
        </div>
      ) : (
        <>
          <div>
            <SectionLabel>Kata terdeteksi ({data.found.length}):</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {data.found.map((word) => (
                <div
                  key={word}
                  className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-lg px-2 py-1"
                >
                  <span className="text-xs font-mono font-bold text-red-300">{word}</span>
                  <span className="text-xs text-red-400/70 bg-red-500/20 rounded px-1">
                    {data.frequency[word]}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {data.sentences.length > 0 && (
            <div>
              <SectionLabel>Konteks ditemukan:</SectionLabel>
              <div className="space-y-1.5">
                {data.sentences.map((sent, i) => (
                  <div key={i} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                    <p className="text-xs text-gray-300 leading-relaxed">{renderHighlighted(sent)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </CollapsibleCard>
  );
}
