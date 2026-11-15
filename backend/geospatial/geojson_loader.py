"""
GeoJSON and Campus Data Loader.
Safely loads campus zones, walkable edges, and historical incident records.
Validates coordinate ranges (specifically bounded around Lovely Professional University).
"""

import json
from pathlib import Path
from typing import Dict, Any, List

# Approximate geographic bounding box for Lovely Professional University, Phagwara
LPU_BOUNDS = {
    "min_lat": 31.2400,
    "max_lat": 31.2700,
    "min_lon": 75.6900,
    "max_lon": 75.7200,
}


class CampusDataLoader:
    """Loads and validates campus configuration files."""

    def __init__(self, data_dir: Path = None):
        if data_dir is None:
            # Default to backend/data relative to this file
            self.data_dir = Path(__file__).resolve().parent.parent / "data"
        else:
            self.data_dir = Path(data_dir)

    def load_zones(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "lpu_campus_zones.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Campus zones file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            zones = json.load(f)

        validated_zones = []
        for zone in zones:
            self._validate_zone(zone)
            validated_zones.append(zone)
        return validated_zones

    def load_edges(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "lpu_campus_edges.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Campus edges file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            edges = json.load(f)
        return edges

    def load_incidents(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "sample_incidents.json"
        if not file_path.exists():
            return []

        with open(file_path, "r", encoding="utf-8") as f:
            incidents = json.load(f)
        return incidents

    def _validate_zone(self, zone: Dict[str, Any]) -> None:
        """Validates that zone coordinates fall within the LPU campus territory."""
        lat = zone.get("latitude")
        lon = zone.get("longitude")

        if lat is None or lon is None:
            raise ValueError(f"Zone {zone.get('zone_id')} is missing coordinates.")

        if not (LPU_BOUNDS["min_lat"] <= lat <= LPU_BOUNDS["max_lat"]):
            raise ValueError(
                f"Zone {zone.get('zone_id')} latitude {lat} is outside LPU bounds "
                f"[{LPU_BOUNDS['min_lat']}, {LPU_BOUNDS['max_lat']}]."
            )

        if not (LPU_BOUNDS["min_lon"] <= lon <= LPU_BOUNDS["max_lon"]):
            raise ValueError(
                f"Zone {zone.get('zone_id')} longitude {lon} is outside LPU bounds "
                f"[{LPU_BOUNDS['min_lon']}, {LPU_BOUNDS['max_lon']}]."
            )
