import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viber AI Bot — Conversation Lab",
  description: "Interactive demo of an AI-assisted Viber bot with optional Groq integration.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}