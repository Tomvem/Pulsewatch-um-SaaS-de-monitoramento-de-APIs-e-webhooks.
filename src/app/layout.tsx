import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsewatch — API & Webhook Monitoring",
  description: "Monitorização simples e elegante para APIs e webhooks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
