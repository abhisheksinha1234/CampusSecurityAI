"""
In-memory Campus Environment State for Lovely Professional University.
Maintains live zones, edges, incident registers, and patrol histories.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.geospatial.geojson_loader import CampusDataLoader
from backend.geospatial.coordinates import (
    haversine_distance,
    calculate_walk_duration_minutes,
    zone_to_geojson_feature,
    zones_to_geojson_collection,
)


class CampusEnvironment:
    """Singleton-style or managed campus environment manager."""

    def __init__(self, data_loader: Optional[CampusDataLoader] = None):
        self.loader = data_loader or CampusDataLoader()
        self.zones: Dict[str, Dict[str, Any]] = {}
        self.edges: Dict[str, Dict[str, Any]] = {}
        self.incidents: List[Dict[str, Any]] = []
        self.patrol_history: List[Dict[str, Any]] = []
        self.approved_plans: Dict[str, Dict[str, Any]] = {}
        self.last_updated: str = datetime.now(timezone.utc).isoformat()
        self.reload_from_disk()

    def reload_from_disk(self) -> None:
        """Loads and initializes zones, edges, and sample incidents."""
        raw_zones = self.loader.load_zones()
        self.zones = {z["zone_id"]: z for z in raw_zones}

        raw_edges = self.loader.load_edges()
        self.edges = {}
        for edge in raw_edges:
            edge_id = edge["edge_id"]
            src = edge["source"]
            dst = edge["target"]
            # Calculate distance and estimated walk time if both nodes exist
            if src in self.zones and dst in self.zones:
                z_src = self.zones[src]
                z_dst = self.zones[dst]
                dist = haversine_distance(
                    z_src["latitude"], z_src["longitude"],
                    z_dst["latitude"], z_dst["longitude"]
                )
                walk_mins = calculate_walk_duration_minutes(dist)
                edge["distance_meters"] = dist
                edge["estimated_walk_minutes"] = walk_mins
            self.edges[edge_id] = edge

        self.incidents = self.loader.load_incidents()
        self.last_updated = datetime.now(timezone.utc).isoformat()

    def get_all_zones(self) -> List[Dict[str, Any]]:
        return list(self.zones.values())

    def get_zone(self, zone_id: str) -> Optional[Dict[str, Any]]:
        return self.zones.get(zone_id)

    def add_or_update_zone(self, zone_data: Dict[str, Any]) -> Dict[str, Any]:
        zone_id = zone_data["zone_id"]
        # Basic validation of coordinates
        self.loader._validate_zone(zone_data)
        self.zones[zone_id] = zone_data
        self.last_updated = datetime.now(timezone.utc).isoformat()
        return zone_data

    def set_zone_restriction(self, zone_id: str, is_restricted: bool, reason: Optional[str] = None) -> bool:
        if zone_id in self.zones:
            self.zones[zone_id]["is_restricted"] = is_restricted
            self.zones[zone_id]["restriction_reason"] = reason if is_restricted else None
            self.last_updated = datetime.now(timezone.utc).isoformat()
            return True
        return False

    def get_all_edges(self) -> List[Dict[str, Any]]:
        return list(self.edges.values())

    def get_edge(self, edge_id: str) -> Optional[Dict[str, Any]]:
        return self.edges.get(edge_id)

    def set_edge_status(self, edge_id: str, is_open: bool, restriction_reason: Optional[str] = None) -> bool:
        if edge_id in self.edges:
            self.edges[edge_id]["is_open"] = is_open
            self.edges[edge_id]["is_restricted"] = not is_open
            self.edges[edge_id]["restriction_reason"] = restriction_reason if not is_open else None
            self.last_updated = datetime.now(timezone.utc).isoformat()
            return True
        return False

    def add_incident(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        self.incidents.append(incident)
        # Increment historical incident count on the zone
        zone_id = incident.get("zone_id")
        if zone_id in self.zones:
            self.zones[zone_id]["historical_incidents_count"] = (
                self.zones[zone_id].get("historical_incidents_count", 0) + 1
            )
        self.last_updated = datetime.now(timezone.utc).isoformat()
        return incident

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        for inc in self.incidents:
            if inc.get("incident_id") == incident_id:
                return inc
        return None

    def update_incident_status(
        self,
        incident_id: str,
        new_status: str,
        resolution_notes: Optional[str] = None,
        updated_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Updates incident status following the supported lifecycle:
        ACTIVE -> INVESTIGATING -> RESOLVED
        Raises KeyError if incident not found, ValueError if status/transition invalid.
        """
        target_incident = self.get_incident(incident_id)
        if not target_incident:
            raise KeyError(f"Incident {incident_id} not found.")

        valid_statuses = {"ACTIVE", "INVESTIGATING", "RESOLVED"}
        normalized_status = (new_status or "").strip().upper()
        if normalized_status not in valid_statuses:
            raise ValueError(
                f"Invalid status '{new_status}'. Allowed values: ACTIVE, INVESTIGATING, RESOLVED."
            )

        current_status = target_incident.get("status", "ACTIVE").upper()

        # Enforce lifecycle transitions: ACTIVE -> INVESTIGATING -> RESOLVED
        valid_transitions = {
            "ACTIVE": {"INVESTIGATING", "RESOLVED"},
            "INVESTIGATING": {"RESOLVED"},
            "RESOLVED": set(),  # Terminal state: cannot be transitioned again
        }

        allowed_next = valid_transitions.get(current_status, set())
        if normalized_status not in allowed_next:
            if current_status == "RESOLVED":
                raise ValueError(
                    f"Incident {incident_id} is already RESOLVED and cannot be modified."
                )
            if normalized_status == current_status:
                raise ValueError(
                    f"Incident {incident_id} is already in '{current_status}' status."
                )
            raise ValueError(
                f"Invalid status transition from '{current_status}' to '{normalized_status}'. "
                f"Allowed transitions from '{current_status}': {sorted(list(allowed_next))}."
            )

        now = datetime.now(timezone.utc).isoformat()
        operator = updated_by or "Security Personnel"

        # Initialize audit history list if not present
        if "status_history" not in target_incident or not isinstance(target_incident["status_history"], list):
            target_incident["status_history"] = []

        target_incident["status_history"].append({
            "from_status": current_status,
            "to_status": normalized_status,
            "timestamp": now,
            "updated_by": operator,
            "notes": resolution_notes or "",
        })

        target_incident["status"] = normalized_status
        target_incident["updated_at"] = now
        target_incident["updated_by"] = operator

        if resolution_notes:
            target_incident["resolution_notes"] = resolution_notes

        if normalized_status == "RESOLVED":
            target_incident["resolved_at"] = now
            target_incident["resolved_by"] = operator
            if not target_incident.get("resolution_notes"):
                target_incident["resolution_notes"] = resolution_notes or "Incident resolved successfully."

        self.last_updated = now
        return target_incident

    def get_active_incidents(self, zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if zone_id:
            return [
                inc for inc in self.incidents
                if inc.get("zone_id") == zone_id and inc.get("status") in ["ACTIVE", "INVESTIGATING"]
            ]
        return [inc for inc in self.incidents if inc.get("status") in ["ACTIVE", "INVESTIGATING"]]

    def mark_zone_patrolled(self, zone_id: str) -> None:
        if zone_id in self.zones:
            self.zones[zone_id]["last_patrol_hours_ago"] = 0.0
            self.last_updated = datetime.now(timezone.utc).isoformat()

    def to_geojson(self) -> Dict[str, Any]:
        return zones_to_geojson_collection(list(self.zones.values()))


# Default global environment instance
campus_env = CampusEnvironment()
