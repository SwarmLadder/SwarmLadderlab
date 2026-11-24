"""Record a real execution trace for the DSA visualizer (runs in Pyodide).

    trace_json(source, driver)   -> JSON string

`source` defines the algorithm (the learner may edit it); `driver` calls it.
Every line executed inside `source` becomes one step holding the line number,
the call stack and a JSON-safe snapshot of each frame's local variables.
Objects (linked-list or tree nodes, class instances) are stored once per step
in an object table and referenced by id, so shared structure and pointer
changes stay visible. Nothing is simulated: the steps are what Python ran.
"""
from __future__ import annotations

import collections
import contextlib
import io
import json
import sys

SOURCE = "<algorithm>"
MAX_STEPS = 600
MAX_ITEMS = 64


class _Snapshot:
    def __init__(self):
        self.objects: dict[str, dict] = {}

    def value(self, v, depth=0):
        if v is None or isinstance(v, (bool, int, str)):
            return v
        if isinstance(v, float):
            return v if v == v and v not in (float("inf"), float("-inf")) else {"$num": repr(v)}
        if depth > 6:
            return {"$repr": "…"}
        if isinstance(v, collections.deque):
            return {"$deque": [self.value(x, depth + 1) for x in list(v)[:MAX_ITEMS]]}
        if isinstance(v, (list, tuple)):
            items = [self.value(x, depth + 1) for x in v[:MAX_ITEMS]]
            return items if isinstance(v, list) else {"$tuple": items}
        if isinstance(v, (set, frozenset)):
            try:
                items = sorted(v)
            except TypeError:
                items = list(v)
            return {"$set": [self.value(x, depth + 1) for x in items[:MAX_ITEMS]]}
        if isinstance(v, dict):
            return {"$dict": [[self.value(k, depth + 1), self.value(x, depth + 1)] for k, x in list(v.items())[:MAX_ITEMS]]}
        if callable(v) or isinstance(v, type) or type(v).__module__ in ("builtins", "collections", "heapq"):
            return {"$repr": type(v).__name__ if callable(v) else repr(v)[:60]}
        fields = getattr(v, "__dict__", None)
        if fields is None and hasattr(type(v), "__slots__"):
            fields = {k: getattr(v, k) for k in type(v).__slots__ if hasattr(v, k)}
        if fields is None:
            return {"$repr": repr(v)[:60]}
        ref = str(id(v))
        if ref not in self.objects:
            self.objects[ref] = {"cls": type(v).__name__, "fields": {}}
            self.objects[ref]["fields"] = {k: self.value(x, depth + 1) for k, x in fields.items() if not k.startswith("__")}
        return {"$ref": ref}


def _user_frames(frame):
    stack = []
    while frame is not None:
        if frame.f_code.co_filename == SOURCE:
            stack.append(frame)
        frame = frame.f_back
    return stack[::-1]


def trace(source: str, driver: str) -> dict:
    namespace: dict = {"__name__": "__visual__"}
    exec(compile(source, SOURCE, "exec"), namespace)
    steps: list[dict] = []
    truncated = False

    def record(frame, event, arg=None):
        nonlocal truncated
        if len(steps) >= MAX_STEPS:
            truncated = True
            return
        snap = _Snapshot()
        frames = [{"fn": f.f_code.co_name, "line": f.f_lineno,
                   "locals": {k: snap.value(v) for k, v in f.f_locals.items() if not k.startswith("__")}}
                  for f in _user_frames(frame)]
        step = {"line": frame.f_lineno, "event": event, "frames": frames, "objects": snap.objects}
        if event == "return":
            step["returned"] = snap.value(arg)
        steps.append(step)

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != SOURCE:
            return None
        if event in ("line", "return"):
            record(frame, event, arg)
        return tracer

    try:
        code, expression = compile(driver, "<driver>", "eval"), True
    except SyntaxError:  # a few statements; they leave their answer in `result`
        code, expression = compile(driver, "<driver>", "exec"), False
    output = io.StringIO()
    result, error = None, None
    with contextlib.redirect_stdout(output):
        sys.settrace(tracer)
        try:
            if expression:
                result = eval(code, namespace)
            else:
                exec(code, namespace)
                result = namespace.get("result")
        except Exception as exc:  # the learner's code raised: show the steps up to the error
            error = f"{type(exc).__name__}: {exc}"
        finally:
            sys.settrace(None)
    return {"steps": steps, "truncated": truncated, "result": _Snapshot().value(result),
            "error": error, "stdout": output.getvalue()[-2000:]}


def trace_json(source: str, driver: str) -> str:
    return json.dumps(trace(source, driver), ensure_ascii=False)
