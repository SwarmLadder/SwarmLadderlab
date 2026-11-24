"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleDot, RefreshCw, Search } from "lucide-react";
import { lessonPath } from "../../lib/course";
import type { ItemKind, Roadmap as Data, RoadmapItem, Stage } from "../../lib/roadmap";
import { RUNTIME } from "../../lib/runtime";
import { studioSlug } from "../../lib/campus";
import { TechLogo } from "../../components/TechLogo";
import { currentStatus, doneIn, onProgress, read } from "../progress/store";

type State = "completed" | "read" | "progress" | "stale" | "available" | "not-started";
const LABEL: Record<State, string> = {
  completed: "Completed", read: "Read", progress: "In progress", stale: "Needs re-check", available: "Available", "not-started": "Not started",
};

// A lesson is completed only when every graded check currently passes; reading a page
// without checks marks it "Read", never "Completed".
function itemState(item: RoadmapItem, snap: ReturnType<typeof read>, done: Set<string>): State {
  const marks = doneIn(item.id, snap).length;
  if (item.graded > 0 && marks >= item.graded) return "completed";
  const stale = Object.entries(snap.current ?? {}).some(([k, e]) => k.startsWith(item.id + "#") && currentStatus(e, k) === "stale");
  if (stale) return "stale";
  if (item.graded === 0 && snap.finished?.[item.id]) return "read";
  if (marks > 0 || snap.last === item.id) return "progress";
  return item.prerequisites.every((p) => done.has(p)) ? "available" : "not-started";
}
function stageState(states: State[]): State {
  if (states.length && states.every((s) => s === "completed" || s === "read")) return "completed";
  if (states.includes("stale")) return "stale";
  if (states.some((s) => s === "completed" || s === "read" || s === "progress")) return "progress";
  return states.includes("available") ? "available" : "not-started";
}
function Node({ state }: { state: State }) {
  return (
    <span className={"rm-node " + state} aria-hidden="true">
      {state === "completed" || state === "read" ? <Check size={12} strokeWidth={3} /> : state === "stale" ? <RefreshCw size={11} strokeWidth={2.6} /> : state === "progress" ? <CircleDot size={12} strokeWidth={2.6} /> : null}
    </span>
  );
}

const GROUPS: [ItemKind, string][] = [["lesson", "Lessons"], ["practice", "Practice"], ["example", "Worked examples and guides"], ["project", "Projects"]];
// Python projects open their Studio brief; everything else opens its Lab page.
const hrefOf = (item: RoadmapItem) => item.href ?? (item.kind === "project" && /^(basics|intermediate|advanced)\//.test(item.id) ? "/studio/" + studioSlug(item.id) : lessonPath(item.id));

// A course's main page: its header, then every activity of the course arranged as a roadmap.
export function Roadmap({ data, courseTitle, courseId, language }: { data: Data; courseTitle: string; courseId: string; language?: string }) {
  const [snap, setSnap] = useState<ReturnType<typeof read>>({});
  useEffect(() => {
    const sync = () => setSnap(read());
    sync();
    return onProgress(sync);
  }, []);
  const stages = useMemo(() => data.levels.flatMap((l) => l.stages.map((s) => ({ ...s, level: l.title }))), [data]);
  const titles = useMemo(() => new Map(stages.flatMap((s) => s.items.map((i) => [i.id, i.title] as const))), [stages]);
  // Two passes: completion first, then availability from completed prerequisites.
  const states = useMemo(() => {
    const done = new Set(stages.flatMap((s) => s.items).filter((i) => itemState(i, snap, new Set()) === "completed").map((i) => i.id));
    const items = new Map(stages.flatMap((s) => s.items.map((i) => [i.id, itemState(i, snap, done)] as const)));
    const byStage = new Map(stages.map((s) => [s.id, stageState(s.items.map((i) => items.get(i.id)!))]));
    return { items, byStage };
  }, [stages, snap]);
  const firstOpen = stages.find((s) => states.byStage.get(s.id) === "progress" || states.byStage.get(s.id) === "stale")
    ?? stages.find((s) => states.byStage.get(s.id) !== "completed") ?? stages[0];
  const [selected, setSelected] = useState<string | null>(null);
  const current = stages.find((s) => s.id === (selected ?? firstOpen?.id)) ?? stages[0];
  const resume = stages.flatMap((s) => s.items).find((i) => ["progress", "stale"].includes(states.items.get(i.id)!))
    ?? stages.flatMap((s) => s.items).find((i) => states.items.get(i.id) === "available");
  const track = useRef<HTMLOListElement>(null);
  const panel = useRef<HTMLElement>(null);

  // Arrow keys move between stages; Home/End jump to the ends of the route.
  function onKey(event: React.KeyboardEvent, index: number) {
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? index + 1
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? index - 1
      : event.key === "Home" ? 0 : event.key === "End" ? stages.length - 1 : null;
    if (next === null || next < 0 || next >= stages.length) return;
    event.preventDefault();
    setSelected(stages[next].id);
    track.current?.querySelectorAll<HTMLButtonElement>(".rm-stage")[next]?.focus();
  }
  const done = stages.filter((s) => states.byStage.get(s.id) === "completed").length;
  const items = stages.flatMap((s) => s.items);
  const checks = items.reduce((n, i) => n + i.graded, 0);
  const passed = items.reduce((n, i) => n + Math.min(i.graded, doneIn(i.id, snap).length), 0);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits = q ? items.filter((i) => (i.title + " " + i.id + " " + (i.skill ?? "")).toLowerCase().includes(q)) : [];
  const runtime = RUNTIME[courseId];

  return (
    <div className="roadmap">
      <header className="rm-head">
        <div className="rm-title">
          <span className="rm-logo"><TechLogo id={courseId} size={36} /></span>
          <div>
            {language && <p className="eyebrow">{language}</p>}
            <h1>{courseTitle}</h1>
            <p className="rm-facts-line">
              <span>{items.length} activities</span><span>{checks} checks</span><span>{data.levels.length} levels</span><span>{stages.length} stages</span>
            </p>
            <p className="rm-sub">{done} of {stages.length} stages completed · {data.graph ? (data.course === "dsa" ? "dependencies from the DSA concept map, each with its reason" : "dependencies from the curriculum's concept map") : "suggested order from the course outline"}</p>
          </div>
        </div>
        <div className="rm-actions">
          {resume && (
            <Link className="button primary" href={hrefOf(resume)}>
              {states.items.get(resume.id) === "available" && !done && !passed ? "Start" : "Continue"}: {resume.title.replace(/^\d+ — /, "")} <ArrowRight size={16} />
            </Link>
          )}
          <div className="course-progress" aria-label={`${passed} of ${checks} checks passing`}>
            <span className="course-progress-n">{checks ? Math.round((100 * passed) / checks) : 0}%</span>
            <span className="thin-bar"><span style={{ width: `${checks ? (100 * passed) / checks : 0}%` }} /></span>
          </div>
        </div>
      </header>
      <div className="rm-tools">
        {runtime && (
          <details className="course-runtime" role="note">
            <summary><span className="course-runtime-label">{runtime[0]}</span> How checking works</summary>
            <p>{runtime[1]} Progress is saved on this device.</p>
          </details>
        )}
        <label className="finder rm-finder">
          <Search size={16} strokeWidth={1.7} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this course" aria-label={"Search " + courseTitle} />
        </label>
      </div>
      {q && (
        <section className="rm-results" aria-live="polite" aria-label="Search results">
          <p className="rm-facts" role="status">{hits.length} {hits.length === 1 ? "result" : "results"}</p>
          <ol className="rm-items">{hits.map((item) => <ItemRow key={item.id} item={item} state={states.items.get(item.id)!} titles={titles} />)}</ol>
        </section>
      )}
      <ul className="rm-legend" aria-label="Legend">
        {(["completed", "progress", "stale", "available", "not-started"] as State[]).map((s) => <li key={s}><Node state={s} /> {LABEL[s]}</li>)}
      </ul>

      <div className="rm-body">
        <nav aria-label={courseTitle + " stages"}>
          <ol className="rm-track" ref={track}>
            {data.levels.map((level) => (
              <li key={level.id} className="rm-level">
                <h2>{level.title}</h2>
                <ol>
                  {level.stages.map((stage) => {
                    const index = stages.findIndex((s) => s.id === stage.id);
                    const state = states.byStage.get(stage.id)!;
                    const finished = stage.items.filter((i) => ["completed", "read"].includes(states.items.get(i.id)!)).length;
                    const active = current?.id === stage.id;
                    return (
                      <li key={stage.id}>
                        <button type="button" className={"rm-stage " + state + (active ? " active" : "")} data-stage={stage.id}
                          aria-current={active ? "step" : undefined} tabIndex={active ? 0 : -1}
                          onClick={() => { setSelected(stage.id); if (matchMedia("(max-width: 900px)").matches) panel.current?.scrollIntoView({ block: "start" }); }}
                          onKeyDown={(e) => onKey(e, index)}>
                          <Node state={state} />
                          <span className="rm-stage-name">{stage.title}</span>
                          <span className="rm-stage-count">{finished}/{stage.items.length}<span className="sr-only"> done, {LABEL[state]}</span></span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </nav>

        {current && <StagePanel ref={panel} stage={current} level={current.level} states={states.items} stageStates={states.byStage}
          titles={titles} stages={stages} onSelect={setSelected} />}
      </div>
    </div>
  );
}

function StagePanel({ ref, stage, level, states, stageStates, titles, stages, onSelect }: {
  ref: React.Ref<HTMLElement>; stage: Stage; level: string; states: Map<string, State>; stageStates: Map<string, State>;
  titles: Map<string, string>; stages: (Stage & { level: string })[]; onSelect: (id: string) => void;
}) {
  const state = stageStates.get(stage.id)!;
  const checks = stage.items.reduce((n, i) => n + i.graded, 0);
  return (
    <section ref={ref} className="rm-panel" aria-labelledby="rm-panel-title" aria-live="polite">
      <p className="rm-panel-level">{level} · <span className={"rm-state " + state}>{LABEL[state]}</span></p>
      <h2 id="rm-panel-title">{stage.title}</h2>
      {stage.summary && <p className="rm-summary">{stage.summary}</p>}
      <p className="rm-facts">{stage.items.length} {stage.items.length === 1 ? "activity" : "activities"}{checks ? ` · ${checks} graded checks` : ""}</p>
      {stage.dependsOn.length > 0 && (
        <p className="rm-builds">Builds on {stage.dependsOn.map((id, i) => {
          const dep = stages.find((s) => s.id === id);
          return <span key={id}>{i ? ", " : ""}<button type="button" className="link-button" onClick={() => onSelect(id)}>{dep?.title ?? id}</button></span>;
        })}</p>
      )}
      {GROUPS.map(([kind, label]) => {
        const group = stage.items.filter((i) => i.kind === kind);
        if (!group.length) return null;
        return (
          <div key={kind} className={"rm-group kind-" + kind}>
            {stage.items.some((i) => i.kind !== kind) && <h3>{label}</h3>}
            <ol className="rm-items">{group.map((item) => <ItemRow key={item.id} item={item} state={states.get(item.id)!} titles={titles} />)}</ol>
          </div>
        );
      })}
    </section>
  );
}

function ItemRow({ item, state: s, titles }: { item: RoadmapItem; state: State; titles: Map<string, string> }) {
  return (
    <li className={"rm-item " + s}>
      <Node state={s} />
      <div>
        <Link href={hrefOf(item)} className="rm-item-title">{item.title}</Link>
        {item.skill && <p className="rm-skill">{item.skill}</p>}
        <p className="rm-meta">
          <span>{LABEL[s]}</span>
          {item.graded > 0 && <span>{item.graded} {item.graded === 1 ? "check" : "checks"}</span>}
          {item.challenges.length > 0 && <span>Challenges: {item.challenges.join(", ")}</span>}
          {item.prerequisites.length > 0 && !item.why && <span>After {item.prerequisites.map((p) => titles.get(p)?.replace(/^\d+ — /, "") ?? p).join(", ")}</span>}
        </p>
        {item.why && item.prerequisites.length > 0 && (
          <ul className="rm-why" aria-label={"Why " + item.title + " comes after its prerequisites"}>
            {item.prerequisites.map((p) => <li key={p}><Link href={lessonPath(p)}>{titles.get(p) ?? p}</Link>: {item.why![p]}</li>)}
          </ul>
        )}
      </div>
    </li>
  );
}
