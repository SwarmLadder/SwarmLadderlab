import { useId } from "react";
import { t } from "../i18n";

// The SwarmLadder mark: a ladder of mint rungs on rails that shift from green to cyan,
// with the swarm (connected learners) around it. Drawn to match the brand artwork.
export function LadderMark({ size = 32, tile = true }: { size?: number; tile?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#45e3ae" />
          <stop offset="1" stopColor="#31bfd9" />
        </linearGradient>
      </defs>
      {tile && <rect width="1024" height="1024" rx="232" fill="#0c1729" />}
      <path d="M140 790 C 330 905, 640 905, 880 737" fill="none" stroke="#17334a" strokeWidth="5" />
      <g stroke="#4bb9d6" strokeWidth="12" strokeLinecap="round" opacity="0.55">
        <path d="M234 444 L384 508" />
        <path d="M628 508 L736 613" />
      </g>
      <circle cx="234" cy="444" r="24" fill="#4bb9d6" />
      <circle cx="736" cy="613" r="22" fill="#4bb9d6" />
      <circle cx="568" cy="224" r="18" fill="#3fd9b0" />
      <g stroke={`url(#r${id})`} strokeWidth="48" strokeLinecap="round">
        <path d="M465 288 L294 745" />
        <path d="M710 288 L538 745" />
      </g>
      <g stroke="#bff7e5" strokeWidth="38">
        <path d="M432 380 H676" />
        <path d="M384 508 H628" />
        <path d="M336 636 H580" />
      </g>
      <g fill="#e1fcf2">
        <circle cx="432" cy="380" r="36" />
        <circle cx="676" cy="380" r="36" />
        <circle cx="384" cy="508" r="36" />
        <circle cx="628" cy="508" r="36" />
        <circle cx="336" cy="636" r="36" />
        <circle cx="580" cy="636" r="36" />
      </g>
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
