"use client";
import { useEffect, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { exportData, importData, onProgress, read, STORE } from "./store";
import { download, type Catalog } from "../../lib/course";
import { route } from "../../lib/journey";
import { t } from "../../i18n";

export function Progress({ catalog }: { catalog: Catalog }) {
  const [message, setMessage] = useState(""),
    [, refresh] = useState(0);
  useEffect(() => onProgress(() => refresh((n) => n + 1)), []);
  const state = read(),
    checks = Object.keys(state.done ?? {}).length,
    r = route(catalog),
    finished = r.all.filter((s) => s.state === "done").length,
    rungs = r.levels.filter((l) => l.complete).length;
  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">{t("nav.progress")}</p>
        <h1 className="display small">{t("progress.title")}</h1>
        <p className="lede">{t("progress.lede")}</p>
      </header>
      <div className="stat-row">
        <div className="stat">
          <strong>{finished}<small> / {r.all.length}</small></strong>
          <span>{t("progress.lessons")}</span>
        </div>
        <div className="stat">
          <strong>{checks}</strong>
          <span>{t("progress.checks")}</span>
        </div>
        <div className="stat">
          <strong>{rungs}<small> / {r.levels.length}</small></strong>
          <span>{t("progress.levels")}</span>
        </div>
      </div>
      <section className="sheet narrow-sheet">
        <h2>{t("progress.move")}</h2>
        <p>{t("progress.moveBody")}</p>
        <div className="button-row">
          <button
            className="button ink"
            onClick={() => download("swarmladderlab-progress.json", exportData(), "application/json")}
          >
            <Download size={16} /> {t("progress.export")}
          </button>
          <label className="button quiet file-button">
            <Upload size={16} /> {t("progress.import")}
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  importData(await file.text());
                  setMessage(t("progress.imported"));
                } catch (err) {
                  setMessage(String(err));
                }
              }}
            />
          </label>
          <button
            className="button quiet danger"
            onClick={() => {
              if (confirm(t("progress.resetConfirm"))) {
                localStorage.removeItem(STORE);
                window.dispatchEvent(new Event("swl-progress"));
                setMessage(t("progress.resetDone"));
              }
            }}
          >
            <Trash2 size={16} /> {t("progress.reset")}
          </button>
        </div>
        <p className="notice" role="status">{message}</p>
      </section>
    </div>
  );
}
