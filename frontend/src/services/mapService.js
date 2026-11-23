/**
 * Leaflet & OpenStreetMap Spatial Service for Lovely Professional University.
 * Provides real geographical map tiles, boundaries, and spatial constants.
 * Zero proprietary API keys or paid billing requirements.
 */

// Real LPU Coordinates (NH-44 Phagwara, Punjab, India)
export const LPU_CENTER = [31.2530, 75.7045];

export const LPU_BOUNDS = [
  [31.2420, 75.6950], // South-West
  [31.2650, 75.7180], // North-East
];

const cartoApiKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CARTO_API_KEY) || '';

export const TILE_LAYERS = {
  dark: {
    id: 'dark',
    name: cartoApiKey ? 'Dark Canvas (CARTO)' : 'Dark Canvas (Esri / CARTO)',
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?api_key=${cartoApiKey}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: cartoApiKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
      : 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    subdomains: 'abc', // strictly 'abc'; 'd' lacks valid SSL cert authority
    maxNativeZoom: cartoApiKey ? 19 : 16,
    maxZoom: 19,
  },
  streets: {
    id: 'streets',
    name: 'OpenStreetMap Streets',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    name: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
    maxNativeZoom: 18,
    maxZoom: 19,
  },
};

// Verified 12 LPU Campus Sectors with WGS84 Coordinates
export const VERIFIED_LPU_ZONES = [
  {
    zone_id: 'Z01',
    name: 'Main Security Gate 1 & Visitor Access',
    category: 'Entrance',
    latitude: 31.2553,
    longitude: 75.7042,
    base_priority: 9,
    description: 'Primary campus entry gate connecting to NH-44 highway. Automated boom barriers and primary checkpoint.',
  },
  {
    zone_id: 'Z02',
    name: 'Block 1 - Central Administration & Reception',
    category: 'Administration',
    latitude: 31.2546,
    longitude: 75.7047,
    base_priority: 8,
    description: "Administrative hub housing Vice Chancellor's office, registrar, admissions office, and accounts desk.",
  },
  {
    zone_id: 'Z03',
    name: 'Engineering & Technology Complex (Blocks 32-34)',
    category: 'Academic',
    latitude: 31.2532,
    longitude: 75.7052,
    base_priority: 7,
    description: 'Major academic block for CSE and Engineering students, housing AI/ML labs and seminar halls.',
  },
  {
    zone_id: 'Z04',
    name: 'Uni-Mall & Student Commercial Square',
    category: 'Commercial',
    latitude: 31.2519,
    longitude: 75.7061,
    base_priority: 9,
    description: 'Vibrant campus mall with multi-cuisine food courts, bank branches, and high student congregation.',
  },
  {
    zone_id: 'Z05',
    name: 'Central Bus Terminus & Multi-Level Parking',
    category: 'Transit',
    latitude: 31.2560,
    longitude: 75.7045,
    base_priority: 6,
    description: 'Parking facility for university transit buses, staff automobiles, and student vehicles.',
  },
  {
    zone_id: 'Z06',
    name: 'Central Library & Knowledge Resource Centre (Block 34)',
    category: 'Library',
    latitude: 31.2536,
    longitude: 75.7045,
    base_priority: 7,
    description: 'Multi-storey knowledge centre housing physical archives, digital reading wings, and 24/7 study cubicles.',
  },
  {
    zone_id: 'Z07',
    name: 'Shanti Devi Mittal Auditorium & Unipolis',
    category: 'Assembly',
    latitude: 31.2541,
    longitude: 75.7059,
    base_priority: 8,
    description: 'Grand auditorium (3,000+ capacity) and outdoor open-air Unipolis theatre for cultural festivals.',
  },
  {
    zone_id: 'Z08',
    name: 'Boys Hostel Cluster (BH-1, BH-2, BH-3, BH-4)',
    category: 'Hostel',
    latitude: 31.2498,
    longitude: 75.7075,
    base_priority: 8,
    description: 'High-density residential precinct for undergraduate and postgraduate male students.',
  },
  {
    zone_id: 'Z09',
    name: 'Girls Hostel Cluster (GH-1, GH-2, GH-3)',
    category: 'Hostel',
    latitude: 31.2565,
    longitude: 75.7058,
    base_priority: 9,
    description: 'Secure residential complex with strict biometric entry protocols and round-the-clock wardens.',
  },
  {
    zone_id: 'Z10',
    name: 'Baldev Raj Mittal Healthcare Centre (Uni-Hospital)',
    category: 'Medical',
    latitude: 31.2558,
    longitude: 75.7038,
    base_priority: 9,
    description: 'On-campus hospital offering emergency medical services, trauma care, ambulance fleet bay, and pharmacy.',
  },
  {
    zone_id: 'Z11',
    name: 'Indoor Stadium & Olympic Sports Complex',
    category: 'Sports',
    latitude: 31.2525,
    longitude: 75.7078,
    base_priority: 6,
    description: 'Comprehensive sports infrastructure featuring badminton courts, Olympic pool, and athletics track.',
  },
  {
    zone_id: 'Z12',
    name: 'Security Command HQ & Dispatch Office',
    category: 'Administration',
    latitude: 31.2550,
    longitude: 75.7040,
    base_priority: 10,
    description: 'Central Security Command Centre with CCTV video wall, emergency dispatch desk, and patrol radio base.',
  },
];
