import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";
import { Toaster } from "sonner";
import { useHealth, useMeta } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Kitchen", end: true },
  { to: "/recipes/new", label: "Add a recipe" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

/** Three coloured tins: the app's mark. */
function Mark() {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      <span className="size-4 rounded-full bg-mirch ring-2 ring-bg" />
      <span className="size-4 rounded-full bg-haldi ring-2 ring-bg" />
      <span className="size-4 rounded-full bg-kadi ring-2 ring-bg" />
    </span>
  );
}

function ServerStatus() {
  const { data, isError } = useHealth();
  const meta = useMeta().data;
  const down = isError || data?.database === "down";
  const aiOff = data && !data.ai.ready;
  const text = down
    ? "Server unreachable"
    : aiOff
      ? "AI key missing"
      : data
        ? `AI: ${meta?.ai.provider ?? data.ai.provider}`
        : "Connecting…";
  return (
    <span className="flex items-center gap-2 text-sm text-ink-soft" role="status" title={meta?.ai.model}>
      <span
        className={cn("size-2 rounded-full", down ? "bg-mirch" : aiOff ? "bg-haldi" : data ? "bg-kadi" : "bg-line")}
        aria-hidden
      />
      {text}
    </span>
  );
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const appName = useMeta().data?.appName ?? "CookAI";

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3 text-xl font-display" onClick={() => setMenuOpen(false)}>
            <Mark />
            {appName}
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-1.5 text-[0.95rem] font-medium text-ink-soft hover:text-ink",
                    isActive && "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--c-line)]",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:block">
            <ServerStatus />
          </div>

          <button
            type="button"
            className="rounded-full p-2 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-line px-4 pt-2 pb-4 md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn("block rounded-lg px-2 py-2.5 text-lg", isActive ? "font-semibold" : "text-ink-soft")}
              >
                {n.label}
              </NavLink>
            ))}
            <div className="mt-3 px-2">
              <ServerStatus />
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft sm:px-6">
          {appName} runs on your machine. Recipes are stored in your local PostgreSQL database.
        </div>
      </footer>

      <ScrollRestoration />
      <Toaster position="bottom-center" toastOptions={{ className: "!font-sans" }} />
    </div>
  );
}
