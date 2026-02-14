import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeetCode Tracker",
  description: "Track your LeetCode progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
