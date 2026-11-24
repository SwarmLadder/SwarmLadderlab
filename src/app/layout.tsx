import { Header } from "./Header";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "../styles/field.css";
import "../styles/brand.css";
import "../styles/lesson.css";
import "../styles/native.css";
import "../styles/pages.css";
import "../styles/library.css";
import "../styles/campus.css";
import "../styles/roadmap.css";
import "../styles/home.css";
import "../styles/visual.css";
import { labRepo, courseRepo } from "../lib/course";
import { Wordmark } from "../components/Brand";
import { dir, locale, t } from "../i18n";
const title = "SwarmLadder Lab · Learn to code, one rung at a time";
const description = "Learn Python, SQL, DSA, C, Git, Rust and Linux with guided lessons, coding challenges, projects and saved progress. Python and SQL run in the browser; C exercises use local compiler verification.";
// Absolute URLs for link previews. Set SITE_URL at build time when the site moves to its own domain.
const site = process.env.SITE_URL || "https://swarmladder-lab-staging.bitpyrus.workers.dev";
// Every page is personal (progress lives in the browser), so never let the edge keep
// rendered HTML: a cached copy would outlive deploys and show an old design.
export const dynamic = "force-dynamic";
export const metadata = {
  metadataBase: new URL(site),
  title,
  description,
  applicationName: "SwarmLadder Lab",
  openGraph: {
    type: "website",
    siteName: "SwarmLadder Lab",
    url: "/",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SwarmLadder Lab: Learn to code, one rung at a time." }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};
// Applies the saved theme before first paint, so night readers never see a flash of paper.
const themeScript = `try{var t=localStorage.getItem("swarmladderlab.theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f6f4ee" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b1526" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="colophon">
          <div className="shell colophon-grid">
            <div className="colophon-brand">
              <Wordmark />
              <p className="colophon-tag">{t("brand.motto")}</p>
            </div>
            <nav aria-label={t("footer.learn")}>
              <p>{t("footer.learn")}</p>
              <a href="/schools">{t("nav.schools")}</a>
              <a href="/learn">{t("nav.courses")}</a>
              <a href="/studio">{t("nav.studio")}</a>
              <a href="/community">{t("nav.community")}</a>
              <a href="/playground">{t("nav.playground")}</a>
              <a href="/achievements">{t("nav.achievements")}</a>
              <a href="/progress">{t("nav.progress")}</a>
            </nav>
            <nav aria-label={t("footer.open")}>
              <p>{t("footer.open")}</p>
              <a href={labRepo}>{t("footer.contribute")} ↗</a>
              <a href={courseRepo}>{t("footer.source")} ↗</a>
            </nav>
          </div>
          <div className="shell colophon-base">
            <span>{t("footer.colophon")}</span>
            <span>{t("footer.privacy")}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
