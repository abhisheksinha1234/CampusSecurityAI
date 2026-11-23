import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, LPU_CENTER, getStoredApiKey, setStoredApiKey } from '../../services/mapService';
import {
  Compass,
  Plus,
  Minus,
  Maximize2,
  Key,
  ShieldAlert,
  AlertTriangle,
  Star,
  MapPin,
  CheckCircle,
} from 'lucide-react';

export const CampusMap = ({
  zones = [],
  edges = [],
  patrolPlan = null,
  selectedZone = null,
  onSelectZone,
  onApprovePlan,
}) => {
  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const polygonsRef = useRef([]);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const [mapType, setMapType] = useState('satellite'); // 'satellite' or 'roadmap'
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());

  // Definition of the 6 key campus zones matching the reference UI exactly
  const LPU_SECURITY_ZONES = [
    {
      id: 'hostel',
      name: 'Hostel Zone',
      risk: 'Low Risk',
      color: '#22C55E', // Green
      fillColor: 'rgba(34, 197, 94, 0.35)',
      strokeColor: '#22C55E',
      badge: '3',
      badgeType: 'circle',
      coords: [
        { lat: 31.2568, lng: 75.7035 },
        { lat: 31.2568, lng: 75.7065 },
        { lat: 31.2552, lng: 75.7065 },
        { lat: 31.2552, lng: 75.7035 },
      ],
      svgPolygon: '330,140 580,140 580,240 330,240',
      pinPos: { x: 420, y: 190 },
      riskScore: 24,
      category: 'Low',
      confidence: '98%',
      incidents: '0 in last 7 days',
      description: 'Hostel residential block. Regular student transit with biometric gates.',
    },
    {
      id: 'academic',
      name: 'Academic Block',
      risk: 'Critical',
      color: '#EF4444', // Red
      fillColor: 'rgba(239, 68, 68, 0.45)',
      strokeColor: '#EF4444',
      badge: '2',
      badgeType: 'alert',
      coords: [
        { lat: 31.2548, lng: 75.7022 },
        { lat: 31.2548, lng: 75.7042 },
        { lat: 31.2525, lng: 75.7042 },
        { lat: 31.2525, lng: 75.7022 },
      ],
      svgPolygon: '200,230 400,230 400,380 200,380',
      pinPos: { x: 300, y: 310 },
      riskScore: 92,
      category: 'Critical',
      confidence: '95%',
      incidents: '2 in last 7 days',
      description: 'Recent incidents (2 in last 7 days), high footfall during events, and limited exit points increase risk.',
    },
    {
      id: 'library',
      name: 'Library Zone',
      risk: 'Medium Risk',
      color: '#EAB308', // Yellow
      fillColor: 'rgba(234, 179, 8, 0.40)',
      strokeColor: '#EAB308',
      badge: '4',
      badgeType: 'alert',
      coords: [
        { lat: 31.2555, lng: 75.7062 },
        { lat: 31.2555, lng: 75.7088 },
        { lat: 31.2535, lng: 75.7088 },
        { lat: 31.2535, lng: 75.7062 },
      ],
      svgPolygon: '560,210 760,210 760,340 560,340',
      pinPos: { x: 650, y: 280 },
      riskScore: 58,
      category: 'Medium',
      confidence: '91%',
      incidents: '1 in last 7 days',
      description: 'Central Library & study hub. Elevated evening student congregation.',
    },
    {
      id: 'admin',
      name: 'Admin Block',
      risk: 'High Risk',
      color: '#EF4444', // Red
      fillColor: 'rgba(239, 68, 68, 0.45)',
      strokeColor: '#EF4444',
      badge: '!',
      badgeType: 'alert',
      coords: [
        { lat: 31.2532, lng: 75.7042 },
        { lat: 31.2532, lng: 75.7068 },
        { lat: 31.2515, lng: 75.7068 },
        { lat: 31.2515, lng: 75.7042 },
      ],
      svgPolygon: '440,360 680,360 680,490 440,490',
      pinPos: { x: 550, y: 430 },
      riskScore: 78,
      category: 'High',
      confidence: '94%',
      incidents: '2 in last 7 days',
      description: 'Central university administration, finance, and VIP executive reception.',
    },
    {
      id: 'innovation',
      name: 'Innovation Hub',
      risk: 'Critical',
      color: '#A855F7', // Purple
      fillColor: 'rgba(168, 85, 247, 0.40)',
      strokeColor: '#A855F7',
      badge: '5',
      badgeType: 'star',
      coords: [
        { lat: 31.2530, lng: 75.7070 },
        { lat: 31.2530, lng: 75.7095 },
        { lat: 31.2510, lng: 75.7095 },
        { lat: 31.2510, lng: 75.7070 },
      ],
      svgPolygon: '690,360 850,360 850,510 690,510',
      pinPos: { x: 760, y: 440 },
      riskScore: 89,
      category: 'Critical',
      confidence: '96%',
      incidents: '3 in last 7 days',
      description: 'Research labs, incubator centers, robotics, and advanced AI compute cluster.',
    },
    {
      id: 'sports',
      name: 'Sports Complex',
      risk: 'Low Risk',
      color: '#22C55E', // Green
      fillColor: 'rgba(34, 197, 94, 0.35)',
      strokeColor: '#22C55E',
      badge: '2',
      badgeType: 'circle',
      coords: [
        { lat: 31.2518, lng: 75.7020 },
        { lat: 31.2518, lng: 75.7040 },
        { lat: 31.2495, lng: 75.7040 },
        { lat: 31.2495, lng: 75.7020 },
      ],
      svgPolygon: '190,390 380,390 380,530 190,530',
      pinPos: { x: 280, y: 460 },
      riskScore: 18,
      category: 'Low',
      confidence: '99%',
      incidents: '0 in last 7 days',
      description: 'Olympic athletic ground, indoor sports arena, and gymnasium.',
    },
  ];

  // Starting location: Main Gate
  const MAIN_GATE = {
    name: 'Main Gate',
    lat: 31.2505,
    lng: 75.7045,
    svgPos: { x: 470, y: 540 },
  };

  // Planned route waypoints connecting through LPU campus
  const ROUTE_WAYPOINTS = [
    { num: 1, name: 'Main Gate', x: 470, y: 535, lat: 31.2505, lng: 75.7045 },
    { num: 2, name: 'Sports / Academic', x: 335, y: 440, lat: 31.2522, lng: 75.7032 },
    { num: 2, name: 'Academic Block', x: 340, y: 340, lat: 31.2540, lng: 75.7032 },
    { num: 3, name: 'Hostel Zone', x: 450, y: 220, lat: 31.2560, lng: 75.7048 },
    { num: 4, name: 'Library Zone', x: 700, y: 330, lat: 31.2545, lng: 75.7078 },
    { num: 5, name: 'Innovation Hub', x: 740, y: 450, lat: 31.2520, lng: 75.7082 },
    { num: 1, name: 'Main Gate', x: 470, y: 535, lat: 31.2505, lng: 75.7045 },
  ];

  // Try loading real Google Maps Platform
  useEffect(() => {
    let isMounted = true;
    loadGoogleMaps()
      .then((google) => {
        if (!isMounted) return;
        if (google && mapContainerRef.current) {
          const map = new google.maps.Map(mapContainerRef.current, {
            center: LPU_CENTER,
            zoom: 16.5,
            mapTypeId: mapType,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
            tilt: 0,
            styles: [
              { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'on' }] },
            ],
          });

          // Draw real Google Maps Polygons for the zones
          polygonsRef.current = LPU_SECURITY_ZONES.map((zone) => {
            const polygon = new google.maps.Polygon({
              paths: zone.coords,
              strokeColor: zone.strokeColor,
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: zone.color,
              fillOpacity: 0.35,
              map: map,
            });

            polygon.addListener('click', () => {
              if (onSelectZone) onSelectZone(zone);
            });

            return polygon;
          });

          // Draw glowing route polyline
          const routeCoordinates = ROUTE_WAYPOINTS.map((w) => ({ lat: w.lat, lng: w.lng }));
          polylineRef.current = new google.maps.Polyline({
            path: routeCoordinates,
            geodesic: true,
            strokeColor: '#38BDF8',
            strokeOpacity: 0.95,
            strokeWeight: 5,
            map: map,
          });

          // Draw markers for waypoints
          markersRef.current = ROUTE_WAYPOINTS.slice(0, 5).map((w) => {
            return new google.maps.Marker({
              position: { lat: w.lat, lng: w.lng },
              map: map,
              label: {
                text: `${w.num}`,
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#0284C7',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
              },
            });
          });

          googleMapInstanceRef.current = map;
          setIsGoogleMapsReady(true);
        } else {
          setIsGoogleMapsReady(false);
        }
      })
      .catch((err) => {
        console.error('Google Maps error:', err);
        setIsGoogleMapsReady(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update map type when toggled
  useEffect(() => {
    if (googleMapInstanceRef.current && window.google) {
      googleMapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setShowKeyModal(false);
    window.location.reload();
  };

  const handleZoomIn = () => {
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() - 1);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#080E1C] rounded-2xl overflow-hidden select-none border border-slate-800/80 shadow-2xl flex flex-col">
      {/* =========================================================================
          TOP MAP BAR: RISK LEGEND (LEFT) & MAP/SATELLITE SWITCHER (RIGHT)
          ========================================================================= */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Risk Legend Matching Image */}
        <div className="pointer-events-auto flex items-center gap-3.5 bg-[#091224]/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg text-[11px] font-semibold text-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E]"></span>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shadow-[0_0_6px_#EAB308]"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444]"></span>
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_6px_#A855F7]"></span>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/40 border border-red-400 border-dashed"></span>
            <span>Restricted</span>
          </div>
        </div>

        {/* Right Map Controls: Map / Satellite Switcher & Google Maps Key */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Map / Satellite Toggle */}
          <div className="flex items-center bg-[#091224]/85 backdrop-blur-md p-0.5 rounded-xl border border-slate-700/60 shadow-lg text-xs font-semibold">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-3 py-1 rounded-lg transition ${
                mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1 rounded-lg transition ${
                mapType === 'satellite' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* API Key Modal Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 bg-[#091224]/85 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition shadow-lg"
            title="Configure Google Maps API Key"
          >
            <Key className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          COMPASS NORTH ARROW INDICATOR (TOP-LEFT)
          ========================================================================= */}
      <div className="absolute top-14 left-5 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white drop-shadow-md">
            <polygon points="12,2 16,14 12,11 8,14" fill="#FFFFFF" />
            <polygon points="12,22 16,14 12,11 8,14" fill="#64748B" />
          </svg>
        </div>
        <span className="text-[10px] font-black text-white tracking-widest -mt-1 drop-shadow-md">N</span>
      </div>

      {/* =========================================================================
          MAIN MAP CANVAS: REAL GOOGLE MAPS PLATFORM OR SATELLITE CANVAS
          ========================================================================= */}
      <div className="flex-1 w-full h-full relative">
        {isGoogleMapsReady ? (
          <div ref={mapContainerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-[#0A1120]">
            {/* Real LPU High-Resolution Satellite Map Aerial Imagery */}
            <img
              src="/lpu_campus_bg.jpg"
              alt="Lovely Professional University Satellite Map"
              className="absolute inset-0 w-full h-full object-cover filter contrast-110 brightness-95"
            />
            {/* Subtle Map Tile Grid Overlay */}
            <div className="absolute inset-0 bg-slate-950/20 backdrop-contrast-105 pointer-events-none" />

            {/* SVG Interactive Overlay for Zones and Glowing Route */}
            <svg viewBox="0 0 1000 650" className="absolute inset-0 w-full h-full">
              <defs>
                {/* Glowing neon shadow filter for the patrol route */}
                <filter id="routeGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38BDF8" floodOpacity="0.8" />
                  <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#0284C7" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* 1. Zone Polygons */}
              {LPU_SECURITY_ZONES.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <g
                    key={zone.id}
                    className="cursor-pointer transition-opacity duration-200"
                    onClick={() => onSelectZone && onSelectZone(zone)}
                  >
                    <polygon
                      points={zone.svgPolygon}
                      fill={zone.fillColor}
                      stroke={zone.strokeColor}
                      strokeWidth={isSelected ? '3' : '2'}
                      strokeDasharray={zone.id === 'restricted' ? '6 4' : 'none'}
                      className="transition-all hover:opacity-90"
                    />
                  </g>
                );
              })}

              {/* 2. Glowing Patrol Route Polyline */}
              <path
                d="M 470 535 L 335 440 L 340 340 L 450 220 L 700 330 L 740 450 Z"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#routeGlowBlue)"
              />
              <path
                d="M 470 535 L 335 440 L 340 340 L 450 220 L 700 330 L 740 450 Z"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3. Numbered Waypoint Circles on Route */}
              {/* Waypoint 1: Main Gate */}
              <g transform="translate(470, 535)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">1</text>
              </g>

              {/* Waypoint 2: Academic/Sports */}
              <g transform="translate(335, 440)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">2</text>
              </g>

              {/* Waypoint 2 (Upper): Academic */}
              <g transform="translate(340, 340)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">2</text>
              </g>

              {/* Waypoint 3: Hostel Zone */}
              <g transform="translate(450, 220)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">3</text>
              </g>

              {/* Waypoint 4: Library Zone */}
              <g transform="translate(700, 330)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">4</text>
              </g>

              {/* Waypoint 5: Innovation Hub */}
              <g transform="translate(740, 450)">
                <circle cx="0" cy="0" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">5</text>
              </g>
            </svg>

            {/* 4. HTML Zone Pill Badges Floating on Map */}
            {/* A. Hostel Zone (Low Risk) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '45%', top: '27%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[0])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/60 shadow-xl text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-slate-950">
                  ●
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Hostel Zone</div>
                  <div className="text-[10px] text-emerald-400 font-medium">(Low Risk)</div>
                </div>
              </div>
            </div>

            {/* B. Academic Block (Critical) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '30%', top: '44%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[1])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)] text-white">
                <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                  !
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Academic Block</div>
                  <div className="text-[10px] text-red-400 font-medium">(Critical)</div>
                </div>
              </div>
            </div>

            {/* C. Library Zone (Medium Risk) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '66%', top: '42%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[2])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/70 shadow-xl text-white">
                <div className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 text-xs font-bold">
                  !
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Library Zone</div>
                  <div className="text-[10px] text-amber-400 font-medium">(Medium Risk)</div>
                </div>
              </div>
            </div>

            {/* D. Admin Block (High Risk) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '55%', top: '65%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[3])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-500/70 shadow-xl text-white">
                <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                  !
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Admin Block</div>
                  <div className="text-[10px] text-red-400 font-medium">(High Risk)</div>
                </div>
              </div>
            </div>

            {/* E. Innovation Hub (Critical) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '77%', top: '67%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[4])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white">
                <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  ★
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Innovation Hub</div>
                  <div className="text-[10px] text-purple-300 font-medium">(Critical)</div>
                </div>
              </div>
            </div>

            {/* F. Sports Complex (Low Risk) */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-105 transition"
              style={{ left: '28%', top: '70%' }}
              onClick={() => onSelectZone && onSelectZone(LPU_SECURITY_ZONES[5])}
            >
              <div className="flex items-center gap-2 bg-[#091224]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/60 shadow-xl text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-slate-950">
                  ●
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Sports Complex</div>
                  <div className="text-[10px] text-emerald-400 font-medium">(Low Risk)</div>
                </div>
              </div>
            </div>

            {/* G. Main Gate Starting Point Pin */}
            <div
              className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition"
              style={{ left: '47%', top: '88%' }}
            >
              <div className="flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 rounded-xl border-2 border-white shadow-2xl text-white font-extrabold text-xs">
                <MapPin className="w-3.5 h-3.5 fill-white" />
                <span>Main Gate</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          BOTTOM-LEFT: GOOGLE MAPS BRANDING & BOTTOM-RIGHT: ZOOM CONTROLS
          ========================================================================= */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none">
        <span className="text-white font-bold text-sm tracking-tight opacity-90 drop-shadow-md">
          Google
        </span>
      </div>

      <div className="absolute bottom-3 right-4 z-20 flex flex-col gap-1.5">
        <div className="bg-[#091224]/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (mapContainerRef.current?.requestFullscreen) {
                mapContainerRef.current.requestFullscreen();
              }
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          GOOGLE MAPS API KEY CONFIGURATION MODAL
          ========================================================================= */}
      {showKeyModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1426] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Google Maps Platform Integration</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Enter your real Google Cloud Maps JavaScript API key to load live Google Maps with dynamic satellite & terrain rendering of Lovely Professional University.
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Maps JavaScript API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full bg-[#080E1C] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold hover:bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30"
              >
                Save & Load Real Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
