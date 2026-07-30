"""Tính kết quả UAT/SUS từ phản hồi người dùng thật, không sinh dữ liệu giả."""

from __future__ import annotations

import csv
import math
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any


SUS_COLUMNS = tuple(f"sus_q{index}" for index in range(1, 11))
EXPECTED_TASKS = ("T01", "T02", "T03", "T04", "T05", "T06")
ALLOWED_DEVICES = ("desktop", "mobile")
REQUIRED_COLUMNS = (
    "participant_id",
    "consent",
    "device",
    "task_id",
    "success",
    "duration_seconds",
    "error_count",
    "assistance_count",
    *SUS_COLUMNS,
    "comment",
)


def calculate_sus(answers: list[int]) -> float:
    if len(answers) != 10 or any(answer < 1 or answer > 5 for answer in answers):
        raise ValueError("SUS cần đúng 10 câu, mỗi câu từ 1 đến 5.")
    adjusted = [
        answer - 1 if index % 2 == 0 else 5 - answer
        for index, answer in enumerate(answers)
    ]
    return sum(adjusted) * 2.5


def _mean_ci95(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"mean": None, "ci95Low": None, "ci95High": None}
    mean = statistics.fmean(values)
    if len(values) < 2:
        return {"mean": mean, "ci95Low": None, "ci95High": None}
    margin = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return {"mean": mean, "ci95Low": max(0.0, mean - margin), "ci95High": mean + margin}


def read_uat_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        missing = [column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"CSV thiếu cột: {', '.join(missing)}")
        rows = [
            {key: (value or "").strip() for key, value in row.items()}
            for row in reader
            if any((value or "").strip() for value in row.values())
        ]
    if not rows:
        raise ValueError("CSV chưa có phản hồi người dùng thật.")
    return rows


def analyze_uat(rows: list[dict[str, str]]) -> dict[str, Any]:
    participant_answers: dict[str, list[int]] = {}
    participant_devices: dict[str, str] = {}
    participant_tasks: dict[str, set[str]] = defaultdict(set)
    tasks: dict[str, list[dict[str, float]]] = defaultdict(list)
    devices: dict[str, list[dict[str, float]]] = defaultdict(list)
    comments: list[dict[str, str]] = []

    for row_number, row in enumerate(rows, start=2):
        participant = row["participant_id"]
        task = row["task_id"]
        if not participant or not task:
            raise ValueError(f"Dòng {row_number}: thiếu participant_id hoặc task_id.")
        try:
            success = int(row["success"])
            duration = float(row["duration_seconds"])
            errors = int(row["error_count"])
            assistance = int(row.get("assistance_count", "0"))
            answers = [int(row[column]) for column in SUS_COLUMNS]
        except ValueError as error:
            raise ValueError(f"Dòng {row_number}: trường số không hợp lệ.") from error
        consent = row.get("consent", "1")
        device = row.get("device", "desktop").lower()
        if consent != "1":
            raise ValueError(f"Dòng {row_number}: chưa có đồng thuận tham gia.")
        if device not in ALLOWED_DEVICES:
            raise ValueError(
                f"Dòng {row_number}: device phải là desktop hoặc mobile."
            )
        if task not in EXPECTED_TASKS:
            raise ValueError(f"Dòng {row_number}: task_id không thuộc T01–T06.")
        if success not in (0, 1) or duration < 0 or errors < 0 or assistance < 0:
            raise ValueError(
                f"Dòng {row_number}: success/duration/error/assistance ngoài miền."
            )

        existing = participant_answers.get(participant)
        if existing is not None and existing != answers:
            raise ValueError(f"Người tham gia {participant} có câu trả lời SUS không nhất quán.")
        existing_device = participant_devices.get(participant)
        if existing_device is not None and existing_device != device:
            raise ValueError(
                f"Người tham gia {participant} có loại thiết bị không nhất quán."
            )
        participant_answers[participant] = answers
        participant_devices[participant] = device
        if task in participant_tasks[participant]:
            raise ValueError(f"Người tham gia {participant} bị trùng task {task}.")
        participant_tasks[participant].add(task)
        observation = {
            "success": success,
            "duration": duration,
            "errors": errors,
            "assistance": assistance,
        }
        tasks[task].append(observation)
        devices[device].append(observation)
        if row["comment"]:
            comments.append(
                {
                    "participantId": participant,
                    "taskId": task,
                    "device": device,
                    "comment": row["comment"],
                }
            )

    sus_scores = [calculate_sus(answers) for answers in participant_answers.values()]

    def summarize_observations(observations: list[dict[str, float]]) -> dict[str, Any]:
        return {
            "attempts": len(observations),
            "successRate": statistics.fmean(item["success"] for item in observations),
            "medianDurationSeconds": statistics.median(
                item["duration"] for item in observations
            ),
            "averageErrors": statistics.fmean(item["errors"] for item in observations),
            "averageAssistance": statistics.fmean(
                item["assistance"] for item in observations
            ),
        }

    task_summary: dict[str, Any] = {}
    for task, observations in sorted(tasks.items()):
        task_summary[task] = summarize_observations(observations)

    incomplete_participants = {
        participant: sorted(set(EXPECTED_TASKS) - completed)
        for participant, completed in participant_tasks.items()
        if set(EXPECTED_TASKS) - completed
    }
    participant_count = len(participant_answers)

    return {
        "status": "AVAILABLE",
        "studyScale": "EXPLORATORY" if participant_count < 20 else "FORMATIVE",
        "participants": participant_count,
        "taskAttempts": len(rows),
        "protocolCompleteness": {
            "expectedTasksPerParticipant": len(EXPECTED_TASKS),
            "completeParticipants": participant_count - len(incomplete_participants),
            "incompleteParticipants": incomplete_participants,
        },
        "sus": {
            **_mean_ci95(sus_scores),
            "median": statistics.median(sus_scores),
            "min": min(sus_scores),
            "max": max(sus_scores),
        },
        "tasks": task_summary,
        "devices": {
            device: {
                "participants": sum(
                    1 for value in participant_devices.values() if value == device
                ),
                **summarize_observations(observations),
            }
            for device, observations in sorted(devices.items())
        },
        "comments": comments,
        "interpretationNote": (
            "Đây là UAT khả dụng với mẫu thuận tiện. SUS và task success không tự "
            "chứng minh hiệu quả recommendation/AI hoặc khả năng vận hành production."
        ),
    }
