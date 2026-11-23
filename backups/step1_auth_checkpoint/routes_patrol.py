"""
Patrol Planning, Replanning, and Human Approval API Endpoints.
Protected by Authentication Middleware and Role-Based Access Control (RBAC).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.environment.campus_environment import campus_env
from backend.agent.goal_based_agent import GoalBasedPatrolAgent
from backend.environment.zone_model import PatrolApprovalRequest
from backend.api.auth_middleware import get_current_user, require_role

router = APIRouter(prefix="/api/patrol", tags=["Patrol Agent"])

# Global agent instance
patrol_agent = GoalBasedPatrolAgent(campus_env)


@router.post("/plan")
def generate_patrol_plan(
    start_zone_id: str = "Z12",
    end_zone_id: str = "Z12",
    time_budget_minutes: float = 45.0,
    dwell_time_minutes: float = 2.0,
    current_hour: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    """
    Triggers the Goal-Based Intelligent Agent to generate an optimal constrained patrol route.
    Requires authenticated user (ADMIN or PATROL_OFFICER).
    """
    if user.get("role") not in ["ADMIN", "PATROL_OFFICER"]:
        raise HTTPException(
            status_code=403,
            detail="Role VIEWER is not authorized to generate new patrol plans.",
        )

    if not isinstance(current_hour, int):
        current_hour = None

    plan = patrol_agent.plan_patrol(
        start_zone_id=start_zone_id,
        end_zone_id=end_zone_id,
        time_budget_minutes=time_budget_minutes,
        dwell_time_minutes=dwell_time_minutes,
        current_hour=current_hour,
    )
    return plan


@router.post("/replan")
def dynamic_replan(
    trigger_description: str = "Simulated event trigger",
    start_zone_id: Optional[str] = None,
    end_zone_id: Optional[str] = None,
    time_budget_minutes: Optional[float] = None,
    user: dict = Depends(get_current_user),
):
    """
    Triggers dynamic patrol replanning following a campus event.
    Requires authenticated user (ADMIN or PATROL_OFFICER).
    """
    if user.get("role") not in ["ADMIN", "PATROL_OFFICER"]:
        raise HTTPException(
            status_code=403,
            detail="Role VIEWER is not authorized to trigger dynamic replanning.",
        )

    replanned = patrol_agent.replan_patrol(
        trigger_description=trigger_description,
        start_zone_id=start_zone_id,
        end_zone_id=end_zone_id,
        time_budget_minutes=time_budget_minutes,
    )
    return replanned


@router.get("/current")
def get_current_plan(user: dict = Depends(get_current_user)):
    """Returns the most recently generated patrol plan. Requires authentication."""
    if not patrol_agent.current_plan:
        patrol_agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)
    return patrol_agent.current_plan


@router.get("/history")
def get_plan_history(user: dict = Depends(get_current_user)):
    """Returns all patrol plans generated during this session. Requires authentication."""
    return {
        "history": patrol_agent.plan_history,
        "total_plans": len(patrol_agent.plan_history),
    }


@router.post("/approve")
def approve_patrol_plan(
    request: PatrolApprovalRequest,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """
    Human-in-the-loop approval workflow: STRICTLY RESTRICTED TO ADMIN (Chief Security Officer).
    Allows an administrator to APPROVE, REJECT, or mark a route as EXCEPTION.
    """
    target_plan = None
    for p in patrol_agent.plan_history:
        if p.get("plan_id") == request.plan_id:
            target_plan = p
            break

    if not target_plan:
        raise HTTPException(status_code=404, detail=f"Patrol plan {request.plan_id} not found.")

    reviewer = request.reviewer_name or user.get("full_name") or "Chief Security Officer"

    target_plan["status"] = request.action.upper()
    target_plan["reviewed_by"] = reviewer
    target_plan["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    target_plan["review_comments"] = request.comments or ""

    if request.action.upper() == "APPROVE":
        for stop in target_plan.get("stops", []):
            campus_env.mark_zone_patrolled(stop["zone_id"])

    return {
        "status": "SUCCESS",
        "plan_id": request.plan_id,
        "new_status": target_plan["status"],
        "reviewed_by": reviewer,
        "timestamp": target_plan["reviewed_at"],
    }
