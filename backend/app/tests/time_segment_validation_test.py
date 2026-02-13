import pytest

from app.services.time_segment_validation import (
    normalize_time_segments,
    validate_time_segments,
)


def test_normalize_time_segments_supports_camel_and_snake_case() -> None:
    raw = [
        {
            "id": "seg_a",
            "startHour": 0,
            "endHour": 12,
            "edgeOverrides": {
                "edge_1": {
                    "flow": 120.0,
                    "factors": {"COD": {"a": 1.2, "b": 0.5}},
                }
            },
        },
        {
            "id": "seg_b",
            "start_hour": 12,
            "end_hour": 24,
            "edge_overrides": {"edge_1": {"flow": 80.0}},
        },
    ]

    normalized = normalize_time_segments(raw)

    assert len(normalized) == 2
    assert normalized[0]["startHour"] == 0
    assert normalized[1]["startHour"] == 12
    assert normalized[1]["edgeOverrides"]["edge_1"]["flow"] == 80.0


def test_validate_time_segments_accepts_full_coverage_segments() -> None:
    errors = validate_time_segments(
        time_segments=[
            {
                "id": "seg_1",
                "startHour": 0,
                "endHour": 12,
                "edgeOverrides": {
                    "edge_1": {
                        "flow": 100.0,
                        "factors": {"COD": {"a": 1.0, "b": 0.0}},
                    }
                },
            },
            {
                "id": "seg_2",
                "startHour": 12,
                "endHour": 24,
                "edgeOverrides": {"edge_1": {"flow": 80.0}},
            },
        ],
        total_hours=24,
        edge_ids=["edge_1"],
        parameter_names=["COD"],
    )

    assert errors == []


@pytest.mark.parametrize(
    ("segments", "expected_error_code"),
    [
        (
            [
                {"id": "seg_1", "startHour": 0, "endHour": 12},
                {"id": "seg_2", "startHour": 11, "endHour": 24},
            ],
            "SEGMENT_OVERLAP",
        ),
        (
            [
                {"id": "seg_1", "startHour": 0, "endHour": 10},
                {"id": "seg_2", "startHour": 12, "endHour": 24},
            ],
            "SEGMENT_GAP",
        ),
        (
            [
                {"id": "seg_1", "startHour": 1, "endHour": 24},
            ],
            "SEGMENT_START_NOT_ZERO",
        ),
    ],
)
def test_validate_time_segments_rejects_invalid_ranges(
    segments: list[dict],
    expected_error_code: str,
) -> None:
    errors = validate_time_segments(
        time_segments=segments,
        total_hours=24,
        edge_ids=["edge_1"],
        parameter_names=["COD"],
    )

    assert any(error["code"] == expected_error_code for error in errors)


def test_validate_time_segments_rejects_unknown_edge_and_param() -> None:
    edge_errors = validate_time_segments(
        time_segments=[
            {
                "id": "seg_1",
                "startHour": 0,
                "endHour": 24,
                "edgeOverrides": {
                    "missing_edge": {
                        "flow": 100.0,
                        "factors": {"UNKNOWN": {"a": 1.0}},
                    }
                },
            }
        ],
        total_hours=24,
        edge_ids=["edge_1"],
        parameter_names=["COD"],
    )

    param_errors = validate_time_segments(
        time_segments=[
            {
                "id": "seg_1",
                "startHour": 0,
                "endHour": 24,
                "edgeOverrides": {
                    "edge_1": {
                        "factors": {"UNKNOWN": {"a": 1.0}},
                    }
                },
            }
        ],
        total_hours=24,
        edge_ids=["edge_1"],
        parameter_names=["COD"],
    )

    edge_codes = {error["code"] for error in edge_errors}
    param_codes = {error["code"] for error in param_errors}
    assert "SEGMENT_EDGE_NOT_FOUND" in edge_codes
    assert "SEGMENT_PARAM_NOT_FOUND" in param_codes
