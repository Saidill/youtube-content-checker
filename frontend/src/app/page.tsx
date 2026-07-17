"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Youtube,
  Shield,
  ChevronDown,
  Loader2,
  ThumbsUp,
  Eye,
  MessageCircle,
  Tag,
  AlertTriangle,
  CheckCircle,
  Bot,
  FileText,
  BarChart3,
  AlertCircle,
  TrendingUp,
  Link,
} from "lucide-react";
import {
  fetchModels,
  analyzeVideo,
  predictOnly,
  extractVideoId,
  ModelInfo,
  AnalysisResult,
  ProfanityResult,
  TextFeatures,
} from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────
function formatNumber(n: string): string {
  const num = parseInt(n || "0");
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "Jt";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "Rb";
  return n;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days / 365)} tahun lalu`;
  if (days > 30) return `${Math.floor(days / 30)} bulan lalu`;
  if (days > 0) return `${days} hari lalu`;
  return "Hari ini";
}

// ── Sub-components ─────────────────────────────────────────────────────
function ProbabilityBar({ prob, label }: { prob: number; label: number }) {
  const pct = Math.round(prob * 100);
  const safe = Math.round((1 - prob) * 100);
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

// ── ModelCard: model name row + result badge on second row ──
function ModelCard({
  model,
  selected,
  loading,
  onSelect,
  predProb,
}: {
  model: ModelInfo;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
  predProb?: number | null; // raw P(inappropriate) 0–1, null if not yet run
}) {
  const isInappropriate = predProb != null && predProb >= 0.5;
  const confidencePct =
    predProb != null
      ? isInappropriate
        ? predProb * 100
        : (1 - predProb) * 100
      : null;

  return (
    <button
      onClick={onSelect}
      disabled={loading}
      className={`w-full text-left p-3 rounded-lg border transition-all disabled:opacity-60 ${
        selected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-yt-card hover:border-gray-500"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        {/* Row 1: dot indicator + model name */}
        <div className="flex items-center gap-2">
          {loading && selected ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          ) : selected ? (
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />
          )}
          <p
            className={`text-sm font-semibold ${selected ? "text-blue-400" : "text-white"}`}
          >
            {model.label}
          </p>
        </div>

        {/* Row 2: result badge, indented to align with model name */}
        {loading && selected ? (
          <p className="text-xs text-gray-500 pl-4 font-mono">Menganalisis…</p>
        ) : confidencePct != null ? (
          <div
            className={`flex items-center gap-1 pl-4 w-fit text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full border ${
              isInappropriate
                ? "bg-red-500/15 border-red-500/30 text-red-300"
                : "bg-green-500/15 border-green-500/30 text-green-300"
            }`}
          >
            {isInappropriate ? (
              <AlertTriangle className="w-3 h-3 shrink-0" />
            ) : (
              <CheckCircle className="w-3 h-3 shrink-0" />
            )}
            <span>{isInappropriate ? "Inappropriate" : "Appropriate"}</span>
            <span className="opacity-50">·</span>
            <span>{confidencePct.toFixed(1)}%</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function AiSection({
  icon,
  title,
  content,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border ${color} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

function ProfanityCard({ data }: { data: ProfanityResult }) {
  const [open, setOpen] = useState(true);

  const sevConfig = {
    clean: {
      border: "border-green-500/30",
      bg: "bg-green-500/5",
      text: "text-green-400",
      label: "Bersih",
      dot: "bg-green-400",
    },
    mild: {
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/5",
      text: "text-yellow-400",
      label: "Ringan",
      dot: "bg-yellow-400",
    },
    moderate: {
      border: "border-orange-500/30",
      bg: "bg-orange-500/5",
      text: "text-orange-400",
      label: "Sedang",
      dot: "bg-orange-400",
    },
    severe: {
      border: "border-red-500/30",
      bg: "bg-red-500/5",
      text: "text-red-400",
      label: "Berat",
      dot: "bg-red-400",
    },
  }[data.severity];

  const renderHighlighted = (sentence: string) => {
    const parts = sentence.split(/(\[\[PROFANE:[^\]]+\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[\[PROFANE:([^\]]+)\]\]/);
      if (match) {
        return (
          <mark
            key={i}
            className="bg-red-500/30 text-red-200 px-0.5 rounded font-semibold not-italic"
          >
            {match[1]}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className={`rounded-lg border overflow-hidden ${sevConfig.border} ${sevConfig.bg}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className={`w-4 h-4 ${sevConfig.text}`} />
          <span className="text-sm font-semibold text-white">
            Kata Tidak Pantas
          </span>
          <span
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sevConfig.text} bg-white/10`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
            {sevConfig.label}
            {data.count > 0 && (
              <span className="ml-1">({data.count}x ditemukan)</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {data.severity === "clean" ? (
            <div className="flex items-center gap-2 text-xs text-green-300 bg-green-500/10 rounded-lg p-2.5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Tidak ditemukan kata tidak pantas dalam konten ini.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                  Kata terdeteksi ({data.found.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.found.map((word) => (
                    <div
                      key={word}
                      className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-lg px-2 py-1"
                    >
                      <span className="text-xs font-mono font-bold text-red-300">
                        {word}
                      </span>
                      <span className="text-xs text-red-400/70 bg-red-500/20 rounded px-1">
                        {data.frequency[word]}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {data.sentences.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                    Konteks ditemukan:
                  </p>
                  <div className="space-y-1.5">
                    {data.sentences.map((sent, i) => (
                      <div
                        key={i}
                        className="bg-black/30 rounded-lg p-2.5 border border-white/5"
                      >
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {renderHighlighted(sent)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TextFeaturesCard({ data }: { data: TextFeatures }) {
  const [open, setOpen] = useState(true);
  const riskColor = {
    rendah: "text-green-400",
    sedang: "text-yellow-400",
    tinggi: "text-red-400",
  }[data.risk_level];
  const sentColor =
    (
      {
        positive: "text-green-400",
        negative: "text-red-400",
        mixed: "text-yellow-400",
        neutral: "text-gray-400",
      } as Record<string, string>
    )[data.comment_sentiment] || "text-gray-400";
  const catColors: Record<string, string> = {
    kekerasan: "bg-red-500/20 text-red-300",
    dewasa: "bg-pink-500/20 text-pink-300",
    judi: "bg-yellow-500/20 text-yellow-300",
    penipuan: "bg-orange-500/20 text-orange-300",
    narkoba: "bg-purple-500/20 text-purple-300",
    clickbait: "bg-blue-500/20 text-blue-300",
  };

  return (
    <div className="rounded-lg border border-purple-500/30 overflow-hidden bg-purple-500/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Analisis Konten</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${riskColor} bg-white/10`}
          >
            Risiko {data.risk_level}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          {Object.keys(data.detected_categories).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5 font-semibold">
                Kategori terdeteksi:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.detected_categories).map(
                  ([cat, words]) => (
                    <div
                      key={cat}
                      className={`text-xs px-2 py-1 rounded-lg ${catColors[cat] || "bg-gray-500/20 text-gray-300"}`}
                    >
                      <span className="font-semibold capitalize">{cat}</span>
                      <span className="opacity-70 ml-1">
                        ({words.slice(0, 2).join(", ")})
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Sentimen komentar",
                value: data.comment_sentiment,
                color: sentColor,
              },
              {
                label: "Rasio pos/neg",
                value: data.pos_neg_ratio,
                color: "text-gray-300",
              },
              {
                label: "Jumlah kata",
                value: data.word_count.toLocaleString(),
                color: "text-gray-300",
              },
              {
                label: "Emoji di judul",
                value: String(data.emoji_count),
                color: "text-gray-300",
              },
            ].map((item) => (
              <div key={item.label} className="bg-black/20 rounded-lg p-2">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-xs font-semibold mt-0.5 ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {data.is_clickbait_title && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-300 bg-yellow-500/10 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3" /> Judul terindikasi
                clickbait
              </div>
            )}
            {data.has_suspicious_url && (
              <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-500/10 rounded px-2 py-1">
                <Link className="w-3 h-3" /> Banyak URL mencurigakan (
                {data.url_count})
              </div>
            )}
            {Object.keys(data.detected_categories).length === 0 &&
              !data.is_clickbait_title &&
              !data.has_suspicious_url && (
                <div className="flex items-center gap-1.5 text-xs text-green-300 bg-green-500/10 rounded px-2 py-1">
                  <CheckCircle className="w-3 h-3" /> Tidak ada sinyal konten
                  berbahaya
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingModel, setLoadingModel] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [modelsOpen, setModelsOpen] = useState(false);
  // raw P(inappropriate) per model id, populated as each model is run
  const [allPredictions, setAllPredictions] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        if (m.length > 0) setSelectedModel(m[0].id);
      })
      .catch(() => {
        const fallback: ModelInfo[] = [
          {
            id: "bilstm_headtail_content_moderation",
            label: "biLSTM",
            description: "Bidirectional LSTM baseline",
            accuracy: "87.19%",
            f1: "0.8700",
          },
          {
            id: "cnn_bilstm_content_moderation",
            label: "CNN-biLSTM",
            description: "CNN + biLSTM — akurasi tertinggi",
            accuracy: "88.18%",
            f1: "0.8786",
          },
          {
            id: "bilstm_attention_content_moderation",
            label: "biLSTM-Attention",
            description: "biLSTM + Attention — AUC tertinggi",
            accuracy: "87.78%",
            f1: "0.8751",
          },
          {
            id: "cnn_bilstm_attention",
            label: "CNN-biLSTM-Attention",
            description: "CNN + biLSTM + Attention",
            accuracy: "87.73%",
            f1: "0.8745",
          },
        ];
        setModels(fallback);
        setSelectedModel(fallback[0].id);
      });
  }, []);

  const analyzeWithModel = async (modelId: string) => {
    const videoId = extractVideoId(input.trim());
    if (!videoId) {
      setError("URL atau Video ID tidak valid");
      return;
    }
    setError("");
    setLoading(true);
    setLoadingModel(modelId);
    setSelectedModel(modelId);

    try {
      const isSameVideo = result && result.video.id === videoId;

      if (isSameVideo && result.combined_text) {
        // Same video — only re-run prediction, skip Gemini
        const newPrediction = await predictOnly(
          videoId,
          modelId,
          result.combined_text,
        );
        setResult((prev) =>
          prev ? { ...prev, prediction: newPrediction } : null,
        );
        setAllPredictions((prev) => ({
          ...prev,
          [modelId]: newPrediction.probability,
        }));
      } else {
        // New video — full pipeline
        setResult(null);
        setAllPredictions({});
        const res = await analyzeVideo(videoId, modelId);
        setResult(res);
        setAllPredictions({ [modelId]: res.prediction.probability });
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          "Gagal menganalisis video. Pastikan backend berjalan.",
      );
    } finally {
      setLoading(false);
      setLoadingModel("");
    }
  };

  const handleAnalyze = () => analyzeWithModel(selectedModel);

  const selectedModelInfo = models.find((m) => m.id === selectedModel);
  const pred = result?.prediction;

  return (
    <div className="min-h-screen bg-yt-dark flex flex-col">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-yt-dark border-b border-yt-border flex items-center px-4 py-2 gap-4">
        <div className="flex items-center gap-1.5">
          <Youtube className="w-7 h-7 text-yt-red" />
          <span className="text-white font-bold text-lg hidden sm:block">
            Content
          </span>
          <span className="text-yt-red font-bold text-lg hidden sm:block">
            Checker
          </span>
        </div>

        <div className="flex-1 max-w-2xl mx-auto flex gap-2">
          <div className="flex-1 flex items-center bg-yt-card border border-yt-border rounded-full px-4 gap-2 focus-within:border-blue-500 transition-colors">
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none py-2"
              placeholder="Paste URL YouTube atau Video ID..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !input.trim()}
            className="bg-yt-card border border-yt-border hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full p-2.5 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Search className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:block">AI Safety</span>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="flex-1 flex gap-0">
        {/* ── Left sidebar: Model Selector ── */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-yt-border p-3 gap-2 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
            Pilih Model AI
          </p>
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              selected={selectedModel === m.id}
              loading={loadingModel === m.id}
              predProb={result ? (allPredictions[m.id] ?? null) : null}
              onSelect={() =>
                result ? analyzeWithModel(m.id) : setSelectedModel(m.id)
              }
            />
          ))}
          <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-300 font-semibold mb-1">
              Tentang Model
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Model ditraining dengan 40.044 video YouTube untuk mendeteksi
              konten yang tidak layak untuk anak-anak.
            </p>
          </div>
        </div>

        {/* ── Center: Video + metadata ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Mobile model selector */}
          <div className="lg:hidden p-3 border-b border-yt-border">
            <button
              onClick={() => setModelsOpen(!modelsOpen)}
              className="flex items-center justify-between w-full p-2 bg-yt-card rounded-lg border border-yt-border"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">
                  {selectedModelInfo?.label || "Pilih Model"}
                </span>
                {/* Show active model result inline on the trigger */}
                {result &&
                  allPredictions[selectedModel] != null &&
                  (() => {
                    const p = allPredictions[selectedModel];
                    const inappropriate = p >= 0.5;
                    const conf = (inappropriate ? p : 1 - p) * 100;
                    return (
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold tabular-nums ${
                          inappropriate
                            ? "bg-red-500/15 border-red-500/30 text-red-300"
                            : "bg-green-500/15 border-green-500/30 text-green-300"
                        }`}
                      >
                        {inappropriate ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {inappropriate ? "Inappropriate" : "Appropriate"}
                        <span className="opacity-60">·</span>
                        {conf.toFixed(1)}%
                      </span>
                    );
                  })()}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${modelsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {modelsOpen && (
              <div className="mt-2 space-y-2">
                {models.map((m) => (
                  <ModelCard
                    key={m.id}
                    model={m}
                    selected={selectedModel === m.id}
                    loading={loadingModel === m.id}
                    predProb={result ? (allPredictions[m.id] ?? null) : null}
                    onSelect={() => {
                      result ? analyzeWithModel(m.id) : setSelectedModel(m.id);
                      setModelsOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                <Bot className="w-5 h-5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Menganalisis video...</p>
                <p className="text-gray-400 text-sm mt-1">
                  Mengambil data YouTube & menjalankan model AI
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
              <div className="w-20 h-20 rounded-full bg-yt-card border border-yt-border flex items-center justify-center">
                <Youtube className="w-10 h-10 text-yt-red" />
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-xl font-bold text-white mb-2">
                  YouTube Content Checker
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Paste URL atau Video ID YouTube di atas, lalu pilih model AI
                  untuk menganalisis apakah konten aman untuk anak-anak.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm w-full mt-2">
                {[
                  {
                    icon: <Shield className="w-4 h-4 text-green-400" />,
                    text: "Deteksi Konten",
                  },
                  {
                    icon: <FileText className="w-4 h-4 text-blue-400" />,
                    text: "AI Summary",
                  },
                  {
                    icon: <AlertCircle className="w-4 h-4 text-red-400" />,
                    text: "Kata Kasar",
                  },
                  {
                    icon: <BarChart3 className="w-4 h-4 text-purple-400" />,
                    text: "Model Comparison",
                  },
                ].map((f) => (
                  <div
                    key={f.text}
                    className="flex items-center gap-2 p-3 bg-yt-card rounded-lg border border-yt-border"
                  >
                    {f.icon}
                    <span className="text-xs text-gray-300">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="p-4 space-y-4 max-w-3xl">
              {/* Video Player */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={result.video.embed_url}
                  title={result.video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div
                  className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm pointer-events-none ${
                    pred?.label === 1
                      ? "bg-red-500/80 text-white"
                      : "bg-green-500/80 text-white"
                  }`}
                >
                  {pred?.label === 1 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Inappropriate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Appropriate
                    </>
                  )}
                </div>
              </div>

              {/* Title & meta */}
              <div>
                <h1 className="text-base font-bold text-white leading-snug">
                  {result.video.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="text-gray-300 font-medium">
                    {result.video.channel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {formatNumber(result.video.view_count)} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {formatNumber(result.video.like_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {formatNumber(result.video.comment_count)}
                  </span>
                  <span>{timeAgo(result.video.published)}</span>
                </div>
              </div>

              {/* Tags */}
              {result.video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.video.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 bg-yt-card border border-yt-border rounded-full text-gray-300"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {result.video.description && (
                <div className="p-3 bg-yt-card rounded-lg border border-yt-border">
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                    {result.video.description}
                  </p>
                </div>
              )}

              {/* Comments */}
              {result.comments_preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Top Comments
                  </p>
                  <div className="space-y-2">
                    {result.comments_preview.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-yt-card rounded-lg border border-yt-border"
                      >
                        <p
                          className="text-xs text-gray-300 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: c }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript info */}
              {result.video.transcript_info && (
                <div className="p-3 bg-yt-card rounded-lg border border-yt-border">
                  <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Transcript
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {result.video.transcript_info}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: AI Panel ── */}
        {result && !loading && (
          <div className="w-80 shrink-0 border-l border-yt-border overflow-y-auto scrollbar-hide p-3 space-y-3">
            {/* Prediction Card */}
            <div
              className={`rounded-xl border-2 p-4 relative overflow-hidden ${
                pred?.label === 1
                  ? "border-red-500/50 bg-red-500/5"
                  : "border-green-500/50 bg-green-500/5"
              }`}
            >
              {loading && (
                <div className="absolute inset-0 bg-yt-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-xl">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <p className="text-xs text-blue-300 font-medium">
                    Menjalankan{" "}
                    {models.find((m) => m.id === loadingModel)?.label}...
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield
                    className={`w-5 h-5 ${pred?.label === 1 ? "text-red-400" : "text-green-400"}`}
                  />
                  <span className="text-sm font-bold text-white">
                    Hasil Deteksi
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    pred?.label === 1
                      ? "bg-red-500/20 text-red-300"
                      : "bg-green-500/20 text-green-300"
                  }`}
                >
                  {pred?.label_text}
                </span>
              </div>

              <ProbabilityBar
                prob={pred?.probability ?? 0}
                label={pred?.label ?? 0}
              />

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-yt-dark/50 rounded-lg p-2">
                  <p className="text-gray-400">Probabilitas</p>
                  <p className="text-white font-bold text-base mt-0.5">
                    {((pred?.probability ?? 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-yt-dark/50 rounded-lg p-2">
                  <p className="text-gray-400">Confidence</p>
                  <p className="text-white font-bold text-base mt-0.5">
                    {pred?.confidence_label}
                  </p>
                </div>
              </div>

              <div className="mt-2 p-2 bg-yt-dark/50 rounded-lg">
                <p className="text-xs text-gray-400">Model digunakan</p>
                <p className="text-xs text-blue-300 font-medium mt-0.5">
                  {selectedModelInfo?.label}
                </p>
              </div>
            </div>

            {/* Category badge */}
            {result.ai.category && (
              <div className="flex items-center gap-2 p-2.5 bg-yt-card rounded-lg border border-yt-border">
                <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Kategori Konten</p>
                  <p className="text-sm text-white font-semibold">
                    {result.ai.category}
                  </p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            <AiSection
              icon={<FileText className="w-4 h-4 text-blue-400" />}
              title="Ringkasan AI"
              content={result.ai.summary}
              color="border-blue-500/30"
            />

            {/* Profanity Detection */}
            {result.profanity && <ProfanityCard data={result.profanity} />}

            {/* Text Features */}
            {result.text_features && (
              <TextFeaturesCard data={result.text_features} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
