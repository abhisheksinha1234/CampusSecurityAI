"""
Explainable AI (XAI) Engine for Campus Security Patrol Planning.
Produces human-readable natural language justifications for patrol prioritization,
route selection, and dynamic replanning triggers.
"""

from typing import Dict, Any, List


class ExplainabilityEngine:
    """Generates transparent, structured justifications for AI security decisions."""

    @staticmethod
    def generate_zone_explanation(risk_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Provides human-readable breakdown of why a zone received its risk score."""
        zone_name = risk_breakdown.get("zone_name", "Zone")
        total_score = risk_breakdown.get("total_score", 0.0)
        level = risk_breakdown.get("risk_level", "Unknown")
        factors = risk_breakdown.get("factors", {})

        top_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)[:3]
        factor_strings = [f"{k.replace('_', ' ').capitalize()} ({v:.0f}/100)" for k, v in top_factors if v > 0]

        summary = f"{zone_name} is classified as {level} Risk ({total_score:.0f}/100)."
        if factor_strings:
            details = "Primary contributing factors: " + ", ".join(factor_strings) + "."
        else:
            details = "Minimal security anomalies observed across all monitoring parameters."

        return {
            "summary": summary,
            "details": details,
            "top_factors": top_factors,
            "confidence_rating": f"{risk_breakdown.get('confidence', 1.0) * 100:.0f}%",
        }

    @staticmethod
    def generate_plan_explanation(
        plan_result: Dict[str, Any],
        triggered_rules: List[Dict[str, Any]] = None
    ) -> List[str]:
        """Synthesizes explanations for the overall patrol sequence."""
        explanations = []
        stops = plan_result.get("stops", [])
        num_stops = len(stops)
        duration = plan_result.get("total_estimated_duration_minutes", 0.0)
        dist = plan_result.get("total_distance_meters", 0.0)
        coverage = plan_result.get("priority_coverage_percentage", 0.0)

        explanations.append(
            f"Optimized patrol itinerary visits {num_stops} locations covering {dist:.0f} meters in approximately {duration:.1f} minutes."
        )
        explanations.append(
            f"High-priority campus security coverage attained: {coverage:.1f}%."
        )

        if triggered_rules:
            for rule in triggered_rules:
                explanations.append(f"Policy Action ({rule['rule_name']}): {rule['message']}")

        skipped = plan_result.get("skipped_high_risk_zones", [])
        if skipped:
            explanations.append(
                f"Operational Trade-off: Zones [{', '.join(skipped)}] omitted due to the max patrol time budget constraint."
            )

        return explanations

    @staticmethod
    def explain_replanning_change(
        old_plan: Dict[str, Any],
        new_plan: Dict[str, Any],
        trigger_event: str
    ) -> Dict[str, Any]:
        """Explains why the patrol route adapted after a campus event."""
        old_stops = [s["zone_id"] for s in old_plan.get("stops", [])]
        new_stops = [s["zone_id"] for s in new_plan.get("stops", [])]

        added_stops = [s for s in new_stops if s not in old_stops]
        removed_stops = [s for s in old_stops if s not in new_stops]

        reasons = [f"Route replanned in response to: {trigger_event}."]

        if added_stops:
            reasons.append(f"Added priority patrol visits to zones: {', '.join(added_stops)}.")
        if removed_stops:
            reasons.append(f"Diverted away from or deferred zones: {', '.join(removed_stops)}.")

        dur_diff = new_plan.get("total_estimated_duration_minutes", 0.0) - old_plan.get("total_estimated_duration_minutes", 0.0)
        dist_diff = new_plan.get("total_distance_meters", 0.0) - old_plan.get("total_distance_meters", 0.0)

        reasons.append(
            f"Impact on patrol execution: Distance changed by {dist_diff:+.0f}m, duration changed by {dur_diff:+.1f} mins."
        )

        return {
            "trigger_event": trigger_event,
            "added_zones": added_stops,
            "removed_zones": removed_stops,
            "duration_delta_minutes": round(dur_diff, 1),
            "distance_delta_meters": round(dist_diff, 1),
            "justification_narrative": " ".join(reasons),
        }
