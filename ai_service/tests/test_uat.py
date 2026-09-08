from __future__ import annotations

import pytest

from ai_service.evaluation.uat import analyze_uat, calculate_sus


def test_sus_standard_formula() -> None:
    assert calculate_sus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) == 100
    assert calculate_sus([3] * 10) == 50


def test_uat_summary_groups_tasks_and_participants() -> None:
    base = {
        "consent": "1",
        "device": "desktop",
        "success": "1",
        "duration_seconds": "30",
        "error_count": "0",
        "assistance_count": "0",
        **{f"sus_q{index}": ("5" if index % 2 else "1") for index in range(1, 11)},
        "comment": "",
    }
    result = analyze_uat(
        [
            {**base, "participant_id": "P01", "task_id": "T01"},
            {**base, "participant_id": "P01", "task_id": "T02"},
            {**base, "participant_id": "P02", "task_id": "T01", "success": "0"},
        ]
    )
    assert result["participants"] == 2
    assert result["tasks"]["T01"]["successRate"] == 0.5
    assert result["sus"]["mean"] == 100
    assert result["devices"]["desktop"]["participants"] == 2
    assert result["protocolCompleteness"]["completeParticipants"] == 0


def test_uat_rejects_inconsistent_sus_answers() -> None:
    first = {
        "participant_id": "P01",
        "consent": "1",
        "device": "mobile",
        "task_id": "T01",
        "success": "1",
        "duration_seconds": "30",
        "error_count": "0",
        "assistance_count": "0",
        **{f"sus_q{index}": "3" for index in range(1, 11)},
        "comment": "",
    }
    second = {**first, "task_id": "T02", "sus_q1": "4"}
    with pytest.raises(ValueError, match="không nhất quán"):
        analyze_uat([first, second])


def test_uat_rejects_missing_consent_and_duplicate_task() -> None:
    base = {
        "participant_id": "P01",
        "consent": "0",
        "device": "desktop",
        "task_id": "T01",
        "success": "1",
        "duration_seconds": "30",
        "error_count": "0",
        "assistance_count": "0",
        **{f"sus_q{index}": "3" for index in range(1, 11)},
        "comment": "",
    }
    with pytest.raises(ValueError, match="đồng thuận"):
        analyze_uat([base])

    consented = {**base, "consent": "1"}
    with pytest.raises(ValueError, match="trùng task"):
        analyze_uat([consented, consented])
