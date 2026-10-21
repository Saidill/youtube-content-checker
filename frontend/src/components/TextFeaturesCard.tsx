import { AlertTriangle, CheckCircle, Link, TrendingUp } from "lucide-react";
import { TextFeatures } from "@/lib/api";
import { CollapsibleCard } from "./CollapsibleCard";

const RISK_COLOR = {
  rendah: "text-green-400",
  sedang: "text-yellow-400",
  tinggi: "text-red-400",
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-green-400",
  negative: "text-red-400",
  mixed: "text-yellow-400",
  neutral: "text-gray-400",
};

const CATEGORY_COLOR: Record<string, string> = {
  kekerasan: "bg-red-500/20 text-red-300",
  dewasa: "bg-pink-500/20 text-pink-300",
  judi: "bg-yellow-500/20 text-yellow-300",
  penipuan: "bg-orange-500/20 text-orange-300",
  narkoba: "bg-purple-500/20 text-purple-300",
  horor: "bg-slate-500/20 text-slate-300",
  clickbait: "bg-blue-500/20 text-blue-300",
};

export function TextFeaturesCard({ data }: { data: TextFeatures }) {
  const categories = Object.entries(data.detected_categories);
  const stats = [
    { label: "Sentimen komentar", value: data.comment_sentiment, color: SENTIMENT_COLOR[data.comment_sentiment] || "text-gray-400" },
    { label: "Rasio pos/neg", value: data.pos_neg_ratio, color: "text-gray-300" },
    { label: "Jumlah kata", value: data.word_count.toLocaleString(), color: "text-gray-300" },
    { label: "Emoji di judul", value: String(data.emoji_count), color: "text-gray-300" },
  ];

  return (
    <CollapsibleCard
      className="border-purple-500/30 bg-purple-500/5"
      header={
        <>
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Analisis Konten</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RISK_COLOR[data.risk_level]} bg-white/10`}
          >
            Risiko {data.risk_level}
          </span>
        </>
      }
    >
      {categories.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-semibold">Kategori terdeteksi:</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(([cat, words]) => (
              <div
                key={cat}
                className={`text-xs px-2 py-1 rounded-lg ${CATEGORY_COLOR[cat] || "bg-gray-500/20 text-gray-300"}`}
              >
                <span className="font-semibold capitalize">{cat}</span>
                <span className="opacity-70 ml-1">({words.slice(0, 2).join(", ")})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {stats.map((item) => (
          <div key={item.label} className="bg-black/20 rounded-lg p-2">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className={`text-xs font-semibold mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {data.is_clickbait_title && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-300 bg-yellow-500/10 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3" /> Judul terindikasi clickbait
          </div>
        )}
        {data.has_suspicious_url && (
          <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-500/10 rounded px-2 py-1">
            <Link className="w-3 h-3" /> Banyak URL mencurigakan ({data.url_count})
          </div>
        )}
        {categories.length === 0 && !data.is_clickbait_title && !data.has_suspicious_url && (
          <div className="flex items-center gap-1.5 text-xs text-green-300 bg-green-500/10 rounded px-2 py-1">
            <CheckCircle className="w-3 h-3" /> Tidak ada sinyal konten berbahaya
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
