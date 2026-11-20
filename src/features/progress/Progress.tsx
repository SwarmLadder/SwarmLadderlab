"use client";
import { useState } from "react";
import { exportData, importData, STORE, read } from "./store";
import { download } from "../../lib/course";
export function Progress() {
  const [message, setMessage] = useState("");
  return (
    <>
      <h1>Learning progress</h1>
      <section className="panel narrow">
        <h2>Move your progress</h2>
        <p>
          Open the{" "}
          <a href="https://swarmladder.github.io/SwarmLadderlab/">
            original GitHub Pages dashboard
          </a>{" "}
          in the browser you used to learn. Export your progress there, then
          import the JSON file here. This restores saved code, completed checks,
          and your last lesson.
        </p>
        <p>
          Import replaces the progress on this site. Export a backup first to
          keep both copies. Choose your theme separately on each site.
        </p>
        <p>
          {Object.keys(read().done ?? {}).length} completed checks in this
          browser
        </p>
        <button
          onClick={() =>
            download(
              "swarmladderlab-progress.json",
              exportData(),
              "application/json",
            )
          }
        >
          Export progress
        </button>
        <label className="file">
          Import progress
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                importData(await file.text());
                setMessage("Progress imported.");
              } catch (err) {
                setMessage(String(err));
              }
            }}
          />
        </label>
        <hr />
        <button
          onClick={() => {
            if (
              confirm("Delete all progress and saved code in this browser?")
            ) {
              localStorage.removeItem(STORE);
              setMessage("Progress reset.");
            }
          }}
        >
          Reset progress
        </button>
        <p role="status">{message}</p>
      </section>
    </>
  );
}
