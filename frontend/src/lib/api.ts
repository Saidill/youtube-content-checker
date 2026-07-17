import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}

export async function fetchModels() {
  const { data } = await api.get('/models')
  return data.models as ModelInfo[]
}

export async function analyzeVideo(videoId: string, modelName: string) {
  const { data } = await api.post('/analyze', { video_id: videoId, model_name: modelName })
  return data as AnalysisResult
}

export async function predictOnly(videoId: string, modelName: string, combinedText: string) {
  const { data } = await api.post('/predict-only', {
    video_id: videoId,
    model_name: modelName,
    combined_text: combinedText,
  })
  return data as AnalysisResult['prediction']
}

export interface ModelInfo {
  id: string
  label: string
  description: string
  accuracy: string
  f1: string
}

export interface ProfanityResult {
  found: string[]
  frequency: Record<string, number>
  count: number
  severity: 'clean' | 'mild' | 'moderate' | 'severe'
  sentences: string[]
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
    has_transcript: boolean
  }
  prediction: {
    label: number
    label_text: string
    probability: number
    confidence: number
    confidence_label: string
    model_used: string
    source: string
  }
  profanity:     ProfanityResult
  text_features: TextFeatures
  ai: {
    summary: string
    child_analysis: string
    category: string
    from_cache: boolean
  }
  comments_preview: string[]
  transcript_info: string
  combined_text: string
}