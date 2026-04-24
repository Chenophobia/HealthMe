"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-10 h-10" aria-hidden />;
  const current = resolvedTheme === "dark" ? "dark" : "light";
  const label = current === "dark" ? "光" : "暗";
  const next = current === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      className="w-10 h-10 rounded border text-lg font-bold"
      style={{ background: "var(--paper-accent)", color: "var(--ink)", borderColor: "var(--divider)" }}
      aria-label={`Switch to ${next} theme`}
    >
      {label}
    </button>
  );
}
