import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUKAMAJU RUN 2025",
  description: "Event lari tahunan SUKAMAJU RUN 2025",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}