"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/metrics", label: "Metrics" },
  { href: "/meals", label: "Meals" },
  { href: "/recipes", label: "Recipes" },
  { href: "/goals", label: "Goals" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex items-center gap-5 px-6 py-4 border-b"
      style={{ borderColor: "var(--divider)" }}
    >
      <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-lg"
          style={{ background: "var(--accent)", color: "#f4ecd8", transform: "rotate(-3deg)" }}
        >
          垚
        </div>
        HealthMe
      </div>
      <ul className="flex gap-5 flex-1 text-sm uppercase tracking-wider">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className="py-1.5 border-b-2"
                style={{
                  borderColor: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <ThemeToggle />
    </nav>
  );
}
