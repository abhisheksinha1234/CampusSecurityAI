import React, { useState, useEffect } from 'react';
import { apiService } from './services/apiService';
import { LoginPage } from './components/Auth/LoginPage';
import { CampusMap } from './components/GoogleMap/CampusMap';
import { EvaluationModal } from './components/Evaluation/EvaluationModal';
import { AlgorithmsModal } from './components/AlgorithmsDemo/AlgorithmsModal';
import {
  Shield,
  Compass,
  Award,
  Radio,
  FileCheck2,
  Sliders,
  Layers,
  MapPin,
  RefreshCw,
  Info,
  LogOut,
  UserCheck,
  LayoutDashboard,
  Map,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Clock,
  Navigation,
  CheckCircle2,
  Check,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lpu_security_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeNav, setActiveNav] = useState('Dashboard');
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isAlgorithmsOpen, setIsAlgorithmsOpen] = useState(false);
  const [isPlanApproved, setIsPlanApproved] = useState(false);
  const [currentTime, setCurrentTime] = useState('14 Apr 2026, 16:45');

  // Currently selected zone for AI Risk Explanation card (defaults to Academic Block as in the image)
  const [selectedZone, setSelectedZone] = useState({
    name: 'Academic Block',
    risk: 'Critical',
    riskScore: 92,
    category: 'Critical',
    confidence: '95%',
    description:
      'Recent incidents (2 in last 7 days), high footfall during events, and limited exit points increase risk.',
  });

  // Keep clock updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(`${dateStr}, ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('lpu_security_user', JSON.stringify(user));
    localStorage.setItem('lpu_security_token', token);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
  };

  const handleApprovePlan = () => {
    setIsPlanApproved(true);
    alert('Patrol Plan Approved and Dispatched to Field Units.');
  };

  const handleRequestChanges = () => {
    setIsPlanApproved(false);
    alert('Plan revision requested. AI Orienteering Optimizer re-calculating patrol weights.');
  };

  // If not logged in, render Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation items matching the screenshot
  const NAV_ITEMS = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Map View', icon: Map },
    { name: 'Risk Analytics', icon: BarChart2 },
    { name: 'Patrol Plans', icon: ShieldCheck },
    { name: 'Incidents', icon: AlertTriangle },
    { name: 'Zone Management', icon: Layers },
    { name: 'Reports', icon: FileText },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#070D18] text-slate-100 font-sans overflow-hidden select-none">
      {/* =========================================================================
          1. LEFT SIDEBAR NAVIGATION (Matching image design)
          ========================================================================= */}
      <aside className="w-60 bg-[#091122] border-r border-slate-800/80 flex flex-col justify-between shrink-0 shadow-2xl z-40">
        <div>
          {/* Top Logo Container */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/60">
            {/* LPU Sunburst Radiating Logo */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-7 h-7 text-white fill-current">
                <circle cx="18" cy="18" r="5" fill="#FFFFFF" />
                <path d="M18,2 L18,7 M18,29 L18,34 M2,18 L7,18 M29,18 L34,18 M6.7,6.7 L10.2,10.2 M25.8,25.8 L29.3,29.3 M6.7,29.3 L10.2,25.8 M25.8,10.2 L29.3,6.7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg text-white tracking-wider leading-none">LPU</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">SECURITY AGENT</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveNav(item.name);
                    if (item.name === 'Risk Analytics') setIsAlgorithmsOpen(true);
                    if (item.name === 'Reports') setIsEvaluationOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar LPU Branding Card (from screenshot) */}
        <div className="p-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#0E1A33] to-[#0A1224] border border-slate-700/60 relative overflow-hidden shadow-xl">
            <div className="relative z-10 flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-orange-400 flex items-center justify-center shadow-md">
                <svg viewBox="0 0 36 36" className="w-5 h-5 text-white fill-current">
                  <circle cx="18" cy="18" r="4" fill="#FFFFFF" />
                  <path d="M18,3 L18,7 M18,29 L18,33 M3,18 L7,18 M29,18 L33,18" stroke="#FFFFFF" strokeWidth="2.5" />
                </svg>
              </div>
              <span className="font-extrabold text-sm text-white tracking-wide">LPU</span>
            </div>
            <div className="relative z-10 text-[10px] text-slate-300 font-medium leading-tight">
              <div>Think Big</div>
              <div className="text-slate-400">Think Ahead</div>
            </div>

            {/* Campus Silhouette Vector Graphic Underlay */}
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none w-24 h-16">
              <svg viewBox="0 0 100 60" fill="#38BDF8">
                <rect x="10" y="25" width="20" height="35" />
                <rect x="35" y="10" width="30" height="50" />
                <rect x="70" y="30" width="25" height="30" />
              </svg>
            </div>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* =========================================================================
            TOP HEADER BAR (Matching screenshot exactly)
            ========================================================================= */}
        <header className="h-16 bg-[#091122] border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 z-30">
          {/* Project Title */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-snug">
                Adaptive Campus Security
              </h1>
              <p className="text-xs text-slate-400 font-medium leading-tight">
                Patrol Planning and Coverage Agent
              </p>
            </div>
          </div>

          {/* Center Location Pill: Lovely Professional University, Punjab */}
          <div className="flex items-center gap-2 bg-[#0B1528] hover:bg-[#0F1D38] transition cursor-pointer px-4 py-2 rounded-xl border border-slate-700/60 shadow-lg text-xs font-semibold text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Lovely Professional University, Punjab</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>

          {/* Right Status & User Profile */}
          <div className="flex items-center gap-4">
            {/* System Online & Timestamp */}
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>System Online</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Last Updated: {currentTime}
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition border border-slate-700/60">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500"></span>
            </div>

            {/* Admin Avatar Circle */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-red-600 text-white font-extrabold text-xs flex items-center justify-center cursor-pointer transition shadow-lg shadow-blue-600/30"
                title="Click to Sign Out"
              >
                AD
              </div>
            </div>
          </div>
        </header>

        {/* =========================================================================
            MAIN DASHBOARD GRID (Exact Layout: Top Map + Right Column, Bottom Row)
            ========================================================================= */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-3.5 bg-[#070D18]">
          {/* =========================================================================
              A. TOP-LEFT: REAL LPU CAMPUS GOOGLE MAP (8 Columns)
              ========================================================================= */}
          <div className="col-span-12 lg:col-span-8 min-h-[460px] h-[52vh] flex flex-col">
            <CampusMap
              selectedZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
            />
          </div>

          {/* =========================================================================
              B. TOP-RIGHT: 2 SIDEBAR CARDS (4 Columns)
              ========================================================================= */}
          <div className="col-span-12 lg:col-span-4 min-h-[460px] h-[52vh] flex flex-col gap-3.5">
            {/* CARD 1: AI RISK EXPLANATION */}
            <div className="flex-1 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-xs text-white">AI Risk Explanation</h3>
                  </div>
                  <button
                    onClick={() => setIsAlgorithmsOpen(true)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Risk Title & Alert Icon */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-white leading-tight">
                      High Risk Zone: {selectedZone.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {selectedZone.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Metrics */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300">Risk Score</span>
                    <span className="text-red-400 font-mono">{selectedZone.riskScore || 92} / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500"
                      style={{ width: `${selectedZone.riskScore || 92}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Category</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                      {selectedZone.category || 'Critical'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Confidence</span>
                    <span className="font-bold text-white font-mono">{selectedZone.confidence || '95%'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: PATROL COVERAGE STATISTICS */}
            <div className="flex-1 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5 mb-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-xs text-white">Patrol Coverage Statistics</h3>
              </div>

              {/* Circular Gauge and Stats Breakdown */}
              <div className="flex items-center justify-around py-1">
                {/* Circular Progress Gauge */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      stroke="#1E293B"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      stroke="#22C55E"
                      strokeWidth="8"
                      strokeDasharray="238"
                      strokeDashoffset="31"
                      strokeLinecap="round"
                      fill="transparent"
                      className="filter drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-black text-white leading-none">87%</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Coverage</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-slate-300">Covered Zones</span>
                    </div>
                    <span className="font-bold text-white font-mono">5</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span className="text-slate-300">Remaining Zones</span>
                    </div>
                    <span className="font-bold text-white font-mono">1</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="text-slate-300">High-Risk Covered</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">100%</span>
                  </div>
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-medium text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Estimated Duration: <strong className="text-white font-mono">~ 38 min</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  <span>Route Distance: <strong className="text-white font-mono">~ 4.8 km</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              C. BOTTOM ROW: 3 EQUAL-HEIGHT CARDS (4 + 4 + 4 Columns)
              ========================================================================= */}
          {/* BOTTOM CARD 1: PATROL PLAN OVERVIEW */}
          <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5 mb-2">
              <FileCheck2 className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs text-white">Patrol Plan Overview</h3>
            </div>

            <div className="space-y-2 py-1 flex-1">
              {/* Step 1: Main Gate */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="font-bold text-blue-400">Main Gate – Starting Point</span>
              </div>

              {/* Step 2: Sports Complex */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-slate-300">Sports Complex (Low Risk)</span>
              </div>

              {/* Step 3: Hostel Zone */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-slate-300">Hostel Zone (Low Risk)</span>
              </div>

              {/* Step 4: Innovation Hub */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  4
                </span>
                <span className="text-slate-300">Innovation Hub (Critical)</span>
              </div>

              {/* Step 5: Library Zone */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  5
                </span>
                <span className="text-slate-300">Library Zone (Medium Risk)</span>
              </div>
            </div>
          </div>

          {/* BOTTOM CARD 2: RECOMMENDED PATROL ROUTE & SPLINE CHART */}
          <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-xs text-white">Recommended Patrol Route</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  AI Recommended
                </span>
              </div>

              {/* 4 Stat Tiles */}
              <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Coverage</div>
                  <div className="font-bold text-xs text-white font-mono mt-0.5">87%</div>
                </div>
                <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Duration</div>
                  <div className="font-bold text-xs text-white font-mono mt-0.5">~ 38 min</div>
                </div>
                <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Distance</div>
                  <div className="font-bold text-xs text-white font-mono mt-0.5">4.8 km</div>
                </div>
                <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Priority</div>
                  <div className="font-bold text-xs text-rose-400 font-mono mt-0.5">High</div>
                </div>
              </div>
            </div>

            {/* Risk Distribution Wave Spline Chart */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-semibold text-slate-400">Risk Distribution</span>
                <div className="flex items-center gap-2 text-[9px] font-medium">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Low</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Med</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>High</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>Crit</span>
                </div>
              </div>

              {/* SVG Spline Curve Matching Image */}
              <div className="w-full h-10 relative">
                <svg viewBox="0 0 300 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="35%" stopColor="#EAB308" />
                      <stop offset="70%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                  {/* Glowing spline curve */}
                  <path
                    d="M 10 32 Q 50 36 90 28 T 160 18 T 230 14 T 290 32"
                    fill="none"
                    stroke="url(#waveGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                  />
                  {/* Data Dots */}
                  <circle cx="10" cy="32" r="3" fill="#22C55E" />
                  <circle cx="90" cy="28" r="3" fill="#22C55E" />
                  <circle cx="160" cy="18" r="3" fill="#EAB308" />
                  <circle cx="230" cy="14" r="3" fill="#EF4444" />
                  <circle cx="290" cy="32" r="3" fill="#A855F7" />
                </svg>
              </div>
            </div>
          </div>

          {/* BOTTOM CARD 3: HUMAN APPROVAL (HITL) */}
          <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5 mb-2.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-xs text-white">Human Approval</h3>
              </div>

              {/* Status Box */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0D182E] border border-slate-800 mb-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-400 leading-tight">
                    {isPlanApproved ? 'Patrol Plan Dispatched & Live' : 'Plan Ready for Review'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {isPlanApproved
                      ? 'Approved by Chief Security Officer. Field patrol units in transit.'
                      : 'Please review the recommended patrol plan before deployment.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons Matching Screenshot */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleApprovePlan}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Approve Plan</span>
              </button>

              <button
                onClick={handleRequestChanges}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Evaluation Benchmark Modal */}
      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => setIsEvaluationOpen(false)}
      />

      {/* Search Algorithms Demo Modal */}
      <AlgorithmsModal
        isOpen={isAlgorithmsOpen}
        onClose={() => setIsAlgorithmsOpen(false)}
        zones={[]}
      />
    </div>
  );
}
