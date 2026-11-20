"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
const themeKey = "swarmladderlab.theme";
export function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem(themeKey);
    setTheme(
      saved === "light" || saved === "dark"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    );
    if (location.pathname === "/" && location.hash === "#catalog")
      location.replace("/curriculum/");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      {" "}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header>
        <div className="shell nav">
          <Link href="/" className="brand">
            <img src="/swarmladder.png" alt="" width="38" height="38" />
            SwarmLadder <b>Lab</b>
          </Link>
          <nav aria-label="Primary">
            {[
              ["/", "Dashboard"],
              ["/curriculum", "Curriculum"],
              ["/playground", "Playground"],
              ["/achievements", "Achievements"],
              ["/progress", "Progress"],
            ].map(([to, label]) => (
              <Link
                key={to}
                href={to}
                className={
                  pathname.replace(/\/$/, "") === to || pathname === to
                    ? "active"
                    : undefined
                }
                aria-current={pathname === to ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="theme"
            aria-label={
              "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
            }
            onClick={() => {
              const next = theme === "light" ? "dark" : "light";
              setTheme(next);
              localStorage.setItem(themeKey, next);
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>
    </>
  );
}
