"""
Geospatial coordinate calculations and GeoJSON converters for Lovely Professional University.
Provides Haversine distance, foot travel duration estimations, and GeoJSON builders.
"""

import math
from typing import Dict, Any, List, Tuple

# Earth radius in meters
EARTH_RADIUS_METERS = 6371000.0

# Default patrol walking speed: 4.5 km/h = 75 meters/minute
DEFAULT_PATROL_SPEED_KMH = 4.5
DEFAULT_PATROL_SPEED_MPM = (DEFAULT_PATROL_SPEED_KMH * 1000.0) / 60.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two points on the earth in meters
    using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(EARTH_RADIUS_METERS * c, 2)


def calculate_walk_duration_minutes(
    distance_meters: float, speed_kmh: float = DEFAULT_PATROL_SPEED_KMH
) -> float:
    """
    Calculates the walking duration in minutes for a given distance and speed.
    """
    if distance_meters <= 0.0 or speed_kmh <= 0.0:
        return 0.0
    speed_mpm = (speed_kmh * 1000.0) / 60.0
    return round(distance_meters / speed_mpm, 2)


def zone_to_geojson_feature(zone: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a campus zone dictionary into a standardized GeoJSON Feature object.
    Includes Point geometry and properties for visualization.
    """
    return {
        "type": "Feature",
        "id": zone.get("zone_id"),
        "geometry": {
            "type": "Point",
            "coordinates": [zone.get("longitude", 0.0), zone.get("latitude", 0.0)],
        },
        "properties": {
            "zone_id": zone.get("zone_id"),
            "name": zone.get("name"),
            "category": zone.get("category"),
            "base_priority": zone.get("base_priority", 5),
            "last_patrol_hours_ago": zone.get("last_patrol_hours_ago", 0.0),
            "is_restricted": zone.get("is_restricted", False),
            "restriction_reason": zone.get("restriction_reason"),
            "is_accessible": zone.get("is_accessible", True),
            "data_completeness": zone.get("data_completeness", 1.0),
            "description": zone.get("description", ""),
            "risk_score": zone.get("risk_score", 0.0),
            "risk_level": zone.get("risk_level", "Unknown"),
            "risk_color": zone.get("risk_color", "#9CA3AF"),
        },
    }


def zones_to_geojson_collection(zones: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Wraps a list of zone records into a GeoJSON FeatureCollection.
    """
    features = [zone_to_geojson_feature(z) for z in zones]
    return {
        "type": "FeatureCollection",
        "features": features,
    }


def route_to_geojson_linestring(
    path_nodes: List[Dict[str, Any]], properties: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Converts an ordered list of nodes into a GeoJSON LineString Feature for map overlay.
    Coordinates are formatted as [longitude, latitude].
    """
    coords = [[node["longitude"], node["latitude"]] for node in path_nodes if "longitude" in node and "latitude" in node]
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coords,
        },
        "properties": properties or {},
    }
