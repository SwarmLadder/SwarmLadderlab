import { Header } from "./Header";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "../styles/field.css";
import "../styles/lesson.css";
import "../styles/pages.css";
import { labRepo, courseRepo } from "../lib/course";
import { Wordmark } from "../components/Brand";
import { dir, locale, t } from "../i18n";
export const metadata = {
  title: "SwarmLadder Lab · Learn to code, one rung at a time",
  description: "A field guide to programming: short lessons, fill-in exercises with instant checks, and real projects. Python runs in your browser.",
};
// Applies the saved theme before first paint, so night readers never see a flash of paper.
const themeScript = `try{var t=localStorage.getItem("swarmladderlab.theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f6f4ee" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b1526" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
              <a href="/learn">{t("nav.courses")}</a>
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
