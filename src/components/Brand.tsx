import { t } from "../i18n";

// The SwarmLadder mark: a ladder rising to the right. Its top rung reaches past the
// rail to a node, the next learner on the climb. Drawn on a 64-unit grid so every
// stroke stays legible at favicon size; docs/BRAND.md describes the rules.
export function LadderMark({ size = 32, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {tile && <rect className="mark-tile" width="64" height="64" rx="14" />}
      <g strokeWidth="4.5" strokeLinecap="round">
        <path className="mark-rail" d="M18 54 27 10" />
        <path className="mark-rail back" d="M34 54 43 10" />
        <path className="mark-rung" d="M21 41h16M23.6 29h16M26.2 17H48" />
      </g>
      <circle className="mark-node" cx="51" cy="17" r="4.6" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LadderMark />
      <span className="wordmark-text">
        <span className="wm-swarm">Swarm</span>
        <span className="wm-ladder">Ladder</span>
        <span className="wordmark-lab">{t("brand.lab")}</span>
      </span>
    </span>
  );
}
