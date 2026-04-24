import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthMe",
  description: "Personal health tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Courier New', Courier, monospace" }}>
        {children}
      </body>
    </html>
  );
}
