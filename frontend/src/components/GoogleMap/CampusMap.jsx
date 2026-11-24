/**
 * CampusMap.jsx
 * Operational Security-Monitoring Map for Lovely Professional University.
 * Five truly independent overlay layers:
 *   1. Campus Buildings / Security Zones (polygons + 30×30 circular markers)
 *   2. Risk Heat Zones (transparent colored coverage circles)
 *   3. Security Patrol Route (cyan directional polyline + arrows + status badge)
 *   4. Patrol Waypoints (diamond-shaped numbered checkpoints)
 *   5. Security Incidents (severity-based triangle alert markers)
 *
 * Three basemaps:
 *   - Dark Canvas (CARTO authenticated / Esri Dark Gray Base fallback)
 *   - Streets (OpenStreetMap)
 *   - Satellite (Esri World Imagery)
 *
 * Zoom-adaptive marker collision handling, rich popups, and honest operational indicators.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LPU_CENTER,
  LPU_BOUNDS,
  TILE_LAYERS,
  VERIFIED_LPU_ZONES,
} from '../../services/mapService';
import {
  Radio,
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Navigation,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Route,
  Building2,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Approximate building footprint polygons for each zone (WGS84, [lat,lng])
// Conservative rectangular bounds pinned to verified coordinates
// ---------------------------------------------------------------------------
const ZONE_FOOTPRINTS = {
  Z01: [ // Main Security Gate 1
    [31.2555, 75.7038], [31.2555, 75.7046],
    [31.2551, 75.7046], [31.2551, 75.7038],
  ],
  Z02: [ // Block 1 Admin & Reception
    [31.2548, 75.7043], [31.2548, 75.7051],
    [31.2543, 75.7051], [31.2543, 75.7043],
  ],
  Z03: [ // Engineering Complex (Blocks 32-34)
    [31.2534, 75.7047], [31.2534, 75.7057],
    [31.2529, 75.7057], [31.2529, 75.7047],
  ],
  Z04: [ // Uni-Mall & Commercial Square
    [31.2522, 75.7056], [31.2522, 75.7066],
    [31.2516, 75.7066], [31.2516, 75.7056],
  ],
  Z05: [ // Central Bus Terminus & Parking
    [31.2563, 75.7040], [31.2563, 75.7050],
    [31.2557, 75.7050], [31.2557, 75.7040],
  ],
  Z06: [ // Central Library (Block 34)
    [31.2538, 75.7040], [31.2538, 75.7050],
    [31.2533, 75.7050], [31.2533, 75.7040],
  ],
  Z07: [ // Shanti Devi Mittal Auditorium & Unipolis
    [31.2544, 75.7054], [31.2544, 75.7064],
    [31.2538, 75.7064], [31.2538, 75.7054],
  ],
  Z08: [ // Boys Hostel Cluster (BH-1 to BH-4)
    [31.2502, 75.7069], [31.2502, 75.7081],
    [31.2494, 75.7081], [31.2494, 75.7069],
  ],
  Z09: [ // Girls Hostel Cluster (GH-1 to GH-3)
    [31.2568, 75.7052], [31.2568, 75.7064],
    [31.2562, 75.7064], [31.2562, 75.7052],
  ],
  Z10: [ // Uni-Hospital Healthcare Centre
    [31.2561, 75.7033], [31.2561, 75.7043],
    [31.2555, 75.7043], [31.2555, 75.7033],
  ],
  Z11: [ // Indoor Stadium & Sports Complex
    [31.2529, 75.7072], [31.2529, 75.7084],
    [31.2521, 75.7084], [31.2521, 75.7072],
  ],
  Z12: [ // Security Command HQ
    [31.2552, 75.7036], [31.2552, 75.7044],
    [31.2548, 75.7044], [31.2548, 75.7036],
  ],
};

// Category border / fill colors
const CATEGORY_COLOR = {
  Entrance:       '#38BDF8', // sky-blue
  Administration: '#818CF8', // indigo
  Academic:       '#34D399', // emerald
  Commercial:     '#FBBF24', // amber
  Transit:        '#A78BFA', // violet
  Library:        '#60A5FA', // blue
  Assembly:       '#F472B6', // pink
  Hostel:         '#FCD34D', // yellow
  Medical:        '#F87171', // red-light
  Sports:         '#4ADE80', // green
};

// Risk color helper
const getRiskColor = (score, level) => {
  if (level === 'Critical' || score >= 80) return '#EF4444';
  if (level === 'High'     || score >= 60) return '#F97316';
  if (level === 'Medium'   || score >= 40) return '#F59E0B';
  return '#10B981';
};

const getRiskZIndex = (score, level) => {
  if (level === 'Critical' || score >= 80) return 1000;
  if (level === 'High'     || score >= 60) return 800;
  if (level === 'Medium'   || score >= 40) return 600;
  return 400;
};

// Severity color for incidents
const getSeverityColor = (severity) => {
  if (severity >= 5) return '#A855F7'; // purple – critical
  if (severity === 4) return '#EF4444'; // red – high
  if (severity === 3) return '#F97316'; // orange – medium-high
  if (severity === 2) return '#F59E0B'; // amber – medium
  return '#10B981';                     // green – low / resolved
};

// ---------------------------------------------------------------------------
// HTML icon factories for L.divIcon
// ---------------------------------------------------------------------------

/** Compact 30×30 circular zone marker */
const buildingIcon = (zoneId, color, isSelected) => {
  const ring = isSelected
    ? `box-shadow: 0 0 0 3px #38BDF8, 0 0 16px 5px ${color}80; transform: scale(1.22);`
    : `box-shadow: 0 2px 8px 2px ${color}50;`;
  return `
    <div class="sector-circle-marker" style="
      width:30px; height:30px; border-radius:50%; background:${color};
      border:2px solid rgba(255,255,255,0.85); display:flex;
      align-items:center; justify-content:center; cursor:pointer;
      position:relative; transition:transform 0.15s ease; ${ring}
    ">
      <span style="font-family:monospace; font-size:8px; font-weight:900;
        color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.85);
        letter-spacing:-0.03em; line-height:1; user-select:none;"
      >${zoneId}</span>
    </div>`;
};

/** Diamond-shaped waypoint marker with stop number */
const waypointIcon = (num, color = '#22D3EE') => `
  <div style="
    width:28px; height:28px; background:${color}; border:2.5px solid #fff;
    border-radius:4px; transform:rotate(45deg); display:flex;
    align-items:center; justify-content:center;
    box-shadow:0 2px 8px ${color}80; cursor:pointer;
  ">
    <span style="transform:rotate(-45deg); font-family:monospace;
      font-size:9px; font-weight:900; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.8);
      line-height:1; user-select:none;">${num}</span>
  </div>`;

/** Triangular alert icon for incidents */
const incidentSvgIcon = (color) => `
  <div style="cursor:pointer; position:relative;" class="inc-icon-wrap">
    <svg width="28" height="26" viewBox="0 0 28 26" fill="none"
         xmlns="http://www.w3.org/2000/svg"
         style="filter:drop-shadow(0 2px 6px ${color}90);">
      <polygon points="14,2 27,24 1,24"
        fill="${color}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
      <text x="14" y="20" text-anchor="middle"
        font-family="monospace" font-size="11" font-weight="900"
        fill="#fff">!</text>
    </svg>
  </div>`;

/** Green circle for resolved incidents */
const resolvedIcon = () => `
  <div style="cursor:pointer;">
    <svg width="22" height="22" viewBox="0 0 22 22"
         style="filter:drop-shadow(0 2px 4px #10B98180);">
      <circle cx="11" cy="11" r="9" fill="#10B981" stroke="#fff" stroke-width="1.8"/>
      <polyline points="6,11 10,15 16,8"
        stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>
  </div>`;

/** Directional arrow decorator for patrol polyline */
const arrowIcon = (angleDeg) => `
  <div style="
    width:0; height:0;
    border-left:5px solid transparent;
    border-right:5px solid transparent;
    border-bottom:9px solid #22D3EE;
    transform:rotate(${angleDeg}deg);
    filter:drop-shadow(0 0 3px #22D3EE80);
    opacity:0.85;
  "></div>`;

function bearingDeg(a, b) {
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/**
 * Computes slight display offsets for clustered zones when zoomed out (< 16).
 * Coordinates themselves are never changed; only the screen marker position shifts slightly.
 */
const computeDisplayOffsets = (zones) => {
  const R = 6371000;
  const CLOSE_THRESHOLD_M = 85;
  const groups = zones.map((_, i) => i);
  const find = (i) => { while (groups[i] !== i) { groups[i] = groups[groups[i]]; i = groups[i]; } return i; };
  const union = (a, b) => { groups[find(a)] = find(b); };

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const dLat = (zones[j].latitude - zones[i].latitude) * (Math.PI / 180);
      const dLng = (zones[j].longitude - zones[i].longitude) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(zones[i].latitude * Math.PI / 180) * Math.cos(zones[j].latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < CLOSE_THRESHOLD_M) union(i, j);
    }
  }

  const buckets = {};
  zones.forEach((_, i) => {
    const root = find(i);
    if (!buckets[root]) buckets[root] = [];
    buckets[root].push(i);
  });

  const offsets = zones.map(() => [0, 0]);
  const SPREAD_DEG = 0.00030; // ~33m spread radius

  Object.values(buckets).forEach((members) => {
    if (members.length <= 1) return;
    const n = members.length;
    members.forEach((idx, k) => {
      const angle = (2 * Math.PI * k) / n;
      offsets[idx] = [
        SPREAD_DEG * Math.sin(angle),
        SPREAD_DEG * Math.cos(angle),
      ];
    });
  });

  return offsets;
};

// ---------------------------------------------------------------------------
// Layer popup safety helper
// ---------------------------------------------------------------------------
/**
 * Safely closes any open popups on layer children before clearing layers
 * to prevent Leaflet classList/undefined runtime errors during DOM detachment.
 */
const safelyClearLayer = (layerGroup) => {
  if (!layerGroup) return;
  layerGroup.eachLayer((layer) => {
    if (typeof layer.closePopup === 'function' && layer.isPopupOpen && layer.isPopupOpen()) {
      try {
        layer.closePopup();
      } catch (_) {}
    }
  });
  layerGroup.clearLayers();
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const CampusMap = ({
  zones = [],
  patrolPlan = null,
  incidents = [],
  selectedZone = null,
  onSelectZone,
  onApprovePlan,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const tileLayerRef    = useRef(null);
  const markersMapRef   = useRef(new Map());
  const polygonsMapRef  = useRef(new Map());
  const heatCirclesMapRef = useRef(new Map());
  const prevSelectedZoneIdRef = useRef(null);

  // Five separate, independent layer groups
  const buildingsLayerRef = useRef(null); // Layer 1: zone polygons + circle markers
  const riskZonesLayerRef = useRef(null); // Layer 2: risk heat coverage circles
  const routeLayerRef     = useRef(null); // Layer 3: patrol polyline + directional arrows
  const waypointsLayerRef = useRef(null); // Layer 4: patrol waypoint diamonds
  const incidentsLayerRef = useRef(null); // Layer 5: incident alert icons

  // UI state
  const [activeTileId, setActiveTileId] = useState('dark');
  const [currentZoom, setCurrentZoom]   = useState(16);

  // Five independent visibility toggles
  const [showBuildings,  setShowBuildings]  = useState(true);
  const [showRiskZones,  setShowRiskZones]  = useState(true);
  const [showRoute,      setShowRoute]      = useState(true);
  const [showWaypoints,  setShowWaypoints]  = useState(true);
  const [showIncidents,  setShowIncidents]  = useState(true);

  // Panels visibility
  const [showLegend, setShowLegend]         = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isMapReady, setIsMapReady]         = useState(false);

  // Merge loaded backend zones with verified fallback dataset
  const effectiveZones = zones && zones.length > 0 ? zones : VERIFIED_LPU_ZONES;
  const activeLayerCount = [showBuildings, showRiskZones, showRoute, showWaypoints, showIncidents].filter(Boolean).length;

  // ─── 1. Initialize Map Instance (run once on mount) ──────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: LPU_CENTER,
      zoom: 16,
      minZoom: 14,
      maxZoom: 19,
      maxBounds: LPU_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: true,
    });

    // Custom panes enforcing strict visual stacking hierarchy:
    // 1. Base tiles (built-in tilePane at 200)
    // 2. Risk heat zones (riskZonesPane at 300)
    // 3. Buildings footprints (buildingsPane at 350) & Sector markers (sectorMarkersPane at 400)
    // 4. Patrol route (patrolRoutePane at 450) & Waypoints (patrolWaypointsPane at 500)
    // 5. Security incidents (incidentsPane at 600)
    // Popups remain in default popupPane (700)
    const customPanes = [
      { name: 'riskZonesPane', zIndex: 300 },
      { name: 'buildingsPane', zIndex: 350 },
      { name: 'sectorMarkersPane', zIndex: 400 },
      { name: 'patrolRoutePane', zIndex: 450 },
      { name: 'patrolWaypointsPane', zIndex: 500 },
      { name: 'incidentsPane', zIndex: 600 },
    ];

    customPanes.forEach(({ name, zIndex }) => {
      if (!map.getPane(name)) {
        const pane = map.createPane(name);
        pane.style.zIndex = String(zIndex);
      }
    });

    const tileConfig = TILE_LAYERS[activeTileId] || TILE_LAYERS.dark;
    const tile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains || 'abc',
      maxNativeZoom: tileConfig.maxNativeZoom || 19,
      maxZoom: tileConfig.maxZoom || 19,
    }).addTo(map);
    tileLayerRef.current = tile;

    // Initialize 5 independent layer groups in back-to-front stack order
    riskZonesLayerRef.current = L.layerGroup().addTo(map);
    buildingsLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current     = L.layerGroup().addTo(map);
    waypointsLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    setTimeout(() => map.invalidateSize(), 150);

    const onResize = () => mapInstanceRef.current?.invalidateSize();
    const onZoom = () => setCurrentZoom(map.getZoom());

    window.addEventListener('resize', onResize);
    map.on('zoomend', onZoom);

    return () => {
      window.removeEventListener('resize', onResize);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.closePopup();
        } catch (_) {}
        mapInstanceRef.current.off('zoomend', onZoom);
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      tileLayerRef.current = null;
      riskZonesLayerRef.current = null;
      buildingsLayerRef.current = null;
      routeLayerRef.current = null;
      waypointsLayerRef.current = null;
      incidentsLayerRef.current = null;
      markersMapRef.current.clear();
      polygonsMapRef.current.clear();
      heatCirclesMapRef.current.clear();
      setIsMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 2. Switch Basemaps (maintaining overlays & bringing tiles to back) ───
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const cfg = TILE_LAYERS[activeTileId] || TILE_LAYERS.dark;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains || 'abc',
      maxNativeZoom: cfg.maxNativeZoom || 19,
      maxZoom: cfg.maxZoom || 19,
    }).addTo(mapInstanceRef.current);

    // Keep basemap strictly at the bottom of the map pane stack
    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [activeTileId]);

  // ─── 3. LAYER 1: Campus Buildings / Security Zones ────────────────────────
  useEffect(() => {
    if (!isMapReady || !buildingsLayerRef.current) return;
    safelyClearLayer(buildingsLayerRef.current);
    markersMapRef.current.clear();
    polygonsMapRef.current.clear();

    if (!showBuildings) return;

    // Use smart collision offsets only when zoomed out (< 16)
    const offsets = currentZoom < 16
      ? computeDisplayOffsets(effectiveZones)
      : effectiveZones.map(() => [0, 0]);

    effectiveZones.forEach((zone, zoneIdx) => {
      if (!zone.latitude || !zone.longitude) return;
      const [latOff, lngOff] = offsets[zoneIdx] || [0, 0];
      const markerLatLng = [zone.latitude + latOff, zone.longitude + lngOff];

      const riskScore = Math.round(
        zone.risk_score ?? zone.risk_breakdown?.total_score ?? (zone.base_priority * 10) ?? 50
      );
      const riskLevel = zone.risk_level ?? zone.risk_breakdown?.risk_level
        ?? (riskScore >= 75 ? 'High' : 'Low');
      const riskColor    = zone.risk_color ?? getRiskColor(riskScore, riskLevel);
      const catColor     = CATEGORY_COLOR[zone.category] ?? '#64748B';
      const isSelected   = selectedZone?.zone_id === zone.zone_id;
      const isRestricted = zone.is_restricted;
      const footprint    = ZONE_FOOTPRINTS[zone.zone_id];

      // A. Building footprint polygon
      if (footprint) {
        const poly = L.polygon(footprint, {
          pane: 'buildingsPane',
          color: isSelected ? '#38BDF8' : catColor,
          weight: isSelected ? 2.5 : 1.5,
          opacity: isSelected ? 1 : 0.7,
          fillColor: catColor,
          fillOpacity: isSelected ? 0.25 : 0.12,
          dashArray: isRestricted ? '6,4' : undefined,
        });

        const polyPopup = buildZonePopup(zone, riskScore, riskLevel, riskColor, isRestricted);
        poly.bindPopup(polyPopup, { maxWidth: 300, closeButton: true });
        poly.on('click', () => onSelectZone?.(zone));
        buildingsLayerRef.current.addLayer(poly);
        polygonsMapRef.current.set(zone.zone_id, poly);
      }

      // B. Compact 30×30 circular marker with zone code
      const icon = L.divIcon({
        html: buildingIcon(zone.zone_id, riskColor, isSelected),
        className: 'custom-leaflet-zone-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -20],
      });

      const marker = L.marker(markerLatLng, {
        pane: 'sectorMarkersPane',
        icon,
        zIndexOffset: getRiskZIndex(riskScore, riskLevel) + (isSelected ? 2000 : 0),
      });

      const popupHtml = buildZonePopup(zone, riskScore, riskLevel, riskColor, isRestricted);
      marker.bindPopup(popupHtml, { maxWidth: 300, closeButton: true });
      marker.on('click', () => onSelectZone?.(zone));
      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-btn-${zone.zone_id}`);
        if (btn) btn.onclick = () => { onSelectZone?.(zone); marker.closePopup(); };
      });

      buildingsLayerRef.current.addLayer(marker);
      markersMapRef.current.set(zone.zone_id, marker);
    });
  }, [isMapReady, effectiveZones, showBuildings, onSelectZone, currentZoom]);

  // ─── 4. LAYER 2: Risk Heat Coverage Zones ─────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !riskZonesLayerRef.current) return;
    safelyClearLayer(riskZonesLayerRef.current);
    heatCirclesMapRef.current.clear();

    if (!showRiskZones) return;

    effectiveZones.forEach((zone) => {
      if (!zone.latitude || !zone.longitude) return;
      const trueLatLng = [zone.latitude, zone.longitude];
      const riskScore = Math.round(
        zone.risk_score ?? zone.risk_breakdown?.total_score ?? (zone.base_priority * 10) ?? 50
      );
      const riskLevel = zone.risk_level ?? zone.risk_breakdown?.risk_level
        ?? (riskScore >= 75 ? 'High' : 'Low');
      const riskColor    = zone.risk_color ?? getRiskColor(riskScore, riskLevel);
      const isSelected   = selectedZone?.zone_id === zone.zone_id;
      const isRestricted = zone.is_restricted;

      const heatCircle = L.circle(trueLatLng, {
        pane: 'riskZonesPane',
        radius: 55,
        color: riskColor,
        weight: isSelected ? 2.5 : 1.2,
        opacity: isSelected ? 0.9 : 0.5,
        fillColor: riskColor,
        fillOpacity: isSelected ? 0.28 : 0.13,
        dashArray: isRestricted ? '5,5' : undefined,
      });
      heatCircle.on('click', () => onSelectZone?.(zone));
      riskZonesLayerRef.current.addLayer(heatCircle);
      heatCirclesMapRef.current.set(zone.zone_id, heatCircle);
    });
  }, [isMapReady, effectiveZones, showRiskZones, onSelectZone]);

  // ─── Dedicated Selected-Zone Highlighting (NO rebuilding of markers) ─────
  useEffect(() => {
    if (!isMapReady) return;

    const prevId = prevSelectedZoneIdRef.current;
    const currId = selectedZone?.zone_id;

    // Reset previous zone styling
    if (prevId && prevId !== currId) {
      const prevMarker = markersMapRef.current.get(prevId);
      const prevZone = effectiveZones.find(z => z.zone_id === prevId);
      if (prevMarker && prevZone) {
        const riskScore = Math.round(
          prevZone.risk_score ?? prevZone.risk_breakdown?.total_score ?? (prevZone.base_priority * 10) ?? 50
        );
        const riskLevel = prevZone.risk_level ?? (riskScore >= 75 ? 'High' : 'Low');
        const riskColor = prevZone.risk_color ?? getRiskColor(riskScore, riskLevel);

        prevMarker.setIcon(L.divIcon({
          html: buildingIcon(prevId, riskColor, false),
          className: 'custom-leaflet-zone-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -20],
        }));
        prevMarker.setZIndexOffset(getRiskZIndex(riskScore, riskLevel));
      }

      const prevPoly = polygonsMapRef.current.get(prevId);
      if (prevPoly && prevZone) {
        const catColor = CATEGORY_COLOR[prevZone.category] ?? '#64748B';
        prevPoly.setStyle({
          color: catColor,
          weight: 1.5,
          opacity: 0.7,
          fillColor: catColor,
          fillOpacity: 0.12,
        });
      }

      const prevCircle = heatCirclesMapRef.current.get(prevId);
      if (prevCircle && prevZone) {
        const riskScore = Math.round(
          prevZone.risk_score ?? prevZone.risk_breakdown?.total_score ?? (prevZone.base_priority * 10) ?? 50
        );
        const riskLevel = prevZone.risk_level ?? (riskScore >= 75 ? 'High' : 'Low');
        const riskColor = prevZone.risk_color ?? getRiskColor(riskScore, riskLevel);
        prevCircle.setStyle({
          color: riskColor,
          weight: 1.2,
          opacity: 0.5,
          fillColor: riskColor,
          fillOpacity: 0.13,
        });
      }
    }

    // Apply active highlight styling to current zone
    if (currId) {
      const currMarker = markersMapRef.current.get(currId);
      const currZone = effectiveZones.find(z => z.zone_id === currId);
      if (currMarker && currZone) {
        const riskScore = Math.round(
          currZone.risk_score ?? currZone.risk_breakdown?.total_score ?? (currZone.base_priority * 10) ?? 50
        );
        const riskLevel = currZone.risk_level ?? (riskScore >= 75 ? 'High' : 'Low');
        const riskColor = currZone.risk_color ?? getRiskColor(riskScore, riskLevel);

        currMarker.setIcon(L.divIcon({
          html: buildingIcon(currId, riskColor, true),
          className: 'custom-leaflet-zone-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -20],
        }));
        currMarker.setZIndexOffset(getRiskZIndex(riskScore, riskLevel) + 2000);
      }

      const currPoly = polygonsMapRef.current.get(currId);
      if (currPoly) {
        currPoly.setStyle({
          color: '#38BDF8',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.25,
        });
      }

      const currCircle = heatCirclesMapRef.current.get(currId);
      if (currCircle && currZone) {
        const riskScore = Math.round(
          currZone.risk_score ?? currZone.risk_breakdown?.total_score ?? (currZone.base_priority * 10) ?? 50
        );
        const riskLevel = currZone.risk_level ?? (riskScore >= 75 ? 'High' : 'Low');
        const riskColor = currZone.risk_color ?? getRiskColor(riskScore, riskLevel);
        currCircle.setStyle({
          color: riskColor,
          weight: 2.5,
          opacity: 0.9,
          fillColor: riskColor,
          fillOpacity: 0.28,
        });
      }
    }

    prevSelectedZoneIdRef.current = currId;
  }, [selectedZone?.zone_id, isMapReady, effectiveZones]);

  // ─── 5. LAYER 3: Security Patrol Route Polyline & Directional Arrows ──────
  useEffect(() => {
    if (!isMapReady || !routeLayerRef.current) return;
    safelyClearLayer(routeLayerRef.current);

    if (!showRoute) return;

    const stops = patrolPlan?.stops;
    if (!stops || stops.length < 2) return;

    const sorted = [...stops]
      .filter(s => s.latitude && s.longitude)
      .sort((a, b) => a.stop_number - b.stop_number);
    if (sorted.length < 2) return;

    const coords = sorted.map(s => [s.latitude, s.longitude]);
    const isSimulated = !patrolPlan.plan_id || patrolPlan.is_demo;

    // Glowing halo
    routeLayerRef.current.addLayer(L.polyline(coords, {
      pane: 'patrolRoutePane',
      color: '#06B6D4',
      weight: 10,
      opacity: 0.18,
      lineCap: 'round',
      lineJoin: 'round',
    }));

    // Main sharp cyan patrol polyline
    routeLayerRef.current.addLayer(L.polyline(coords, {
      pane: 'patrolRoutePane',
      color: '#22D3EE',
      weight: 3.5,
      opacity: 0.95,
      dashArray: isSimulated ? '10,6' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }));

    // Directional arrows at midpoints
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const bearing = bearingDeg(a, b);

      const arrIcon = L.divIcon({
        html: arrowIcon(bearing),
        className: 'route-arrow-icon',
        iconSize: [10, 9],
        iconAnchor: [5, 4.5],
      });
      routeLayerRef.current.addLayer(L.marker(mid, { pane: 'patrolRoutePane', icon: arrIcon, interactive: false, zIndexOffset: 2500 }));
    }

    // Route identifier badge
    if (patrolPlan) {
      const midIdx = Math.floor(coords.length / 2);
      const routeLabel = `
        <div style="
          background:rgba(6,182,212,0.18); border:1px solid #22D3EE;
          border-radius:8px; padding:3px 8px; font-size:9px; font-weight:700;
          color:#22D3EE; white-space:nowrap; cursor:default; font-family:monospace;
          letter-spacing:0.05em; backdrop-filter:blur(4px);
        ">
          ${isSimulated ? '⚠ DEMO ' : ''}PATROL · ${patrolPlan.plan_id || 'ACTIVE'}
        </div>`;
      const labelIcon = L.divIcon({
        html: routeLabel,
        className: 'route-label-icon',
        iconSize: [160, 24],
        iconAnchor: [80, 12],
      });
      routeLayerRef.current.addLayer(L.marker(coords[midIdx], {
        pane: 'patrolRoutePane',
        icon: labelIcon,
        interactive: false,
        zIndexOffset: 2400,
      }));
    }
  }, [isMapReady, patrolPlan, showRoute]);

  // ─── 6. LAYER 4: Patrol Waypoint Checkpoints ──────────────────────────────
  useEffect(() => {
    if (!isMapReady || !waypointsLayerRef.current) return;
    safelyClearLayer(waypointsLayerRef.current);

    if (!showWaypoints) return;

    const stops = patrolPlan?.stops;
    if (!stops || stops.length === 0) return;

    stops
      .filter(s => s.latitude && s.longitude)
      .sort((a, b) => a.stop_number - b.stop_number)
      .forEach((stop) => {
        const latLng = [stop.latitude, stop.longitude];
        const stopColor = stop.risk_color || '#22D3EE';

        const icon = L.divIcon({
          html: waypointIcon(stop.stop_number, stopColor),
          className: 'custom-leaflet-waypoint-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -18],
        });

        const marker = L.marker(latLng, { pane: 'patrolWaypointsPane', icon, zIndexOffset: 3000 });

        const popupHtml = `
          <div style="min-width:210px; padding:2px 0; font-family:inherit;">
            <div style="display:flex; align-items:center; gap:8px; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #334155;">
              <span style="
                width:22px; height:22px; border-radius:4px; background:${stopColor};
                display:flex; align-items:center; justify-content:center;
                font-family:monospace; font-size:10px; font-weight:900; color:#fff;
                transform:rotate(45deg);">
                <span style="transform:rotate(-45deg)">${stop.stop_number}</span>
              </span>
              <span style="font-weight:700; font-size:12px; color:#fff;">${stop.zone_name || 'Checkpoint'}</span>
            </div>
            <div style="font-size:11px; color:#94A3B8; margin-bottom:8px;">
              ${stop.reason_for_visit || 'Scheduled AI security surveillance patrol stop.'}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;
              padding:8px; border-radius:8px; background:#0F172A; border:1px solid #1E293B;
              font-size:10px; font-family:monospace;">
              <div>
                <span style="color:#64748B; display:block;">Risk Level</span>
                <strong style="color:${stopColor}">${stop.risk_level || 'Medium'}</strong>
              </div>
              <div>
                <span style="color:#64748B; display:block;">Dwell Time</span>
                <strong style="color:#fff">~2 min</strong>
              </div>
              <div>
                <span style="color:#64748B; display:block;">Coordinates</span>
                <span style="color:#CBD5E1">${stop.latitude?.toFixed(5)}, ${stop.longitude?.toFixed(5)}</span>
              </div>
              <div>
                <span style="color:#64748B; display:block;">Stop #</span>
                <strong style="color:#22D3EE">${stop.stop_number} / ${(patrolPlan?.stops?.length) || '?'}</strong>
              </div>
            </div>
          </div>`;

        marker.bindPopup(popupHtml, { maxWidth: 260, closeButton: true });
        waypointsLayerRef.current.addLayer(marker);
      });
  }, [isMapReady, patrolPlan, showWaypoints]);

  // ─── 7. LAYER 5: Security Incidents ───────────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !incidentsLayerRef.current) return;
    safelyClearLayer(incidentsLayerRef.current);

    if (!showIncidents) return;

    const rawIncidents = incidents && incidents.length > 0 ? incidents : [];
    const isDemo = rawIncidents.length === 0;

    rawIncidents.forEach((inc, idx) => {
      const matchedZone = effectiveZones.find(z => z.zone_id === inc.zone_id);
      if (!matchedZone) return;

      // Small jitter so multiple incidents in the same zone separate slightly
      const latOff = ((idx % 3) - 1) * 0.00018;
      const lngOff = (((idx + 1) % 3) - 1) * 0.00018;
      const latLng = [matchedZone.latitude + latOff, matchedZone.longitude + lngOff];

      const severity   = Number(inc.severity) || 3;
      const color      = getSeverityColor(severity);
      const isResolved = (inc.status || '').toLowerCase() === 'resolved';
      const isSimulated = inc.is_simulated === true
        || String(inc.incident_id || '').startsWith('INC-2026-');

      const iconHtml = isResolved ? resolvedIcon() : incidentSvgIcon(color);

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-incident-icon',
        iconSize: isResolved ? [22, 22] : [28, 26],
        iconAnchor: isResolved ? [11, 11] : [14, 24],
        popupAnchor: [0, isResolved ? -14 : -28],
      });

      const marker = L.marker(latLng, { pane: 'incidentsPane', icon, zIndexOffset: 4000 });

      const severityLabel = ['', 'LOW', 'MEDIUM', 'MEDIUM-HIGH', 'HIGH', 'CRITICAL'][Math.min(severity, 5)];
      const ts = inc.timestamp ? new Date(inc.timestamp).toLocaleString() : 'Unknown';

      const popupHtml = `
        <div style="min-width:240px; max-width:290px; padding:2px 0; font-family:inherit;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;
            padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #334155;">
            <span style="font-weight:700; font-size:12px; color:#fff; max-width:170px;">
              ${(inc.category || 'SECURITY ALERT').replace(/_/g, ' ')}
            </span>
            <span style="font-family:monospace; font-size:9px; color:#64748B; white-space:nowrap; margin-left:6px;">
              ${inc.incident_id || 'INC-LIVE'}
            </span>
          </div>

          <div style="margin-bottom:8px;">
            ${isSimulated
              ? `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 7px;
                  border-radius:5px; background:rgba(245,158,11,0.18); color:#FCD34D;
                  border:1px solid rgba(245,158,11,0.4); font-size:9px; font-weight:700;">
                  ⚠ SIMULATION / DRILL — NOT A LIVE INCIDENT
                </span>`
              : `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 7px;
                  border-radius:5px; background:rgba(239,68,68,0.18); color:#FCA5A5;
                  border:1px solid rgba(239,68,68,0.4); font-size:9px; font-weight:700;">
                  🔴 LIVE FIELD REPORT
                </span>`
            }
          </div>

          <p style="font-size:11px; color:#94A3B8; margin:0 0 8px; line-height:1.5;">
            ${inc.description || 'No description provided.'}
          </p>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;
            padding:8px; border-radius:8px; background:#0F172A; border:1px solid #1E293B;
            font-size:10px; font-family:monospace;">
            <div>
              <span style="color:#64748B; display:block;">Severity</span>
              <strong style="color:${color}">SEV ${severity}/5 (${severityLabel})</strong>
            </div>
            <div>
              <span style="color:#64748B; display:block;">Status</span>
              <strong style="color:${isResolved ? '#10B981' : '#F87171'}">${inc.status || 'ACTIVE'}</strong>
            </div>
            <div>
              <span style="color:#64748B; display:block;">Location</span>
              <span style="color:#E2E8F0">${matchedZone.name}</span>
            </div>
            <div>
              <span style="color:#64748B; display:block;">Reported</span>
              <span style="color:#94A3B8">${ts}</span>
            </div>
            ${inc.assigned_to ? `
            <div style="grid-column:span 2;">
              <span style="color:#64748B; display:block;">Assigned Officer</span>
              <strong style="color:#A5B4FC">${inc.assigned_to}</strong>
            </div>` : ''}
          </div>
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 300, closeButton: true });
      incidentsLayerRef.current.addLayer(marker);
    });

    // If no real incidents, display an honest DEMO MODE badge
    if (isDemo) {
      const demoIcon = L.divIcon({
        html: `<div style="
          background:rgba(245,158,11,0.18); border:1px dashed #FBBF24;
          border-radius:8px; padding:4px 10px; font-size:9px; font-weight:700;
          color:#FCD34D; white-space:nowrap; font-family:monospace; letter-spacing:0.05em;
        ">⚠ INCIDENT LAYER — DEMO MODE</div>`,
        className: 'route-label-icon',
        iconSize: [210, 26],
        iconAnchor: [105, 13],
      });
      incidentsLayerRef.current.addLayer(
        L.marker([31.2535, 75.7065], { pane: 'incidentsPane', icon: demoIcon, interactive: false, zIndexOffset: 5000 })
      );
    }
  }, [isMapReady, incidents, effectiveZones, showIncidents]);

  // ─── 8. Pan to Selected Zone ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedZone?.zone_id) return;
    const target = effectiveZones.find(z => z.zone_id === selectedZone.zone_id);
    if (target?.latitude && target?.longitude) {
      mapInstanceRef.current.panTo([target.latitude, target.longitude], {
        animate: true,
        duration: 0.6,
      });
      const m = markersMapRef.current.get(selectedZone.zone_id);
      if (m && typeof m.isPopupOpen === 'function' && !m.isPopupOpen()) {
        try {
          m.openPopup();
        } catch (_) {}
      }
    }
  }, [selectedZone?.zone_id, effectiveZones]);

  // ─── Map Navigation Helpers ───────────────────────────────────────────────
  const handleZoomIn      = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut     = () => mapInstanceRef.current?.zoomOut();
  const handleResetCenter = () => mapInstanceRef.current?.flyTo(LPU_CENTER, 16, { duration: 0.8 });
  const handleFitRoute    = () => {
    const stops = patrolPlan?.stops?.filter(s => s.latitude && s.longitude);
    if (!stops?.length || !mapInstanceRef.current) return;
    mapInstanceRef.current.fitBounds(
      L.latLngBounds(stops.map(s => [s.latitude, s.longitude])),
      { padding: [50, 50], maxZoom: 17 }
    );
  };

  // Layer configuration items for the control dropdown
  const layersConfig = [
    { label: 'Campus Buildings',  icon: <Building2 className="w-3.5 h-3.5 text-blue-400" />,     state: showBuildings,  set: setShowBuildings },
    { label: 'Risk Heat Zones',   icon: <Shield className="w-3.5 h-3.5 text-red-400" />,         state: showRiskZones,  set: setShowRiskZones },
    { label: 'Patrol Route',      icon: <Route className="w-3.5 h-3.5 text-cyan-400" />,         state: showRoute,      set: setShowRoute },
    { label: 'Patrol Waypoints',  icon: <Navigation className="w-3.5 h-3.5 text-cyan-300" />,    state: showWaypoints,  set: setShowWaypoints },
    { label: 'Security Incidents', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />, state: showIncidents,  set: setShowIncidents },
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#070D18] select-none rounded-2xl border border-slate-800 shadow-2xl">

      {/* ── GPS STATUS BANNER (HONEST OFFLINE / DEMO INDICATOR) ── */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#0A1120]/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl text-xs flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        <div>
          <div className="font-bold text-[11px] text-amber-300 flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5" />
            <span>GPS TELEMETRY: OFFLINE / DEMO MODE</span>
          </div>
          <div className="text-[10px] text-slate-400 hidden sm:block">
            Route plots A* algorithmic graph paths · No physical GPS hardware attached
          </div>
        </div>
      </div>

      {/* ── TOP-RIGHT: BASEMAP PILLS, ZOOM, AND LAYER TOGGLES ── */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">

        {/* Basemap Switcher */}
        <div className="bg-[#0A1120]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-[11px] font-semibold text-slate-300">
          {[
            { id: 'dark',      label: 'Dark (CARTO)',    title: 'Dark Canvas Base Tiles' },
            { id: 'streets',   label: 'Streets (OSM)',   title: 'OpenStreetMap Streets Network' },
            { id: 'satellite', label: 'Satellite (Esri)',title: 'Esri Satellite High-Resolution Imagery' },
          ].map(({ id, label, title }) => (
            <button
              key={id}
              onClick={() => setActiveTileId(id)}
              title={title}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTileId === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:text-white hover:bg-slate-800'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Map Controls */}
        <div className="bg-[#0A1120]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex items-center gap-0.5">
          <button onClick={handleZoomIn}      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition" title="Zoom In"><Plus className="w-3.5 h-3.5" /></button>
          <button onClick={handleZoomOut}     className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition" title="Zoom Out"><Minus className="w-3.5 h-3.5" /></button>
          <button onClick={handleResetCenter} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition" title="Re-center on LPU Main Campus"><RotateCcw className="w-3.5 h-3.5" /></button>
          {patrolPlan?.stops?.length > 0 && (
            <button onClick={handleFitRoute} className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition" title="Fit to Patrol Route"><Navigation className="w-3.5 h-3.5" /></button>
          )}

          {/* Layer Panel Button with active counter */}
          <button
            onClick={() => setShowLayerPanel(p => !p)}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 transition text-xs font-semibold ${
              showLayerPanel ? 'text-blue-400 bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Map Layers"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="font-mono text-[9px] bg-blue-600/30 text-blue-300 px-1 py-0.2 rounded border border-blue-500/40">
              {activeLayerCount}/5
            </span>
          </button>
        </div>
      </div>

      {/* ── COLLAPSIBLE LAYER CONTROL PANEL ── */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3 z-[1000] bg-[#0A1120]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs text-slate-300 w-56 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between font-bold text-[11px] text-white mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Independent Map Layers</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono font-normal">
              {activeLayerCount} Active
            </span>
          </div>

          <div className="space-y-1">
            {layersConfig.map(({ label, icon, state, set }) => (
              <div
                key={label}
                onClick={() => set(p => !p)}
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-800/60 px-2 py-1.5 rounded-xl transition select-none"
              >
                <div className="flex items-center gap-2">
                  {icon}
                  <span className={state ? 'text-white font-medium' : 'text-slate-500'}>
                    {label}
                  </span>
                </div>
                <div className={`relative w-7 h-4 rounded-full transition-colors ${state ? 'bg-blue-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${state ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACCURATE PERMANENT MAP LEGEND (BOTTOM-RIGHT) ── */}
      <div className="absolute bottom-6 right-3 z-[1000]">
        <button
          onClick={() => setShowLegend(p => !p)}
          className="mb-1.5 ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white bg-[#0A1120]/90 border border-slate-700/80 rounded-lg px-2 py-1 shadow-xl transition"
        >
          {showLegend ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
          Legend
        </button>

        {showLegend && (
          <div className="bg-[#0A1120]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-[11px] text-slate-300 w-56 animate-in fade-in slide-in-from-bottom-2">
            <div className="font-bold text-[11px] text-white mb-2.5 pb-1.5 border-b border-slate-800 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-blue-400" /> Operational Map Legend
            </div>

            {/* 1. Campus Sectors */}
            <div className="mb-2.5">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Campus Sectors & Footprints</div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:14, height:14, background:'rgba(59,130,246,0.22)', border:'1.5px solid #3B82F6', borderRadius:2}} />
                <span>Building Footprint Polygon</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:14, height:14, borderRadius:'50%', background:'#10B981'}} />
                <span>Low Risk Sector (&lt;40)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:14, height:14, borderRadius:'50%', background:'#F59E0B'}} />
                <span>Medium Risk (40–59)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:14, height:14, borderRadius:'50%', background:'#F97316'}} />
                <span>High Risk (60–79)</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{width:14, height:14, borderRadius:'50%', background:'#EF4444'}} />
                <span>Critical Risk (≥80)</span>
              </div>
            </div>

            {/* 2. Patrol Route & Waypoints */}
            <div className="mb-2.5">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Patrol Route & Waypoints</div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:20, height:3, background:'#22D3EE', borderRadius:2}} />
                <span>Active Patrol Route Path</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:20, height:3, borderTop:'2px dashed #22D3EE'}} />
                <span>Simulated / Demo Itinerary</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{width:13, height:13, borderRadius:2, background:'#22D3EE', transform:'rotate(45deg)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <span style={{transform:'rotate(-45deg)', fontSize:7, fontWeight:900, color:'#fff'}}>1</span>
                </div>
                <span>Patrol Waypoint (Numbered)</span>
              </div>
            </div>

            {/* 3. Security Incidents */}
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Security Incidents</div>
              <div className="flex items-center gap-2 mb-1">
                <svg width="13" height="12" viewBox="0 0 28 26"><polygon points="14,2 27,24 1,24" fill="#EF4444" stroke="#fff" strokeWidth="1.8"/></svg>
                <span>Critical / High Alert (SEV 4-5)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <svg width="13" height="12" viewBox="0 0 28 26"><polygon points="14,2 27,24 1,24" fill="#F97316" stroke="#fff" strokeWidth="1.8"/></svg>
                <span>Medium-High Alert (SEV 3)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <svg width="13" height="12" viewBox="0 0 28 26"><polygon points="14,2 27,24 1,24" fill="#F59E0B" stroke="#fff" strokeWidth="1.8"/></svg>
                <span>Medium / Low Alert (SEV 1-2)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#10B981" stroke="#fff" strokeWidth="1.8"/><polyline points="6,11 10,15 16,8" stroke="#fff" strokeWidth="2" fill="none"/></svg>
                <span>Resolved Incident Alert</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LEAFLET MAP DOM CONTAINER ── */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Zone popup HTML builder
// ---------------------------------------------------------------------------
function buildZonePopup(zone, riskScore, riskLevel, riskColor, isRestricted) {
  const catColor = CATEGORY_COLOR[zone.category] ?? '#64748B';
  return `
    <div style="min-width:230px; max-width:290px; padding:2px 0; font-family:inherit;">
      <div style="display:flex; align-items:center; justify-content:space-between;
        padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #334155;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="
            padding:2px 6px; border-radius:4px; background:#1E293B;
            color:#38BDF8; font-family:monospace; font-size:10px; font-weight:700;"
          >${zone.zone_id}</span>
          <span style="font-weight:700; font-size:11px; color:#fff;">${zone.name}</span>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;">
        <span style="
          padding:2px 7px; border-radius:4px; background:${catColor}22;
          color:${catColor}; border:1px solid ${catColor}60; font-size:9px; font-weight:700;">
          ${zone.category || 'Unknown'}
        </span>
        ${isRestricted ? `<span style="
          padding:2px 7px; border-radius:4px; background:rgba(168,85,247,0.2);
          color:#D8B4FE; border:1px solid rgba(168,85,247,0.5); font-size:9px; font-weight:700;">
          🔒 RESTRICTED
        </span>` : ''}
      </div>

      <p style="font-size:11px; color:#94A3B8; margin:0 0 8px; line-height:1.5;">
        ${zone.description || 'Verified LPU geographical sector.'}
      </p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;
        padding:8px; border-radius:8px; background:#0F172A; border:1px solid #1E293B;
        font-size:10px; font-family:monospace; margin-bottom:8px;">
        <div>
          <span style="color:#64748B; display:block;">Risk Score</span>
          <strong style="color:${riskColor}">${riskScore}/100 (${riskLevel})</strong>
        </div>
        <div>
          <span style="color:#64748B; display:block;">Access</span>
          <strong style="color:${isRestricted ? '#A78BFA' : '#34D399'}">${isRestricted ? 'LOCKED' : 'OPEN'}</strong>
        </div>
        <div style="grid-column:span 2;">
          <span style="color:#64748B; display:block;">GPS Coordinates</span>
          <span style="color:#CBD5E1;">${zone.latitude?.toFixed(5)}, ${zone.longitude?.toFixed(5)}</span>
        </div>
      </div>

      <button id="inspect-btn-${zone.zone_id}"
        style="width:100%; padding:5px 0; border-radius:8px; background:#1D4ED8;
          color:#fff; font-size:11px; font-weight:700; border:none; cursor:pointer;
          font-family:inherit; transition:background 0.2s;"
        onmouseover="this.style.background='#2563EB'"
        onmouseout="this.style.background='#1D4ED8'"
      >Inspect 8-Factor Explainable AI</button>
    </div>`;
}
