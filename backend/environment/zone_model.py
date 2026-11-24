"""
Pydantic data models for LPU campus entities, risk assessments, and patrol plans.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ZoneModel(BaseModel):
    zone_id: str = Field(..., description="Unique zone identifier e.g. Z01")
    name: str = Field(..., description="Human-readable campus zone name")
    category: str = Field(..., description="Category: Entrance, Administration, Academic, etc.")
    latitude: float = Field(..., description="WGS84 Latitude")
    longitude: float = Field(..., description="WGS84 Longitude")
    base_priority: int = Field(5, ge=1, le=10, description="Base priority ranking (1-10)")
    last_patrol_hours_ago: float = Field(0.0, ge=0.0, description="Hours elapsed since last security patrol")
    is_restricted: bool = Field(False, description="Whether zone is currently restricted")
    restriction_reason: Optional[str] = Field(None, description="Reason for restriction")
    is_accessible: bool = Field(True, description="Physical accessibility status")
    data_completeness: float = Field(1.0, ge=0.0, le=1.0, description="Confidence/completeness of zone data")
    description: str = Field("", description="Detailed campus zone description")
    historical_incidents_count: int = Field(0, ge=0, description="Number of recorded incidents")
    risk_score: Optional[float] = Field(None, description="Computed multi-factor risk score (0-100)")
    risk_level: Optional[str] = Field(None, description="Risk level: Low, Medium, High, Critical, Unknown")
    risk_color: Optional[str] = Field(None, description="Hex color code for map visualization")


class EdgeModel(BaseModel):
    edge_id: str = Field(..., description="Unique edge identifier e.g. E01")
    source: str = Field(..., description="Source zone ID")
    target: str = Field(..., description="Target zone ID")
    is_bidirectional: bool = Field(True, description="Whether pedestrian walkway is bidirectional")
    surface: str = Field("paved_walkway", description="Surface type e.g. paved_walkway, plaza")
    is_open: bool = Field(True, description="Whether walkway is currently open")
    is_restricted: bool = Field(False, description="Whether walkway has security restrictions")
    restriction_reason: Optional[str] = Field(None, description="Reason if restricted or closed")
    requires_clearance: bool = Field(False, description="Requires special security credentials")
    notes: Optional[str] = Field(None, description="Administrative notes")
    distance_meters: Optional[float] = Field(None, description="Calculated walking distance in meters")
    estimated_walk_minutes: Optional[float] = Field(None, description="Estimated foot transit time in minutes")


class IncidentModel(BaseModel):
    incident_id: str
    zone_id: str
    zone_name: str
    timestamp: str
    category: str
    severity: int = Field(..., ge=1, le=5, description="Severity score 1 (Minor) to 5 (Critical Emergency)")
    status: str = Field("ACTIVE", description="ACTIVE, INVESTIGATING, RESOLVED")
    description: str
    is_simulated: bool = Field(True, description="Flag indicating synthetic demonstration incident")


class IncidentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: ACTIVE, INVESTIGATING, or RESOLVED")
    resolution_notes: Optional[str] = Field(None, description="Operational notes or rationale for status transition")


class RiskScoreBreakdown(BaseModel):
    zone_id: str
    zone_name: str
    total_score: float
    risk_level: str
    risk_color: str
    confidence: float
    factors: Dict[str, float]
    justification: str


class PatrolStop(BaseModel):
    stop_number: int
    zone_id: str
    zone_name: str
    latitude: float
    longitude: float
    risk_score: float
    risk_level: str
    cumulative_distance_meters: float
    cumulative_time_minutes: float
    segment_distance_meters: float
    segment_time_minutes: float
    reason_for_visit: str


class PatrolPlanResult(BaseModel):
    plan_id: str
    created_at: str
    status: str = Field("PENDING_REVIEW", description="PENDING_REVIEW, APPROVED, REJECTED, EXCEPTION")
    start_zone_id: str
    end_zone_id: str
    time_budget_minutes: float
    total_distance_meters: float
    total_estimated_duration_minutes: float
    priority_coverage_percentage: float
    total_zones_visited: int
    total_campus_zones: int
    stops: List[PatrolStop]
    route_polyline_geojson: Dict[str, Any]
    skipped_high_risk_zones: List[str]
    explanations: List[str]
    applied_constraints: List[str]
    is_feasible: bool


class PatrolApprovalRequest(BaseModel):
    plan_id: str
    reviewer_name: str
    action: str = Field(..., description="APPROVE, REJECT, EXCEPTION")
    comments: Optional[str] = None


class ScenarioSimulationRequest(BaseModel):
    scenario_type: str = Field(
        ...,
        description="NEW_INCIDENT, PATH_CLOSURE, ZONE_LOCKDOWN, REDUCED_BUDGET, REOPEN_ALL"
    )
    target_zone_id: Optional[str] = None
    target_edge_id: Optional[str] = None
    incident_severity: Optional[int] = Field(3, ge=1, le=5)
    incident_category: Optional[str] = "SECURITY_ALERT"
    incident_description: Optional[str] = "Simulated campus security occurrence"
    new_time_budget_minutes: Optional[float] = None


class BaselineComparisonResult(BaseModel):
    scenario_name: str
    fixed_baseline: Dict[str, Any]
    adaptive_agent: Dict[str, Any]
    metric_differences: Dict[str, Any]
    summary_analysis: str
