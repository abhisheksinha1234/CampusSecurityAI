"""
Campus Scenario Simulator API Endpoints.
Allows interactive simulation of security events, walkway closures, and campus alerts.
Protected by Authentication Middleware (Restricted to ADMIN).
"""

from fastapi import APIRouter, HTTPException, Depends
import uuid
from datetime import datetime

from backend.environment.campus_environment import campus_env
from backend.api.routes_patrol import patrol_agent
from backend.environment.zone_model import ScenarioSimulationRequest
from backend.risk_engine.incident_evaluator import IncidentEvaluator
from backend.api.auth_middleware import get_current_user, require_role

router = APIRouter(prefix="/api/scenarios", tags=["Scenario Simulator"])


@router.post("/simulate")
def simulate_scenario(
    req: ScenarioSimulationRequest,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """
    Executes a simulated real-time event and automatically triggers agent dynamic replanning.
    Restricted to ADMIN.
    """
    event_type = req.scenario_type.upper()
    trigger_message = ""

    if event_type == "NEW_INCIDENT":
        target_zone_id = req.target_zone_id or "Z04"
        zone = campus_env.get_zone(target_zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail=f"Zone {target_zone_id} not found.")

        inc_id = f"SIM-{uuid.uuid4().hex[:6].upper()}"
        inc = IncidentEvaluator.create_simulated_incident(
            incident_id=inc_id,
            zone_id=target_zone_id,
            zone_name=zone.get("name", target_zone_id),
            category=req.incident_category or "SECURITY_ALERT",
            severity=req.incident_severity or 4,
            description=req.incident_description or "Simulated critical event trigger."
        )
        campus_env.add_incident(inc)
        trigger_message = f"New simulated incident {inc_id} (Severity {req.incident_severity}) reported in {zone.get('name')}."

    elif event_type == "PATH_CLOSURE":
        target_edge_id = req.target_edge_id or "E10"
        edge = campus_env.get_edge(target_edge_id)
        if not edge:
            raise HTTPException(status_code=404, detail=f"Edge {target_edge_id} not found.")

        campus_env.set_edge_status(target_edge_id, is_open=False, restriction_reason="Simulated emergency path closure.")
        trigger_message = f"Walkway {target_edge_id} ({edge['source']} <-> {edge['target']}) closed due to obstruction."

    elif event_type == "ZONE_LOCKDOWN":
        target_zone_id = req.target_zone_id or "Z11"
        zone = campus_env.get_zone(target_zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail=f"Zone {target_zone_id} not found.")

        campus_env.set_zone_restriction(target_zone_id, is_restricted=True, reason="Simulated emergency safety lockdown.")
        trigger_message = f"Emergency safety perimeter: Zone {zone.get('name')} ({target_zone_id}) restricted from regular patrol entrance."

    elif event_type == "REDUCED_BUDGET":
        new_budget = req.new_time_budget_minutes or 25.0
        trigger_message = f"Patrol shift curtailed to emergency time budget of {new_budget} minutes."

    elif event_type == "REOPEN_ALL":
        for edge_id in campus_env.edges:
            campus_env.set_edge_status(edge_id, is_open=True, restriction_reason=None)
        for zone_id in campus_env.zones:
            campus_env.set_zone_restriction(zone_id, is_restricted=False, reason=None)
        trigger_message = "All campus zones and pedestrian walkways restored to normal operational access."

    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario type: {req.scenario_type}")

    # Immediately trigger adaptive agent replanning
    new_budget = req.new_time_budget_minutes if event_type == "REDUCED_BUDGET" else None
    replanned_result = patrol_agent.replan_patrol(
        trigger_description=trigger_message,
        time_budget_minutes=new_budget
    )

    return {
        "status": "SUCCESS",
        "scenario_type": event_type,
        "trigger_message": trigger_message,
        "replanned_plan": replanned_result,
        "last_updated": campus_env.last_updated,
    }


@router.post("/reset")
def reset_to_baseline(
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """Resets the campus environment to default initial state. Restricted to ADMIN."""
    campus_env.reload_from_disk()
    patrol_agent.current_plan = None
    patrol_agent.plan_history.clear()
    initial_plan = patrol_agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)

    return {
        "status": "SUCCESS",
        "message": "Campus environment and agent state reset to default baseline.",
        "initial_plan": initial_plan,
    }
