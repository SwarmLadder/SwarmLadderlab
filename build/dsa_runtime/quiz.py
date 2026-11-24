"""Self-check quizzes for DSA lessons, using the DSA course's own answer hashes.

    quiz = Quiz("basics/03", {1: "…", 2: "…"})
    quiz.answer(1, "b")
"""
from __future__ import annotations

import hashlib


def fingerprint(key: str, number: int, choice: str) -> str:
    # Identical to tools/quiz.py in the DSA course.
    return hashlib.sha256(f"dsa-course-quiz|{key}|{number}|{choice.strip().lower()}".encode()).hexdigest()[:12]


class Quiz:
    def __init__(self, key: str, answers: dict[int, str]):
        self.key = key
        self._answers = answers
        self._correct: set[int] = set()
        self.last_result = None

    def answer(self, number: int, choice: str) -> None:
        self.last_result = None
        if number not in self._answers:
            print(f"There is no question {number}. Questions: {sorted(self._answers)}")
            return
        choice = str(choice).strip().lower()
        if choice in {"", "?"}:
            print(f"Q{number}: replace '?' with your choice, e.g. quiz.answer({number}, 'a')")
            return
        if fingerprint(self.key, number, choice) == self._answers[number]:
            self._correct.add(number)
            self.last_result = True
            print(f"Q{number}: ✅ correct  ({len(self._correct)}/{len(self._answers)} so far)")
        else:
            self.last_result = False
            print(f"Q{number}: ❌ not quite. Re-read the matching section, then try another choice.")
