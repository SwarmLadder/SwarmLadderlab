import { Header } from "./Header";
import "../styles/app.css";
import { labRepo, courseRepo } from "../lib/course";
export const metadata = {
  title: "SwarmLadder Lab",
  description:
    "Learn Together. Rise Together. Interactive Python notebooks from SwarmLadder.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main id="main" tabIndex={-1} className="shell">
          {children}
        </main>{" "}
        <footer className="shell">
          <strong>SwarmLadder Lab</strong>
          <div>
            <a href={labRepo}>Contribute on GitHub ↗</a>
            <a href={courseRepo}>Course source ↗</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
