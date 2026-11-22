// Pyodide imports its runtime in a classic Web Worker.
const workerUrl = "/assets/py-worker.js";
export type Result = { assessment?: "passed" | "failed" | "not_attempted"; error?: string; friendly?: string; stopped?: boolean; line?: number };
export type Problem = { line: number; col: number; message: string };
type Job = {
  code: string;
  cwd: string;
  stream: (name: string, text: string) => void;
  options: { fresh?: boolean; assessment?: string | null };
  finish: (r: Result) => void;
  id: number;
};
export class Runner {
  private worker: Worker;
  private queue: Job[] = [];
  private current?: Job;
  private ready = false;
  private failure = "";
  private sequence = 0;
  private asks = new Map<number, (value: unknown) => void>();
  constructor(status: (text: string) => void) {
    this.worker = new Worker(workerUrl);
    const fail = (message: string) => {
      this.failure = message;
      status(message);
      this.flush({ error: message });
    };
    this.worker.onerror = (e) =>
      fail(e.message || "Python failed to load. Restart to try again.");
    this.worker.onmessage = ({ data: m }) => {
      if (m.type === "ready") {
        this.ready = true;
        status("Python ready");
        this.pump();
      } else if (m.type === "status") status(m.text || "Python ready");
      else if (m.type === "fatal") fail("Python failed to load: " + m.text);
      else if (m.type === "lint" || m.type === "complete") {
        this.asks.get(m.id)?.(m.type === "lint" ? m.problems : m.names);
        this.asks.delete(m.id);
      }
      else if (this.current?.id === m.id && this.current) {
        if (m.type === "stream") this.current.stream(m.name, m.text);
        if (m.type === "done") {
          this.current.finish(m);
          this.current = undefined;
          this.pump();
        }
      }
    };
    this.worker.postMessage({
      type: "init",
      base: new URL("/", location.href).href,
    });
  }
  run(code: string, cwd: string, stream: Job["stream"], options: Job["options"] = {}): Promise<Result> {
    if (this.failure) return Promise.resolve({ error: this.failure });
    return new Promise((finish) => {
      this.queue.push({ code, cwd, stream, options, finish, id: ++this.sequence });
      this.pump();
    });
  }
  // Editor services. They answer from the live session and never block a run for long.
  private ask<T>(message: Record<string, unknown>, fallback: T): Promise<T> {
    if (!this.ready || this.failure) return Promise.resolve(fallback);
    const id = ++this.sequence;
    return new Promise<T>((resolve) => {
      const timer = setTimeout(() => { this.asks.delete(id); resolve(fallback); }, 1500);
      this.asks.set(id, (v) => { clearTimeout(timer); resolve((v as T) ?? fallback); });
      this.worker.postMessage({ ...message, id });
    });
  }
  lint(code: string) {
    return this.ask<Problem[]>({ type: "lint", code }, []);
  }
  complete(expr: string) {
    return this.ask<string[]>({ type: "complete", expr }, []);
  }
  get isReady() {
    return this.ready && !this.failure;
  }
  private pump() {
    if (!this.ready || this.current || this.failure) return;
    this.current = this.queue.shift();
    if (this.current) {
      const { id, code, cwd, options } = this.current;
      this.worker.postMessage({ type: "run", id, code, cwd, ...options });
    }
  }
  private flush(r: Result) {
    this.current?.finish(r);
    this.current = undefined;
    for (const job of this.queue.splice(0)) job.finish(r);
  }
  dispose() {
    this.worker.terminate();
    this.failure = "Python stopped";
    this.flush({
      stopped: true,
      error: "Stopped. Python was restarted, so run the cells above again.",
    });
  }
}
