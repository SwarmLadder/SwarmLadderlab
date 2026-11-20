import { Header } from "./Header";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "../styles/field.css";
import "../styles/lesson.css";
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
        <meta name="theme-color" content="#f4efe4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#121318" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="colophon">
          <div className="shell colophon-row">
            <Wordmark />
            <p>{t("footer.colophon")}</p>
            <nav aria-label="Footer">
              <a href={labRepo}>{t("footer.contribute")} ↗</a>
              <a href={courseRepo}>{t("footer.source")} ↗</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
