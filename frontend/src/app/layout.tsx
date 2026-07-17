import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Content Checker",
  description: "AI-powered YouTube content safety detector for children",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-white text-white min-h-screen">{children}</body>
    </html>
  );
}
