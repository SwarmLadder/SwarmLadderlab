import { t } from "../i18n";
// The SwarmLadder mark: two rails, rungs, and one rung lit — the step you're on.
export function LadderMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" className="mark-tile" />
      <path d="M11 6 L10 26 M22 6 L21 26" className="mark-rail" />
      <path d="M10.8 10 H21.8 M10.6 14.5 H21.6 M10.2 23.5 H21.2" className="mark-rung" />
      <path d="M10.4 19 H21.4" className="mark-lit" />
    </svg>
  );
}
export function Wordmark() {
  return (
    <span className="wordmark">
      <LadderMark />
      <span className="wordmark-text">
        {t("brand.name")}
        <span className="wordmark-lab">{t("brand.lab")}</span>
      </span>
    </span>
  );
}
