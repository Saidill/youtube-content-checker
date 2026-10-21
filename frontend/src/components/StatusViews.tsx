import { AlertCircle, AlertTriangle, BarChart3, Bot, FileText, Loader2, Shield, Youtube } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <Bot className="w-5 h-5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium">Menganalisis video...</p>
        <p className="text-gray-400 text-sm mt-1">Mengambil data YouTube & menjalankan model AI</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: <Shield className="w-4 h-4 text-green-400" />, text: "Deteksi Konten" },
  { icon: <FileText className="w-4 h-4 text-blue-400" />, text: "AI Summary" },
  { icon: <AlertCircle className="w-4 h-4 text-red-400" />, text: "Kata Kasar" },
  { icon: <BarChart3 className="w-4 h-4 text-purple-400" />, text: "Model Comparison" },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
      <div className="w-20 h-20 rounded-full bg-yt-card border border-yt-border flex items-center justify-center">
        <Youtube className="w-10 h-10 text-yt-red" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-2">YouTube Content Checker</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Paste URL atau Video ID YouTube di atas, lalu pilih model AI untuk
          menganalisis apakah konten aman untuk anak-anak.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm w-full mt-2">
        {FEATURES.map((f) => (
          <div key={f.text} className="flex items-center gap-2 p-3 bg-yt-card rounded-lg border border-yt-border">
            {f.icon}
            <span className="text-xs text-gray-300">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
