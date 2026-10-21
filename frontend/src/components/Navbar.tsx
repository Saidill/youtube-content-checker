import { Loader2, Search, Shield, Youtube } from "lucide-react";

export function Navbar({
  input,
  onInputChange,
  onSubmit,
  loading,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <nav className="sticky top-0 z-50 bg-yt-dark border-b border-yt-border flex items-center px-4 py-2 gap-4">
      <div className="flex items-center gap-1.5">
        <Youtube className="w-7 h-7 text-yt-red" />
        <span className="text-white font-bold text-lg hidden sm:block">Content</span>
        <span className="text-yt-red font-bold text-lg hidden sm:block">Checker</span>
      </div>

      <form
        className="flex-1 max-w-2xl mx-auto flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex-1 flex items-center bg-yt-card border border-yt-border rounded-full px-4 gap-2 focus-within:border-blue-500 transition-colors">
          <input
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none py-2"
            placeholder="Paste URL YouTube atau Video ID..."
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-yt-card border border-yt-border hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full p-2.5 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Search className="w-5 h-5 text-white" />
          )}
        </button>
      </form>

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Shield className="w-4 h-4 text-blue-400" />
        <span className="hidden sm:block">AI Safety</span>
      </div>
    </nav>
  );
}
