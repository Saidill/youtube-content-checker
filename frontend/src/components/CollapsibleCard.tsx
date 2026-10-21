"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/** Kartu dengan header yang bisa dibuka/tutup — dipakai panel AI di sisi kanan. */
export function CollapsibleCard({
  header,
  className,
  children,
}: {
  header: React.ReactNode;
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border overflow-hidden ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">{header}</div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}
