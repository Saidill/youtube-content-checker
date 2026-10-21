export function formatNumber(n: string): string {
  const num = parseInt(n || "0");
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "Jt";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "Rb";
  return n;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days / 365)} tahun lalu`;
  if (days > 30) return `${Math.floor(days / 30)} bulan lalu`;
  if (days > 0) return `${days} hari lalu`;
  return "Hari ini";
}

/** Sama dengan backend: P(inappropriate) > 0.5 → Inappropriate. */
export function verdict(prob: number) {
  const inappropriate = prob > 0.5;
  return {
    inappropriate,
    text: inappropriate ? "Inappropriate" : "Appropriate",
    // persentase untuk kelas yang dipilih model
    pct: (inappropriate ? prob : 1 - prob) * 100,
  };
}
