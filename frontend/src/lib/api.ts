import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
})

export function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}

/** Ambil pesan error dari response FastAPI ({ detail }), atau fallback. */
export function errorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e) && typeof e.response?.data?.detail === 'string') {
    return e.response.data.detail
  }
  return fallback
}

export async function fetchModels() {
  const { data } = await api.get('/models')
  return data.models as ModelInfo[]
}

export async function analyzeVideo(videoId: string, modelName: string) {
  const { data } = await api.post('/analyze', { video_id: videoId, model_name: modelName })
  return data as AnalysisResult
}

export async function predictOnly(modelName: string, combinedText: string) {
  const { data } = await api.post('/predict-only', {
    model_name: modelName,
    combined_text: combinedText,
  })
  return data as Prediction
}

export interface ModelInfo {
  id: string
  label: string
  description: string
  accuracy: string
  f1: string
}

export interface Prediction {
  label: number
  label_text: string
  probability: number
  confidence: number
  confidence_label: string
  model_used: string
}

export interface ProfanityResult {
  found: string[]
  frequency: Record<string, number>
  count: number
  severity: 'clean' | 'mild' | 'moderate' | 'severe'
  sentences: string[]
  highlighted_text: string
  flagged_ambiguous: string[]
}

export interface TextFeatures {
  word_count: number
  detected_categories: Record<string, string[]>
  has_suspicious_url: boolean
  url_count: number
  is_clickbait_title: boolean
  caps_ratio: number
  emoji_count: number
  comment_sentiment: string
  pos_neg_ratio: string
  risk_score: number
  risk_level: 'rendah' | 'sedang' | 'tinggi'
}

export interface AnalysisResult {
  video: {
    id: string
    title: string
    channel: string
    thumbnail: string
    published: string
    view_count: string
    like_count: string
    comment_count: string
    description: string
    tags: string[]
    embed_url: string
    watch_url: string
    transcript_info: string
    transcript_method: 'youtube-transcript-api' | 'yt-dlp' | 'none'
    has_transcript: boolean
  }
  prediction: Prediction
  profanity: ProfanityResult
  text_features: TextFeatures
  ai: {
    summary: string
    child_analysis: string
    category: string
    from_cache: boolean
  }
  comments_preview: string[]
  combined_text: string
}
