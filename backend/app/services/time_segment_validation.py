from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

EPSILON = 1e-9


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def _to_float(value: Any) -> Optional[float]:
    if _is_number(value):
        return float(value)
    return None


def _is_close(a: float, b: float, eps: float = EPSILON) -> bool:
    return abs(a - b) <= eps


def normalize_time_segments(raw_segments: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_segments, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for idx, raw_segment in enumerate(raw_segments):
        if not isinstance(raw_segment, dict):
            normalized.append(
                {
                    "id": f"seg_{idx + 1}",
                    "startHour": None,
                    "endHour": None,
                    "edgeOverrides": {},
                }
            )
            continue

        segment_id = str(raw_segment.get("id") or f"seg_{idx + 1}")
        start_hour = raw_segment.get("startHour", raw_segment.get("start_hour"))
        end_hour = raw_segment.get("endHour", raw_segment.get("end_hour"))
        raw_edge_overrides = raw_segment.get(
            "edgeOverrides", raw_segment.get("edge_overrides", {})
        )

        edge_overrides: Dict[str, Any] = {}
        if isinstance(raw_edge_overrides, dict):
            for edge_id, raw_override in raw_edge_overrides.items():
                edge_key = str(edge_id)
                override_dict = raw_override if isinstance(raw_override, dict) else {}
                flow_value = override_dict.get("flow")

                raw_factors = override_dict.get("factors")
                factors: Dict[str, Any] = {}
                if isinstance(raw_factors, dict):
                    for param_name, raw_ab in raw_factors.items():
                        ab = raw_ab if isinstance(raw_ab, dict) else {}
                        factors[str(param_name)] = {
                            "a": ab.get("a"),
                            "b": ab.get("b"),
                        }

                edge_overrides[edge_key] = {
                    "flow": flow_value,
                    "factors": factors,
                }

        normalized.append(
            {
                "id": segment_id,
                "startHour": start_hour,
                "endHour": end_hour,
                "edgeOverrides": edge_overrides,
            }
        )

    return normalized


def convert_time_segments_to_input(
    normalized_segments: Optional[List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    if not normalized_segments:
        return []

    converted: List[Dict[str, Any]] = []
    for segment in normalized_segments:
        edge_overrides: Dict[str, Any] = {}
        raw_edge_overrides = segment.get("edgeOverrides", {})
        if isinstance(raw_edge_overrides, dict):
            for edge_id, raw_override in raw_edge_overrides.items():
                factors: Dict[str, Any] = {}
                raw_factors = (
                    raw_override.get("factors", {})
                    if isinstance(raw_override, dict)
                    else {}
                )
                if isinstance(raw_factors, dict):
                    for param_name, raw_ab in raw_factors.items():
                        if not isinstance(raw_ab, dict):
                            continue
                        factors[str(param_name)] = {
                            "a": raw_ab.get("a"),
                            "b": raw_ab.get("b"),
                        }
                edge_overrides[str(edge_id)] = {
                    "flow": raw_override.get("flow")
                    if isinstance(raw_override, dict)
                    else None,
                    "factors": factors,
                }

        converted.append(
            {
                "id": str(segment.get("id")),
                "start_hour": float(segment.get("startHour")),
                "end_hour": float(segment.get("endHour")),
                "edge_overrides": edge_overrides,
            }
        )

    return converted


def validate_time_segments(
    time_segments: Optional[List[Dict[str, Any]]],
    total_hours: Any,
    edge_ids: Optional[List[str]] = None,
    parameter_names: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    if not time_segments:
        return []

    errors: List[Dict[str, Any]] = []
    valid_edge_ids = {str(edge_id) for edge_id in (edge_ids or [])}
    valid_parameter_names = {
        str(parameter_name) for parameter_name in (parameter_names or [])
    }
    normalized_segments = normalize_time_segments(time_segments)

    if len(normalized_segments) == 0:
        errors.append(
            {
                "code": "SEGMENT_EMPTY",
                "message": "At least one segment is required",
            }
        )
        return errors

    parsed_total_hours = _to_float(total_hours)
    if parsed_total_hours is None or parsed_total_hours <= 0:
        errors.append(
            {
                "code": "SEGMENT_END_NOT_EQUAL_HOURS",
                "message": "Invalid simulation hours",
            }
        )
        return errors

    parsed_segments: List[Dict[str, Any]] = []
    for segment in normalized_segments:
        segment_id = str(segment.get("id") or "")
        start_hour = _to_float(segment.get("startHour"))
        end_hour = _to_float(segment.get("endHour"))

        if start_hour is None or end_hour is None:
            errors.append(
                {
                    "code": "SEGMENT_INVALID_VALUE",
                    "message": "Segment startHour/endHour must be finite numbers",
                    "segment_id": segment_id,
                }
            )
            continue

        if start_hour < 0:
            errors.append(
                {
                    "code": "SEGMENT_INVALID_VALUE",
                    "message": "Segment startHour must be >= 0",
                    "segment_id": segment_id,
                }
            )

        if end_hour <= start_hour:
            errors.append(
                {
                    "code": "SEGMENT_INVALID_VALUE",
                    "message": "Segment endHour must be greater than startHour",
                    "segment_id": segment_id,
                }
            )

        raw_edge_overrides = segment.get("edgeOverrides", {})
        if isinstance(raw_edge_overrides, dict):
            for edge_id, raw_override in raw_edge_overrides.items():
                edge_key = str(edge_id)
                if valid_edge_ids and edge_key not in valid_edge_ids:
                    errors.append(
                        {
                            "code": "SEGMENT_EDGE_NOT_FOUND",
                            "message": f"Edge override references unknown edge: {edge_key}",
                            "segment_id": segment_id,
                            "edge_id": edge_key,
                        }
                    )
                    continue

                if not isinstance(raw_override, dict):
                    errors.append(
                        {
                            "code": "SEGMENT_INVALID_VALUE",
                            "message": "Edge override must be an object",
                            "segment_id": segment_id,
                            "edge_id": edge_key,
                        }
                    )
                    continue

                flow_value = raw_override.get("flow")
                if flow_value is not None:
                    parsed_flow = _to_float(flow_value)
                    if parsed_flow is None or parsed_flow < 0:
                        errors.append(
                            {
                                "code": "SEGMENT_INVALID_VALUE",
                                "message": "Override flow must be a finite number >= 0",
                                "segment_id": segment_id,
                                "edge_id": edge_key,
                            }
                        )

                raw_factors = raw_override.get("factors", {})
                if isinstance(raw_factors, dict):
                    for param_name, raw_ab in raw_factors.items():
                        parameter_key = str(param_name)
                        if (
                            valid_parameter_names
                            and parameter_key not in valid_parameter_names
                        ):
                            errors.append(
                                {
                                    "code": "SEGMENT_PARAM_NOT_FOUND",
                                    "message": f"Override references unknown parameter: {parameter_key}",
                                    "segment_id": segment_id,
                                    "edge_id": edge_key,
                                    "param_name": parameter_key,
                                }
                            )
                            continue

                        if not isinstance(raw_ab, dict):
                            errors.append(
                                {
                                    "code": "SEGMENT_INVALID_VALUE",
                                    "message": "Override factor must be an object",
                                    "segment_id": segment_id,
                                    "edge_id": edge_key,
                                    "param_name": parameter_key,
                                }
                            )
                            continue

                        a_value = raw_ab.get("a")
                        b_value = raw_ab.get("b")
                        if a_value is not None and _to_float(a_value) is None:
                            errors.append(
                                {
                                    "code": "SEGMENT_INVALID_VALUE",
                                    "message": "Override factor 'a' must be a finite number",
                                    "segment_id": segment_id,
                                    "edge_id": edge_key,
                                    "param_name": parameter_key,
                                }
                            )
                        if b_value is not None and _to_float(b_value) is None:
                            errors.append(
                                {
                                    "code": "SEGMENT_INVALID_VALUE",
                                    "message": "Override factor 'b' must be a finite number",
                                    "segment_id": segment_id,
                                    "edge_id": edge_key,
                                    "param_name": parameter_key,
                                }
                            )

        parsed_segments.append(
            {
                "id": segment_id,
                "startHour": start_hour,
                "endHour": end_hour,
            }
        )

    if errors:
        return errors

    parsed_segments = sorted(parsed_segments, key=lambda item: item["startHour"])
    if not parsed_segments:
        return errors

    first_segment = parsed_segments[0]
    if not _is_close(first_segment["startHour"], 0.0):
        errors.append(
            {
                "code": "SEGMENT_START_NOT_ZERO",
                "message": "First segment must start at 0",
                "segment_id": first_segment["id"],
            }
        )

    for idx in range(1, len(parsed_segments)):
        previous = parsed_segments[idx - 1]
        current = parsed_segments[idx]
        if current["startHour"] > previous["endHour"] + EPSILON:
            errors.append(
                {
                    "code": "SEGMENT_GAP",
                    "message": "Segments contain gap",
                    "segment_id": current["id"],
                }
            )
        elif current["startHour"] < previous["endHour"] - EPSILON:
            errors.append(
                {
                    "code": "SEGMENT_OVERLAP",
                    "message": "Segments overlap",
                    "segment_id": current["id"],
                }
            )

    last_segment = parsed_segments[-1]
    if not _is_close(last_segment["endHour"], parsed_total_hours):
        errors.append(
            {
                "code": "SEGMENT_END_NOT_EQUAL_HOURS",
                "message": "Segments must end exactly at simulation hours",
                "segment_id": last_segment["id"],
            }
        )

    return errors
