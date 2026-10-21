import { Loader2, Shield } from "lucide-react";
import { Prediction } from "@/lib/api";

function ProbabilityBar({ prob, label }: { prob: number; label: number }) {
  const pct = Math.round(prob * 100);
  const safe = 100 - pct;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Appropriate {safe}%</span>
        <span>Inappropriate {pct}%</span>
      </div>
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${label === 1 ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${label === 1 ? pct : safe}%` }}
        />
      </div>
    </div>
  );
}

export function PredictionCard({
  pred,
  modelLabel,
  runningLabel,
}: {
  pred: Prediction;
  modelLabel: string;
  runningLabel?: string; // diisi saat model lain sedang dijalankan ulang
}) {
  const bad = pred.label === 1;
  return (
    <div
      className={`rounded-xl border-2 p-4 relative overflow-hidden ${
        bad ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"
      }`}
    >
      {runningLabel && (
        <div className="absolute inset-0 bg-yt-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <p className="text-xs text-blue-300 font-medium">Menjalankan {runningLabel}...</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${bad ? "text-red-400" : "text-green-400"}`} />
          <span className="text-sm font-bold text-white">Hasil Deteksi</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            bad ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"
          }`}
        >
          {pred.label_text}
        </span>
      </div>

      <ProbabilityBar prob={pred.probability} label={pred.label} />

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-yt-dark/50 rounded-lg p-2">
          <p className="text-gray-400">Probabilitas</p>
          <p className="text-white font-bold text-base mt-0.5">
            {(pred.probability * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-yt-dark/50 rounded-lg p-2">
          <p className="text-gray-400">Confidence</p>
          <p className="text-white font-bold text-base mt-0.5">{pred.confidence_label}</p>
        </div>
      </div>

      <div className="mt-2 p-2 bg-yt-dark/50 rounded-lg">
        <p className="text-xs text-gray-400">Model digunakan</p>
        <p className="text-xs text-blue-300 font-medium mt-0.5">{modelLabel}</p>
      </div>
    </div>
  );
}
