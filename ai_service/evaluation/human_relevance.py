"""Chuẩn bị và phân tích pilot relevance mù; không tự sinh rating."""

from __future__ import annotations

import hashlib
import json
import math
import random
from collections import defaultdict
from typing import Any, Iterable


ALGORITHMS = ("content", "behavior", "hybrid")
MIN_PARTICIPANTS = 10
MAX_PARTICIPANTS = 20


def prepare_blinded_assignments(
    candidates: Iterable[dict[str, Any]],
    seed: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for row in candidates:
        participant = str(row["participant_code"]).strip()
        book_id = str(row["book_id"]).strip()
        algorithm = str(row["algorithm"]).strip().lower()
        rank = int(row["rank"])
        if not participant or not book_id or algorithm not in ALGORITHMS:
            raise ValueError("Candidate thiếu participant/book hoặc algorithm không hợp lệ.")
        if not 1 <= rank <= 10:
            raise ValueError("Rank candidate phải nằm trong 1..10.")
        key = (participant, book_id)
        item = grouped.setdefault(
            key,
            {
                "participant_code": participant,
                "book_id": book_id,
                "memberships": [],
            },
        )
        membership = {"algorithm": algorithm, "rank": rank}
        if membership in item["memberships"]:
            raise ValueError("Candidate algorithm/rank bị trùng.")
        item["memberships"].append(membership)

    by_participant: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in grouped.values():
        by_participant[item["participant_code"]].append(item)

    public_rows: list[dict[str, Any]] = []
    secret_rows: list[dict[str, Any]] = []
    for participant in sorted(by_participant):
        items = sorted(by_participant[participant], key=lambda item: item["book_id"])
        randomizer = random.Random(f"{seed}:{participant}")
        randomizer.shuffle(items)
        for display_order, item in enumerate(items, start=1):
            assignment_id = hashlib.sha256(
                f"{seed}:{participant}:{item['book_id']}".encode("utf-8")
            ).hexdigest()[:20]
            public_rows.append(
                {
                    "assignment_id": assignment_id,
                    "participant_code": participant,
                    "display_order": display_order,
                    "book_id": item["book_id"],
                    "consent": "",
                    "relevance_rating_1_5": "",
                    "note_optional": "",
                }
            )
            secret_rows.append(
                {
                    "assignment_id": assignment_id,
                    "participant_code": participant,
                    "book_id": item["book_id"],
                    "algorithm_ranks_json": json.dumps(
                        sorted(
                            item["memberships"],
                            key=lambda value: (value["algorithm"], value["rank"]),
                        ),
                        separators=(",", ":"),
                    ),
                }
            )
    return public_rows, secret_rows


def _dcg(relevances: list[float]) -> float:
    return sum(
        (2**relevance - 1) / math.log2(index + 2)
        for index, relevance in enumerate(relevances)
    )


def analyze_blinded_ratings(
    rating_rows: Iterable[dict[str, Any]],
    secret_rows: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    secret_by_assignment = {
        str(row["assignment_id"]): row for row in secret_rows
    }
    ratings: dict[str, float] = {}
    participants: set[str] = set()
    for row in rating_rows:
        assignment_id = str(row["assignment_id"]).strip()
        if assignment_id in ratings:
            raise ValueError("Assignment bị rating trùng.")
        secret = secret_by_assignment.get(assignment_id)
        if not secret:
            raise ValueError("Assignment không tồn tại trong secret key.")
        if str(row.get("consent", "")).strip().upper() != "YES":
            raise ValueError("Chỉ phân tích dòng có consent=YES.")
        rating = float(row["relevance_rating_1_5"])
        if rating not in {1, 2, 3, 4, 5}:
            raise ValueError("Relevance rating phải là số nguyên 1..5.")
        ratings[assignment_id] = rating
        participants.add(str(secret["participant_code"]))

    if not MIN_PARTICIPANTS <= len(participants) <= MAX_PARTICIPANTS:
        return {
            "status": "NOT_AVAILABLE",
            "studyType": "PILOT_BLINDED_HUMAN_RELEVANCE",
            "participants": len(participants),
            "reason": f"Cần {MIN_PARTICIPANTS}–{MAX_PARTICIPANTS} người có consent và rating đầy đủ.",
            "metrics": None,
        }

    per_user_algorithm: dict[tuple[str, str], list[tuple[int, float]]] = defaultdict(list)
    for assignment_id, rating in ratings.items():
        secret = secret_by_assignment[assignment_id]
        memberships = json.loads(str(secret["algorithm_ranks_json"]))
        for membership in memberships:
            per_user_algorithm[
                (str(secret["participant_code"]), str(membership["algorithm"]))
            ].append((int(membership["rank"]), rating))

    incomplete = [
        f"{participant}:{algorithm}"
        for participant in sorted(participants)
        for algorithm in ALGORITHMS
        if len(per_user_algorithm.get((participant, algorithm), [])) != 10
    ]
    if incomplete:
        return {
            "status": "NOT_AVAILABLE",
            "studyType": "PILOT_BLINDED_HUMAN_RELEVANCE",
            "participants": len(participants),
            "reason": "Mỗi người phải rating đủ top-10 của cả ba thuật toán.",
            "incompleteProfiles": incomplete,
            "metrics": None,
        }

    algorithm_values: dict[str, dict[str, list[float]]] = {
        algorithm: {"ndcg": [], "precision": [], "meanRelevance": []}
        for algorithm in ALGORITHMS
    }
    for (_, algorithm), ranked in per_user_algorithm.items():
        ranked.sort(key=lambda value: value[0])
        relevances = [rating for _, rating in ranked[:10]]
        ideal = sorted(relevances, reverse=True)
        ideal_dcg = _dcg(ideal)
        algorithm_values[algorithm]["ndcg"].append(
            _dcg(relevances) / ideal_dcg if ideal_dcg else 0.0
        )
        algorithm_values[algorithm]["precision"].append(
            sum(rating >= 4 for rating in relevances) / 10
        )
        algorithm_values[algorithm]["meanRelevance"].append(
            sum(relevances) / len(relevances)
        )

    metrics = {}
    for algorithm, values in algorithm_values.items():
        if not values["ndcg"]:
            metrics[algorithm] = {"status": "NOT_AVAILABLE"}
            continue
        metrics[algorithm] = {
            "status": "AVAILABLE",
            "profiles": len(values["ndcg"]),
            "ndcgAt10": sum(values["ndcg"]) / len(values["ndcg"]),
            "precisionAt10": sum(values["precision"]) / len(values["precision"]),
            "meanRelevance": sum(values["meanRelevance"])
            / len(values["meanRelevance"]),
        }
    return {
        "status": "AVAILABLE",
        "studyType": "PILOT_BLINDED_HUMAN_RELEVANCE",
        "participants": len(participants),
        "metrics": metrics,
        "limitations": [
            "Đây là perceived relevance pilot, không phải CTR hoặc production effect.",
            "Không kiểm định ý nghĩa thống kê mạnh với 10–20 người.",
        ],
    }
