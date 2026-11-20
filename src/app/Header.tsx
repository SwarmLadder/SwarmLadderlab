"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Wordmark } from "../components/Brand";
import { t } from "../i18n";
const themeKey = "swarmladderlab.theme";
const links: [string, Parameters<typeof t>[0]][] = [
  ["/learn", "nav.courses"],
  ["/playground", "nav.playground"],
  ["/achievements", "nav.achievements"],
  ["/progress", "nav.progress"],
];
export function Header() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const [theme, setTheme] = useState("light");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(themeKey);
    setTheme(saved === "light" || saved === "dark" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => setOpen(false), [pathname]);
  const active = (to: string) => pathname === to || (to === "/learn" && (pathname.startsWith("/learn") || pathname.startsWith("/lesson")));
  return (
    <>
      <a className="skip" href="#main">{t("nav.skip")}</a>
      <header className="masthead">
        <div className="shell masthead-row">
          <Link href="/" className="brand" aria-label={t("brand.name") + " " + t("brand.lab")}>
            <Wordmark />
          </Link>
          <nav aria-label={t("nav.primary")} className={"primary-nav" + (open ? " open" : "")} id="primary-nav">
            {links.map(([to, key]) => (
              <Link key={to} href={to} className={active(to) ? "active" : undefined} aria-current={active(to) ? "page" : undefined}>
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="masthead-tools">
            <button
              className="icon-button"
              aria-label={theme === "light" ? t("theme.toDark") : t("theme.toLight")}
              title={theme === "light" ? t("theme.toDark") : t("theme.toLight")}
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                localStorage.setItem(themeKey, next);
              }}
            >
              {theme === "dark" ? <Sun size={18} strokeWidth={1.6} /> : <Moon size={18} strokeWidth={1.6} />}
            </button>
            <button className="icon-button menu-button" aria-expanded={open} aria-controls="primary-nav" aria-label={t("nav.menu")} onClick={() => setOpen(!open)}>
              {open ? <X size={18} strokeWidth={1.6} /> : <Menu size={18} strokeWidth={1.6} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
