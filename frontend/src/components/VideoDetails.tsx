import { AlertTriangle, CheckCircle, Eye, FileText, MessageCircle, Tag, ThumbsUp } from "lucide-react";
import { AnalysisResult } from "@/lib/api";
import { formatNumber, timeAgo } from "@/lib/format";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
      {children}
    </p>
  );
}

/** Kolom tengah: player + metadata video. */
export function VideoDetails({ result }: { result: AnalysisResult }) {
  const { video, prediction, comments_preview } = result;
  const bad = prediction.label === 1;

  return (
    <div className="p-4 space-y-4 max-w-3xl">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={video.embed_url}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm pointer-events-none text-white ${
            bad ? "bg-red-500/80" : "bg-green-500/80"
          }`}
        >
          {bad ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          {prediction.label_text}
        </div>
      </div>

      <div>
        <h1 className="text-base font-bold text-white leading-snug">{video.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="text-gray-300 font-medium">{video.channel}</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(video.view_count)} views
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            {formatNumber(video.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {formatNumber(video.comment_count)}
          </span>
          <span>{timeAgo(video.published)}</span>
        </div>
      </div>

      {video.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {video.tags.slice(0, 8).map((tag) => (
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

      {video.description && (
        <div className="p-3 bg-yt-card rounded-lg border border-yt-border">
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{video.description}</p>
        </div>
      )}

      {comments_preview.length > 0 && (
        <div>
          <SectionLabel>Top Comments</SectionLabel>
          <div className="space-y-2">
            {comments_preview.slice(0, 3).map((c, i) => (
              <div key={i} className="p-2.5 bg-yt-card rounded-lg border border-yt-border">
                {/* plain text dari backend (textOriginal) — tidak perlu dangerouslySetInnerHTML */}
                <p className="text-xs text-gray-300 line-clamp-2">{c}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-yt-card rounded-lg border border-yt-border">
        <SectionLabel>
          <FileText className="w-3.5 h-3.5" /> Transcript
          {video.has_transcript && (
            <span className="normal-case font-normal text-gray-500">via {video.transcript_method}</span>
          )}
        </SectionLabel>
        <p className="text-xs text-gray-300 leading-relaxed">{video.transcript_info}</p>
      </div>
    </div>
  );
}
