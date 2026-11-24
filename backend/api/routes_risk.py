"""
Risk Assessment and Incident Management API Endpoints.
Protected by Authentication Middleware and Role-Based Access Control (RBAC).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.environment.campus_environment import campus_env
from backend.risk_engine.risk_classifier import RiskClassifier
from backend.risk_engine.incident_evaluator import IncidentEvaluator
from backend.environment.zone_model import IncidentModel, IncidentStatusUpdateRequest
from backend.explanations.explainability_engine import ExplainabilityEngine
from backend.api.auth_middleware import get_current_user, require_role
from backend.api.routes_patrol import patrol_agent

router = APIRouter(prefix="/api/risk", tags=["Risk Engine"])


@router.get("/scores")
def get_risk_scores(
    current_hour: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """Returns calculated 8-factor risk scores and classifications. Requires authentication."""
    if not isinstance(current_hour, int):
        current_hour = None
    zones = campus_env.get_all_zones()
    scores = []
    for z in zones:
        active_incs = campus_env.get_active_incidents(z["zone_id"])
        risk_res = RiskClassifier.evaluate_zone_risk(z, active_incs, current_hour=current_hour)
        scores.append(risk_res)
    return {"risk_evaluations": scores, "total_zones": len(scores)}


@router.get("/zones/{zone_id}/explain")
def explain_zone_risk(zone_id: str, user: dict = Depends(get_current_user)):
    """Provides explainable AI breakdown for a zone's security assessment. Requires authentication."""
    zone = campus_env.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")

    active_incs = campus_env.get_active_incidents(zone_id)
    risk_res = RiskClassifier.evaluate_zone_risk(zone, active_incs)
    explanation = ExplainabilityEngine.generate_zone_explanation(risk_res)

    return {
        "zone_id": zone_id,
        "zone_name": zone.get("name"),
        "risk_evaluation": risk_res,
        "explanation": explanation,
    }


@router.get("/incidents")
def get_incidents(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Returns campus incidents. Requires authentication."""
    incidents = campus_env.incidents
    if status and isinstance(status, str):
        incidents = [inc for inc in incidents if inc.get("status") == status]
    return {"incidents": incidents, "count": len(incidents)}


@router.post("/incidents")
def report_incident(
    incident: IncidentModel,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN", "PATROL_OFFICER"])),
):
    """Reports a new campus security incident. Restricted to ADMIN and PATROL_OFFICER."""
    created = campus_env.add_incident(incident.dict())
    return {
        "status": "SUCCESS",
        "message": f"Incident {incident.incident_id} recorded in {incident.zone_name}.",
        "incident": created,
    }


@router.put("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdateRequest,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN", "PATROL_OFFICER"])),
):
    """
    Updates the operational lifecycle status of an incident:
    ACTIVE -> INVESTIGATING -> RESOLVED.
    Recalculates the affected zone's risk score and triggers agent replanning.
    Restricted to ADMIN and PATROL_OFFICER.
    """
    if user.get("role") not in ["ADMIN", "PATROL_OFFICER"]:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.get('role')}' is not authorized to update incident status. Required: ['ADMIN', 'PATROL_OFFICER'].",
        )

    operator_name = user.get("full_name") or user.get("username") or "Security Personnel"

    try:
        updated_incident = campus_env.update_incident_status(
            incident_id=incident_id,
            new_status=payload.status,
            resolution_notes=payload.resolution_notes,
            updated_by=operator_name,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Recalculate affected zone risk
    zone_id = updated_incident.get("zone_id")
    affected_zone_summary = None
    if zone_id and zone_id in campus_env.zones:
        zone = campus_env.zones[zone_id]
        active_incs = campus_env.get_active_incidents(zone_id)
        risk_info = RiskClassifier.evaluate_zone_risk(zone, active_incs)
        zone["risk_score"] = risk_info["total_score"]
        zone["risk_level"] = risk_info["risk_level"]
        zone["risk_color"] = risk_info["risk_color"]
        zone["risk_breakdown"] = risk_info
        affected_zone_summary = {
            "zone_id": zone_id,
            "name": zone.get("name", zone_id),
            "risk_score": zone["risk_score"],
            "risk_level": zone["risk_level"],
            "risk_color": zone["risk_color"],
            "active_incidents_count": len(active_incs),
        }

    # Trigger patrol replanning if resolved
    if payload.status.upper() == "RESOLVED":
        try:
            zone_label = affected_zone_summary["name"] if affected_zone_summary else zone_id
            patrol_agent.replan_patrol(
                trigger_description=f"Incident {incident_id} in {zone_label} marked as RESOLVED."
            )
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "message": f"Incident {incident_id} status updated to {updated_incident['status']}.",
        "incident": updated_incident,
        "affected_zone": affected_zone_summary,
    }
