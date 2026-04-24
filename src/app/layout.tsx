import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { InkFilter } from "@/components/ink-filter";

export const metadata: Metadata = {
  title: "HealthMe",
  description: "Personal health tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <InkFilter />
          <Nav />
          <main className="p-6 relative min-h-[calc(100vh-70px)]">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
