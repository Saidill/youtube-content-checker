import { AlertTriangle, CheckCircle } from "lucide-react";
import { verdict } from "@/lib/format";

/** Badge kecil "Appropriate · 97.3%" untuk satu model. */
export function VerdictBadge({ prob }: { prob: number }) {
  const v = verdict(prob);
  return (
    <span
      className={`flex items-center gap-1 w-fit text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full border ${
        v.inappropriate
          ? "bg-red-500/15 border-red-500/30 text-red-300"
          : "bg-green-500/15 border-green-500/30 text-green-300"
      }`}
    >
      {v.inappropriate ? (
        <AlertTriangle className="w-3 h-3 shrink-0" />
      ) : (
        <CheckCircle className="w-3 h-3 shrink-0" />
      )}
      <span>{v.text}</span>
      <span className="opacity-50">·</span>
      <span>{v.pct.toFixed(1)}%</span>
    </span>
  );
}
