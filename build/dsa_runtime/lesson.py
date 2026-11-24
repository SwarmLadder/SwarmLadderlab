"""Browser grader for SwarmLadder DSA lessons (runs in Pyodide).

    from lesson import Exercises, ___
    check = Exercises("dsa/basics/03")
    check("DB09")        # grades the solve() defined by the drill cell

Each drill is checked against its six published cases from the DSA course
(drills.json next to this file), compared exactly as the course's own
`python -m tools.drills check` does: JSON values, order and types.
`last_result` is True (all cases pass), False (a case fails or raises) or
None (blanks or NotImplementedError left), which the Lab records as evidence
for the current code. Passing published cases is not a proof of
correctness or of complexity.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_ATTEMPTS: dict[str, int] = {}  # survives fresh namespaces, so hints progress


class BlankNotFilled(Exception):
    def __init__(self):
        super().__init__("fill in every ___ blank first")


class _Blank:
    """`___` in a guided drill: using it in any way means "not attempted yet"."""

    def _stop(self, *args, **kwargs):
        raise BlankNotFilled()

    __bool__ = __call__ = __iter__ = __len__ = __getitem__ = __getattr__ = _stop
    __add__ = __radd__ = __sub__ = __rsub__ = __mul__ = __rmul__ = _stop
    __lt__ = __le__ = __gt__ = __ge__ = __index__ = __int__ = __hash__ = _stop
    __truediv__ = __floordiv__ = __mod__ = __neg__ = __contains__ = _stop

    def __eq__(self, other):
        raise BlankNotFilled()

    def __repr__(self):
        return "___"


___ = _Blank()


def canonical(value) -> str:
    """The course grader's comparison: JSON with sorted keys; bool and int stay distinct."""
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _show(value, limit=160) -> str:
    text = json.dumps(value, ensure_ascii=False) if _jsonable(value) else repr(value)
    return text if len(text) <= limit else text[:limit] + "…"


def _jsonable(value) -> bool:
    try:
        json.dumps(value, allow_nan=False)
        return True
    except (TypeError, ValueError):
        return False


def _uses_blank(fn) -> bool:
    code = getattr(fn, "__code__", None)
    stack = [code] if code else []
    while stack:
        c = stack.pop()
        if "___" in c.co_names:
            return True
        stack.extend(k for k in c.co_consts if hasattr(k, "co_names"))
    return False


def drills() -> dict:
    return json.loads((_HERE / "drills.json").read_text(encoding="utf-8"))


class Exercises:
    def __init__(self, lesson_id: str):
        self.lesson_id = lesson_id
        self.last_result = None
        self._drills = drills()

    def __call__(self, number, value=None) -> None:
        """check("DB09") grades the drill's solve() on its six published cases."""
        self.last_result = None
        drill = self._drills.get(str(number))
        if drill is None:
            print(f"There is no drill {number!r} in this lesson.")
            return
        namespace = sys._getframe(1).f_globals
        solve = namespace.get("solve")
        if not callable(solve):
            print(f"✏️  {number}: define solve(...) in the drill cell above, then run the check.")
            return
        if _uses_blank(solve):
            print(f"✏️  {number}: Not attempted — fill in every ___ blank, then run the check.")
            return
        self.last_result = self._grade(number, drill, solve)

    def assess(self, name, cases):
        """Part of the Lab's grader interface (independent builds); DSA lessons have none."""
        self.last_result = None
        print(f"There is no independent assessment {name!r} in this lesson.")

    def _grade(self, did: str, drill: dict, solve) -> bool | None:
        cases = drill["cases"]
        passed, first_failure = 0, None
        for index, case in enumerate(cases, 1):
            args = json.loads(json.dumps(case["args"]))  # a fresh copy, as the course runner does
            try:
                actual = solve(*args)
            except (BlankNotFilled, NotImplementedError):
                print(f"✏️  {did}: Not attempted — finish solve(...), then run the check.")
                return None
            except Exception as error:  # the learner's code raised
                first_failure = first_failure or (index, case, f"{type(error).__name__}: {error}")
                continue
            if _jsonable(actual) and canonical(actual) == canonical(case["expected"]):
                passed += 1
            else:
                first_failure = first_failure or (index, case, _show(actual))
        if passed == len(cases):
            _ATTEMPTS.pop(did, None)
            print(f"✅ {did}: all {len(cases)} checks passed — the six published cases, not a proof.")
            return True
        attempt = _ATTEMPTS[did] = _ATTEMPTS.get(did, 0) + 1
        index, case, got = first_failure
        print(f"❌ {did}: {passed}/{len(cases)} published cases passed.")
        print(f"   Case {index}: solve({', '.join(_show(a) for a in case['args'])})")
        print(f"   expected {_show(case['expected'])}")
        print(f"   got      {got}")
        hints = drill.get("hints") or []
        if hints:
            shown = min(attempt, len(hints))
            print(f"   hint {shown}/{len(hints)}: {hints[shown - 1]}")
        return False
