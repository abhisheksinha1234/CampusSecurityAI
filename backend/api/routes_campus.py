"""
Campus GIS and Topology API Endpoints.
Provides zones, GeoJSON features, and NetworkX-compatible graph datasets for LPU.
Protected by Authentication Middleware and Role-Based Access Control (RBAC).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional

from backend.environment.campus_environment import campus_env
from backend.environment.zone_model import ZoneModel, EdgeModel
from backend.search.graph_builder import CampusGraphBuilder
from backend.risk_engine.risk_classifier import RiskClassifier
from backend.api.auth_middleware import get_current_user, require_role

router = APIRouter(prefix="/api/campus", tags=["Campus"])


@router.get("/zones")
def get_zones(
    include_risk: bool = Query(True),
    user: dict = Depends(get_current_user)
):
    """Returns all campus zones with live risk calculations. Requires authentication."""
    zones = campus_env.get_all_zones()
    if include_risk:
        for z in zones:
            active_incs = campus_env.get_active_incidents(z["zone_id"])
            risk_info = RiskClassifier.evaluate_zone_risk(z, active_incs)
            z["risk_score"] = risk_info["total_score"]
            z["risk_level"] = risk_info["risk_level"]
            z["risk_color"] = risk_info["risk_color"]
            z["risk_breakdown"] = risk_info
    return {"zones": zones, "total": len(zones), "last_updated": campus_env.last_updated}


@router.get("/zones/geojson")
def get_zones_geojson(user: dict = Depends(get_current_user)):
    """Returns all campus zones formatted as a GeoJSON FeatureCollection. Requires authentication."""
    zones = campus_env.get_all_zones()
    for z in zones:
        active_incs = campus_env.get_active_incidents(z["zone_id"])
        risk_info = RiskClassifier.evaluate_zone_risk(z, active_incs)
        z["risk_score"] = risk_info["total_score"]
        z["risk_level"] = risk_info["risk_level"]
        z["risk_color"] = risk_info["risk_color"]
    return campus_env.to_geojson()


@router.get("/zones/{zone_id}")
def get_zone_by_id(zone_id: str, user: dict = Depends(get_current_user)):
    """Retrieves detailed information for a single campus zone. Requires authentication."""
    zone = campus_env.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")

    active_incs = campus_env.get_active_incidents(zone_id)
    risk_info = RiskClassifier.evaluate_zone_risk(zone, active_incs)
    zone["risk_score"] = risk_info["total_score"]
    zone["risk_level"] = risk_info["risk_level"]
    zone["risk_color"] = risk_info["risk_color"]
    zone["risk_breakdown"] = risk_info
    zone["active_incidents"] = active_incs
    return zone


@router.post("/zones")
def create_zone(
    zone: ZoneModel,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """Registers a new campus security zone with validated coordinates. Restricted to ADMIN."""
    try:
        saved = campus_env.add_or_update_zone(zone.dict())
        return {"status": "SUCCESS", "message": f"Zone {zone.zone_id} added successfully.", "zone": saved}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/zones/{zone_id}/restriction")
def toggle_zone_restriction(
    zone_id: str,
    is_restricted: bool = Query(...),
    reason: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """Restricts or reopens a campus zone. Restricted to ADMIN."""
    success = campus_env.set_zone_restriction(zone_id, is_restricted, reason)
    if not success:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")
    return {
        "status": "SUCCESS",
        "zone_id": zone_id,
        "is_restricted": is_restricted,
        "reason": reason,
    }


@router.get("/graph")
def get_graph(user: dict = Depends(get_current_user)):
    """Returns the topological graph representation. Requires authentication."""
    zones = campus_env.get_all_zones()
    edges = campus_env.get_all_edges()
    graph = CampusGraphBuilder.build_graph(zones, edges, include_closed_edges=True)
    summary = CampusGraphBuilder.get_graph_summary(graph)

    return {
        "summary": summary,
        "nodes": list(graph.nodes(data=True)),
        "edges": edges,
    }


@router.put("/edges/{edge_id}/status")
def toggle_edge_status(
    edge_id: str,
    is_open: bool = Query(...),
    restriction_reason: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN"])),
):
    """Closes or reopens a walkable campus path. Restricted to ADMIN."""
    success = campus_env.set_edge_status(edge_id, is_open, restriction_reason)
    if not success:
        raise HTTPException(status_code=404, detail=f"Edge {edge_id} not found.")
    return {
        "status": "SUCCESS",
        "edge_id": edge_id,
        "is_open": is_open,
        "restriction_reason": restriction_reason,
    }
