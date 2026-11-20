"use client";
import { useSyncExternalStore } from "react";
import { t } from "../i18n";
const subscribe = () => () => {};
// Progress lives in localStorage, so personal pages render only in the browser.
export function Personal({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? children : <p className="page-loading" role="status">{t("loading.workspace")}</p>;
}
