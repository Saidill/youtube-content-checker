"use client";

import { useEffect, useState } from "react";
import {
  analyzeVideo,
  errorMessage,
  extractVideoId,
  fetchModels,
  predictOnly,
  AnalysisResult,
  ModelInfo,
} from "@/lib/api";

/**
 * Semua state & alur analisis ada di sini, supaya page.tsx hanya urusan tampilan.
 *
 * - Video baru            → pipeline penuh (/analyze): YouTube + model + Gemini
 * - Video sama, ganti model → hanya prediksi ulang (/predict-only), hasil lain tetap tampil
 *   sehingga perbandingan antar model cepat dan halaman tidak "berkedip"
 */
export function useAnalysis() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // P(inappropriate) per model id, terisi setiap model dijalankan
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false); // pipeline penuh
  const [switchingModel, setSwitchingModel] = useState(""); // id model yang sedang dijalankan ulang
  const [error, setError] = useState("");

  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        if (m.length > 0) setSelectedModel(m[0].id);
        else setError("Tidak ada model di backend/models.");
      })
      .catch(() =>
        setError("Backend tidak dapat dihubungi. Pastikan backend berjalan."),
      );
  }, []);

  const analyze = async (input: string, modelId = selectedModel) => {
    const videoId = extractVideoId(input.trim());
    if (!videoId) {
      setError("URL atau Video ID tidak valid");
      return;
    }
    setError("");
    setSelectedModel(modelId);
    setAnalyzing(true);
    setResult(null);
    setPredictions({});
    try {
      const res = await analyzeVideo(videoId, modelId);
      setResult(res);
      setPredictions({ [modelId]: res.prediction.probability });
    } catch (e) {
      setError(errorMessage(e, "Gagal menganalisis video. Pastikan backend berjalan."));
    } finally {
      setAnalyzing(false);
    }
  };

  const selectModel = async (modelId: string, input: string) => {
    if (!result) {
      setSelectedModel(modelId);
      return;
    }
    // Input sudah diganti ke video lain → jalankan pipeline penuh
    const videoId = extractVideoId(input.trim());
    if (videoId && videoId !== result.video.id) return analyze(input, modelId);

    setError("");
    setSelectedModel(modelId);
    setSwitchingModel(modelId);
    try {
      const prediction = await predictOnly(modelId, result.combined_text);
      setResult((prev) => (prev ? { ...prev, prediction } : prev));
      setPredictions((prev) => ({ ...prev, [modelId]: prediction.probability }));
    } catch (e) {
      setError(errorMessage(e, "Gagal menjalankan model."));
    } finally {
      setSwitchingModel("");
    }
  };

  return {
    models,
    selectedModel,
    result,
    predictions,
    analyzing,
    switchingModel,
    busy: analyzing || switchingModel !== "",
    error,
    analyze,
    selectModel,
  };
}
