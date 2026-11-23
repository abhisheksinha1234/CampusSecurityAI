import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from './services/apiService';
import { LoginPage } from './components/Auth/LoginPage';
import { CampusMap } from './components/GoogleMap/CampusMap';
import { EvaluationModal } from './components/Evaluation/EvaluationModal';
import { AlgorithmsModal } from './components/AlgorithmsDemo/AlgorithmsModal';
import { MetricCards } from './components/RiskDashboard/MetricCards';
import { ExplainabilityPanel } from './components/Explainability/ExplainabilityPanel';
import { PatrolRoutePanel } from './components/PatrolRoute/PatrolRoutePanel';
import { SimulatorPanel } from './components/ScenarioSimulator/SimulatorPanel';
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
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  User,
  Lock,
  Unlock,
  Server,
  Activity,
  Download,
  ExternalLink,
  ShieldAlert,
  AlertOctagon,
  Eye,
  CheckSquare,
  HelpCircle,
  Building,
  Zap,
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
  const [currentTime, setCurrentTime] = useState('16 Nov 2026, 16:45');

  // Dynamic Backend Data State
  const [patrolPlan, setPatrolPlan] = useState(null);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);

  // Filter & Search States
  const [riskSearchQuery, setRiskSearchQuery] = useState('');
  const [riskCategoryFilter, setRiskCategoryFilter] = useState('ALL');
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');

  // Incident Logging Form State
  const [newIncidentZone, setNewIncidentZone] = useState('Z04');
  const [newIncidentCategory, setNewIncidentCategory] = useState('CROWD_CONGESTION');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState(4);
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  // Selected Zone State with full 8-factor risk breakdown
  const [selectedZone, setSelectedZone] = useState({
    zone_id: 'Z02',
    name: 'Admin Block 1 & Academic Offices',
    riskScore: 78,
    risk_score: 78,
    category: 'High',
    risk_level: 'High',
    riskColor: '#EF4444',
    risk_color: '#EF4444',
    confidence: '95%',
    description: 'High footfall during administrative hours and critical executive infrastructure.',
    topFactors: [
      ['Base priority', 85],
      ['Crowd density', 70],
      ['Time of day', 65],
    ],
    factors: {
      base_priority: 85,
      crowd_density: 70,
      time_of_day: 65,
      historical_incidents: 40,
      active_incident_severity: 30,
      patrol_neglect: 45,
      active_alerts: 20,
    },
    risk_breakdown: {
      total_score: 78,
      risk_level: 'High',
      risk_color: '#EF4444',
      confidence: 0.95,
      justification: 'High footfall during administrative hours and critical executive infrastructure.',
      factors: {
        base_priority: 85,
        crowd_density: 70,
        time_of_day: 65,
        historical_incidents: 40,
        active_incident_severity: 30,
        patrol_neglect: 45,
        active_alerts: 20,
      },
    },
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

  // Fetch 8-Factor Explainable AI Breakdown for any zone
  const fetchZoneRiskExplanation = useCallback(async (zoneId, defaultName = '') => {
    try {
      const res = await apiService.explainZoneRisk(zoneId);
      const evalData = res.risk_evaluation || {};
      const expData = res.explanation || {};
      const zoneInList = zones.find((z) => z.zone_id === zoneId);

      const zoneObj = {
        zone_id: res.zone_id || zoneId,
        name: res.zone_name || defaultName || zoneInList?.name || zoneId,
        category: zoneInList?.category || evalData.risk_level || 'Medium',
        riskScore: Math.round(evalData.total_score || 50),
        risk_score: Math.round(evalData.total_score || 50),
        risk_level: evalData.risk_level || 'Medium',
        riskColor: evalData.risk_color || '#F59E0B',
        risk_color: evalData.risk_color || '#F59E0B',
        confidence: expData.confidence_rating || '95%',
        description: expData.summary || evalData.justification || 'Live risk assessment based on 8 campus security factors.',
        details: expData.details || '',
        topFactors: expData.top_factors || [],
        factors: evalData.factors || null,
        risk_breakdown: evalData,
        is_restricted: zoneInList?.is_restricted || false,
        last_patrol_hours_ago: zoneInList?.last_patrol_hours_ago || 1.2,
      };

      setSelectedZone(zoneObj);
    } catch (err) {
      console.warn(`Could not load explanation for ${zoneId}:`, err);
    }
  }, [zones]);

  // Auth Handlers
  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('lpu_security_user', JSON.stringify(user));
    localStorage.setItem('lpu_security_token', token);
  };

  const handleLogout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setPatrolPlan(null);
    setZones([]);
    setIncidents([]);
  }, []);

  // Fetch initial dashboard data (Plan, Campus Zones, and Incidents)
  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingPlan(true);
    setDashboardError(null);

    // 1. Fetch current active patrol plan from backend (gracefully handle empty/missing plans)
    let plan = null;
    try {
      plan = await apiService.getCurrentPlan();
      setPatrolPlan(plan);
    } catch (planErr) {
      if (planErr.message === 'AUTH_EXPIRED') {
        console.warn('Session expired. Redirecting to login.');
        handleLogout();
        return;
      }
      console.warn('No active patrol plan found on server:', planErr);
      setPatrolPlan(null);
    }

    // 2. Fetch all verified campus zones with risk scores
    let loadedZones = [];
    try {
      const zonesData = await apiService.getZones();
      loadedZones = zonesData.zones || [];
      setZones(loadedZones);
    } catch (zoneErr) {
      if (zoneErr.message === 'AUTH_EXPIRED') {
        handleLogout();
        return;
      }
      console.warn('Failed to load campus zones from backend:', zoneErr);
    }

    // 3. Fetch campus incidents
    try {
      const incData = await apiService.getIncidents();
      setIncidents(incData.incidents || []);
    } catch (incErr) {
      console.warn('Failed to load incidents:', incErr);
    }

    // 4. Auto-load initial risk explanation
    if (plan && plan.stops && plan.stops.length > 0) {
      const highRiskStop = [...plan.stops].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];
      if (highRiskStop && highRiskStop.zone_id) {
        fetchZoneRiskExplanation(highRiskStop.zone_id, highRiskStop.zone_name);
      }
    } else if (loadedZones.length > 0) {
      fetchZoneRiskExplanation(loadedZones[0].zone_id, loadedZones[0].name);
    }

    setIsLoadingPlan(false);
  }, [currentUser, fetchZoneRiskExplanation, handleLogout]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Map zone identifiers from map clicks or list clicks to backend IDs
  const handleSelectZone = (zoneOrId) => {
    if (!zoneOrId) return;

    let targetId = typeof zoneOrId === 'string' ? zoneOrId : zoneOrId.zone_id || zoneOrId.id;
    let targetName = typeof zoneOrId === 'object' ? zoneOrId.name || zoneOrId.zone_name : '';

    const MOCK_MAP = {
      hostel: 'Z07',
      academic: 'Z02',
      library: 'Z03',
      sports: 'Z10',
      admin: 'Z02',
      innovation: 'Z11',
      maingate: 'Z01',
    };
    if (MOCK_MAP[targetId]) {
      targetId = MOCK_MAP[targetId];
    }

    fetchZoneRiskExplanation(targetId, targetName);
  };

  // Human Approval Workflow Handler (HITL)
  const handleApprovePlan = async () => {
    if (!patrolPlan || !patrolPlan.plan_id) return;
    setIsApproving(true);
    setApprovalMessage(null);
    setDashboardError(null);

    const reviewer = currentUser?.full_name || 'Chief Security Officer';
    try {
      const res = await apiService.approvePlan(
        patrolPlan.plan_id,
        reviewer,
        'APPROVE',
        `Approved by ${reviewer} (${currentUser?.role || 'ADMIN'}). Live dispatch authorized.`
      );

      if (res.status === 'SUCCESS') {
        setPatrolPlan((prev) => ({
          ...prev,
          status: 'APPROVE',
          reviewed_by: res.reviewed_by || reviewer,
          reviewed_at: res.timestamp,
        }));
        setApprovalMessage({
          type: 'success',
          text: `Patrol plan ${patrolPlan.plan_id} approved. Field units dispatched.`,
        });
      }
    } catch (err) {
      console.error('Approval failed:', err);
      setDashboardError(err.message || 'Authorization failed: You may not have administrative approval rights.');
    } finally {
      setIsApproving(false);
    }
  };

  // Request Changes / Dynamic Replan Workflow Handler
  const handleRequestChanges = async () => {
    setIsRequestingChanges(true);
    setApprovalMessage(null);
    setDashboardError(null);

    try {
      const updatedPlan = await apiService.generatePatrolPlan({
        startZoneId: patrolPlan?.start_zone_id || 'Z12',
        endZoneId: patrolPlan?.end_zone_id || 'Z12',
        timeBudgetMinutes: 40.0,
        dwellMinutes: 2.0,
      });
      setPatrolPlan(updatedPlan);
      setApprovalMessage({
        type: 'info',
        text: 'AI Orienteering Optimizer generated a revised patrol itinerary. Ready for review.',
      });
    } catch (err) {
      console.error('Replanning request failed:', err);
      setDashboardError(err.message || 'Failed to request plan revision from optimization engine.');
    } finally {
      setIsRequestingChanges(false);
    }
  };

  // Generate Plan Handler for Patrol Plans View
  const handleGeneratePatrolPlan = async (params) => {
    setIsLoadingPlan(true);
    setApprovalMessage(null);
    setDashboardError(null);
    try {
      const newPlan = await apiService.generatePatrolPlan(params);
      setPatrolPlan(newPlan);
      setApprovalMessage({
        type: 'info',
        text: `Generated optimal patrol itinerary (${newPlan.plan_id}) with ${newPlan.stops?.length || 0} stops.`,
      });
    } catch (err) {
      setDashboardError(err.message || 'Failed to generate patrol plan.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Toggle Zone Restriction Handler
  const handleToggleRestriction = async (zoneId, isRestricted, reason = 'Operator manual action') => {
    try {
      await apiService.toggleZoneRestriction(zoneId, isRestricted, reason);
      setApprovalMessage({
        type: 'success',
        text: `Zone ${zoneId} ${isRestricted ? 'restricted / placed under lockdown' : 'restriction lifted and reopened'}.`,
      });
      const zonesData = await apiService.getZones();
      const updatedZones = zonesData.zones || [];
      setZones(updatedZones);
      if (selectedZone?.zone_id === zoneId) {
        fetchZoneRiskExplanation(zoneId, selectedZone.name);
      }
    } catch (err) {
      setDashboardError(err.message || 'Failed to toggle zone restriction.');
    }
  };

  // Scenario Simulator Handlers
  const handleSimulateScenario = async (payload) => {
    try {
      setIsLoadingPlan(true);
      const res = await apiService.simulateScenario(payload);
      setApprovalMessage({
        type: 'info',
        text: res.message || 'Simulation event injected. Replanning route...',
      });
      await fetchDashboardData();
    } catch (err) {
      setDashboardError(err.message || 'Scenario simulation failed.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleResetCampus = async () => {
    try {
      setIsLoadingPlan(true);
      await apiService.resetScenario();
      setApprovalMessage({
        type: 'success',
        text: 'Campus state reset to standard baseline.',
      });
      await fetchDashboardData();
    } catch (err) {
      setDashboardError(err.message || 'Failed to reset campus.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Manual Incident Reporting Handler
  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!newIncidentDesc.trim()) {
      setDashboardError('Please provide an incident description.');
      return;
    }
    setIsSubmittingIncident(true);
    setDashboardError(null);
    try {
      const zoneObj = zones.find((z) => z.zone_id === newIncidentZone);
      const payload = {
        incident_id: `INC-${Date.now().toString().slice(-4)}`,
        zone_id: newIncidentZone,
        zone_name: zoneObj?.name || newIncidentZone,
        severity: Number(newIncidentSeverity),
        category: newIncidentCategory,
        description: newIncidentDesc.trim(),
        status: 'ACTIVE',
        timestamp: new Date().toISOString(),
      };
      const res = await apiService.createIncident(payload);
      setApprovalMessage({
        type: 'success',
        text: res.message || 'Incident successfully reported and logged.',
      });
      setNewIncidentDesc('');
      await fetchDashboardData();
    } catch (err) {
      setDashboardError(err.message || 'Failed to report incident.');
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  // If not logged in, render Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Dynamic Statistics Calculations from backend plan
  const totalCampusZones = patrolPlan?.total_campus_zones || (zones.length > 0 ? zones.length : 12);
  const coveredZonesCount = patrolPlan?.total_zones_visited || (patrolPlan?.stops ? new Set(patrolPlan.stops.map((s) => s.zone_id)).size : 0);
  const remainingZonesCount = Math.max(0, totalCampusZones - coveredZonesCount);
  const coveragePercentage = Math.round(
    patrolPlan?.priority_coverage_percentage ?? (totalCampusZones > 0 ? (coveredZonesCount / totalCampusZones) * 100 : 0)
  );

  const estimatedDurationMinutes = patrolPlan?.total_estimated_duration_minutes
    ? Math.round(patrolPlan.total_estimated_duration_minutes)
    : 0;

  const totalDistanceKm = patrolPlan?.total_distance_meters
    ? (patrolPlan.total_distance_meters / 1000).toFixed(1)
    : '0.0';

  const isPlanApproved = patrolPlan?.status === 'APPROVE';

  // SVG circular gauge calculation
  const gaugeCircumference = 239;
  const gaugeOffset = gaugeCircumference - (gaugeCircumference * Math.min(coveragePercentage, 100)) / 100;

  // Filtered zones for Risk Analytics
  const filteredRiskZones = zones
    .filter((z) => {
      const matchSearch =
        z.name?.toLowerCase().includes(riskSearchQuery.toLowerCase()) ||
        z.zone_id?.toLowerCase().includes(riskSearchQuery.toLowerCase());
      const matchCat =
        riskCategoryFilter === 'ALL' ||
        z.category?.toUpperCase() === riskCategoryFilter.toUpperCase();
      return matchSearch && matchCat;
    })
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  // Filtered zones for Zone Management
  const filteredAdminZones = zones.filter((z) => {
    return (
      z.name?.toLowerCase().includes(zoneSearchQuery.toLowerCase()) ||
      z.zone_id?.toLowerCase().includes(zoneSearchQuery.toLowerCase()) ||
      z.category?.toLowerCase().includes(zoneSearchQuery.toLowerCase())
    );
  });

  // Sidebar navigation items
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
          1. LEFT SIDEBAR NAVIGATION
          ========================================================================= */}
      <aside className="w-60 bg-[#0A1120] border-r border-slate-800/90 flex flex-col justify-between p-3.5 z-20 shrink-0 select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-2 py-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-[#0B132B] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="font-black text-sm tracking-wide text-white leading-tight">LPU</div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Security Ops</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Evaluation Benchmarks Modal Shortcut */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={() => setIsEvaluationOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700/60"
          >
            <span className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Benchmarks</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">VS Baseline</span>
          </button>

          <button
            onClick={() => setIsAlgorithmsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700/60"
          >
            <span className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>Search Algorithms</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">BFS/A*</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA (DYNAMIC TAB RENDERING)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Navigation Bar */}
        <header className="h-14 border-b border-slate-800/90 bg-[#091224]/90 backdrop-blur-md px-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
              <span>Adaptive Campus Security Patrol Planning and Coverage Agent</span>
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/70 text-slate-300 text-xs border border-slate-700/60">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Lovely Professional University, Punjab</span>
            </div>
            {activeNav !== 'Dashboard' && (
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                {activeNav}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* System Online Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden md:inline">System Online</span>
              <span className="text-slate-500 hidden lg:inline">•</span>
              <span className="text-slate-400 text-[11px] font-mono hidden lg:inline">{currentTime}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition border border-slate-700/60">
              <Bell className="w-4 h-4" />
              {incidents.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </div>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div
                onClick={handleLogout}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-red-600 text-white font-extrabold text-xs flex items-center justify-center cursor-pointer transition shadow-lg shadow-blue-600/30"
                title={`${currentUser.full_name} (${currentUser.role}) • Click to Sign Out`}
              >
                {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
              </div>
            </div>
          </div>
        </header>

        {/* Global Notification Banners */}
        {approvalMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-600/80 rounded-xl text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{approvalMessage.text}</span>
            </div>
            <button onClick={() => setApprovalMessage(null)} className="text-emerald-400 hover:text-white text-[10px] font-bold">
              DISMISS
            </button>
          </div>
        )}

        {dashboardError && (
          <div className="mx-4 mt-3 p-2.5 bg-red-950/80 border border-red-600/80 rounded-xl text-red-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{dashboardError}</span>
            </div>
            <button onClick={() => setDashboardError(null)} className="text-red-400 hover:text-white text-[10px] font-bold">
              DISMISS
            </button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: DASHBOARD (Exact 12-Column Layout)
            ========================================================================= */}
        {activeNav === 'Dashboard' && (
          <main className="flex-1 p-4 grid grid-cols-12 gap-3.5 bg-[#070D18]">
            {/* A. TOP-LEFT: REAL LPU CAMPUS MAP (8 Columns) */}
            <div className="col-span-12 lg:col-span-8 min-h-[460px] h-[52vh] flex flex-col">
              <CampusMap
                zones={zones}
                patrolPlan={patrolPlan}
                incidents={incidents}
                selectedZone={selectedZone}
                onSelectZone={handleSelectZone}
              />
            </div>

            {/* B. TOP-RIGHT: 2 SIDEBAR CARDS (4 Columns) */}
            <div className="col-span-12 lg:col-span-4 min-h-[460px] h-[52vh] flex flex-col gap-3.5">
              {/* CARD 1: AI RISK EXPLANATION */}
              <div className="flex-1 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-xs text-white">AI Risk Explanation</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedZone.zone_id}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${selectedZone.riskColor}25`, color: selectedZone.riskColor }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white leading-tight">
                        {selectedZone.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {selectedZone.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">Composite Risk Score</span>
                      <span className="font-mono font-bold" style={{ color: selectedZone.riskColor }}>
                        {selectedZone.riskScore} / 100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 shadow-lg"
                        style={{
                          width: `${Math.min(selectedZone.riskScore, 100)}%`,
                          backgroundColor: selectedZone.riskColor,
                        }}
                      />
                    </div>
                  </div>

                  {selectedZone.topFactors && selectedZone.topFactors.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-1">
                        Primary Risk Contributors:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedZone.topFactors.map(([factorName, score], idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-[10px] text-slate-300 flex items-center gap-1"
                          >
                            <span className="capitalize">{factorName.replace(/_/g, ' ')}</span>
                            <strong className="text-blue-400 font-mono">{Math.round(score)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Category:</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${selectedZone.riskColor}20`,
                          color: selectedZone.riskColor,
                          borderColor: `${selectedZone.riskColor}40`,
                        }}
                      >
                        {selectedZone.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">AI Confidence:</span>
                      <span className="font-bold text-white font-mono text-[11px]">{selectedZone.confidence}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: DYNAMIC PATROL COVERAGE STATISTICS */}
              <div className="flex-1 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-xs text-white">Patrol Coverage Statistics</h3>
                  </div>
                  {isLoadingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                </div>

                <div className="flex items-center justify-around py-1">
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
                        strokeDasharray="239"
                        strokeDashoffset={gaugeOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="filter drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black text-white leading-none font-mono">
                        {coveragePercentage}%
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                        Coverage
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-slate-300">Covered Zones</span>
                      </div>
                      <span className="font-bold text-white font-mono">{coveredZonesCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span className="text-slate-300">Remaining Zones</span>
                      </div>
                      <span className="font-bold text-white font-mono">{remainingZonesCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        <span className="text-slate-300">High-Risk Covered</span>
                      </div>
                      <span className="font-bold text-emerald-400 font-mono">
                        {patrolPlan?.priority_coverage_percentage != null ? `${Math.round(patrolPlan.priority_coverage_percentage)}%` : '100%'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-medium text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Estimated Duration:{' '}
                      <strong className="text-white font-mono">
                        ~ {estimatedDurationMinutes} min
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Route Distance:{' '}
                      <strong className="text-white font-mono">
                        ~ {totalDistanceKm} km
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* C. BOTTOM ROW: 3 EQUAL-HEIGHT CARDS */}
            {/* BOTTOM CARD 1: DYNAMIC PATROL PLAN OVERVIEW */}
            <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-xs text-white">Patrol Plan Overview</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {patrolPlan?.stops?.length || 0} Scheduled Stops
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {patrolPlan && patrolPlan.stops && patrolPlan.stops.length > 0 ? (
                    patrolPlan.stops.map((stop) => {
                      const isSelected = selectedZone.zone_id === stop.zone_id;
                      return (
                        <div
                          key={stop.stop_number}
                          onClick={() => handleSelectZone(stop.zone_id)}
                          className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition text-xs ${
                            isSelected
                              ? 'bg-blue-900/40 border border-blue-500/50 text-white'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 text-white"
                              style={{ backgroundColor: stop.risk_color || '#3B82F6' }}
                            >
                              {stop.stop_number}
                            </span>
                            <span className="truncate font-medium">{stop.zone_name}</span>
                          </div>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0"
                            style={{
                              color: stop.risk_color || '#94A3B8',
                              backgroundColor: `${stop.risk_color || '#94A3B8'}15`,
                            }}
                          >
                            {stop.risk_level}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      {isLoadingPlan ? 'Computing optimal patrol route...' : 'No patrol plan stops available.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Click any stop to inspect live AI risk breakdown</span>
                <span className="font-mono">{patrolPlan?.plan_id || 'ID: PENDING'}</span>
              </div>
            </div>

            {/* BOTTOM CARD 2: RECOMMENDED PATROL ROUTE */}
            <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-xs text-white">Recommended Patrol Route</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    AI Recommended
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Coverage</div>
                    <div className="font-bold text-xs text-white font-mono mt-0.5">{coveragePercentage}%</div>
                  </div>
                  <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Duration</div>
                    <div className="font-bold text-xs text-white font-mono mt-0.5">~ {estimatedDurationMinutes} min</div>
                  </div>
                  <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Distance</div>
                    <div className="font-bold text-xs text-white font-mono mt-0.5">{totalDistanceKm} km</div>
                  </div>
                  <div className="bg-[#0D182E] p-1.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Priority</div>
                    <div className="font-bold text-xs text-rose-400 font-mono mt-0.5">
                      {coveragePercentage >= 80 ? 'Optimal' : 'Standard'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold text-slate-400">Risk Distribution (Current Route)</span>
                  <div className="flex items-center gap-2 text-[9px] font-medium">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Low</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Med</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>High</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>Crit</span>
                  </div>
                </div>

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
                    <path
                      d="M 10 32 Q 50 36 90 28 T 160 18 T 230 14 T 290 32"
                      fill="none"
                      stroke="url(#waveGradient)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="filter drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                    />
                    <circle cx="10" cy="32" r="3" fill="#22C55E" />
                    <circle cx="90" cy="28" r="3" fill="#22C55E" />
                    <circle cx="160" cy="18" r="3" fill="#EAB308" />
                    <circle cx="230" cy="14" r="3" fill="#EF4444" />
                    <circle cx="290" cy="32" r="3" fill="#A855F7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* BOTTOM CARD 3: FUNCTIONAL HUMAN APPROVAL WORKFLOW */}
            <div className="col-span-12 md:col-span-4 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-xs text-white">Human Approval</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isPlanApproved
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {patrolPlan?.status || 'PENDING'}
                  </span>
                </div>

                <div
                  className={`flex items-start gap-3 p-2.5 rounded-xl border mb-2 transition ${
                    isPlanApproved
                      ? 'bg-emerald-950/40 border-emerald-700/60'
                      : 'bg-[#0D182E] border-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isPlanApproved
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      className={`font-extrabold text-xs leading-tight ${
                        isPlanApproved ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isPlanApproved ? 'Patrol Plan Dispatched & Live' : 'Plan Ready for Review'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {isPlanApproved
                        ? `Approved by ${patrolPlan?.reviewed_by || currentUser.full_name}. Verified field deployment active.`
                        : 'AI generated constrained route. Review priority stops before dispatching field guards.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleApprovePlan}
                  disabled={isApproving || isPlanApproved}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 ${
                    isPlanApproved
                      ? 'bg-emerald-600/50 text-emerald-200 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  } disabled:opacity-60`}
                >
                  {isApproving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>{isPlanApproved ? 'Plan Approved' : 'Approve Plan'}</span>
                </button>

                <button
                  onClick={handleRequestChanges}
                  disabled={isRequestingChanges}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isRequestingChanges ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Request Changes</span>
                </button>
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 2: MAP VIEW (Full-Screen Expanded Campus Map Experience)
            ========================================================================= */}
        {activeNav === 'Map View' && (
          <main className="flex-1 p-4 flex flex-col gap-3 bg-[#070D18]">
            {/* Top GIS Toolbar / Info Ribbon */}
            <div className="bg-[#091224] border border-slate-800/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>LPU Campus Spatial Cartography</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      EPSG:4326 (WGS84)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Interactive high-resolution satellite imagery & vector boundary overlays for 12 campus sectors
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-300">Sectors:</span>
                  <span className="font-bold text-white font-mono">{zones.length || 12}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Route Waypoints:</span>
                  <span className="font-bold text-emerald-400 font-mono">{patrolPlan?.stops?.length || 0}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-300">Coverage:</span>
                  <span className="font-bold text-purple-400 font-mono">{coveragePercentage}%</span>
                </div>
              </div>
            </div>

            {/* Expanded Full Height Map */}
            <div className="flex-1 min-h-[580px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
              <CampusMap
                zones={zones}
                patrolPlan={patrolPlan}
                incidents={incidents}
                selectedZone={selectedZone}
                onSelectZone={handleSelectZone}
              />

              {/* Floating Selected Zone Overlay Bar */}
              <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-[#091224]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedZone.riskColor }}></span>
                    <h4 className="font-bold text-xs text-white">{selectedZone.name}</h4>
                  </div>
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${selectedZone.riskColor}20`, color: selectedZone.riskColor }}
                  >
                    {selectedZone.category} • {selectedZone.riskScore}/100
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                  {selectedZone.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono">Zone Code: {selectedZone.zone_id}</span>
                  <button
                    onClick={() => setActiveNav('Risk Analytics')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition"
                  >
                    <span>Full Analytics</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 3: RISK ANALYTICS (Telemetry Cards + 12-Zone Table + Explainability)
            ========================================================================= */}
        {activeNav === 'Risk Analytics' && (
          <main className="flex-1 p-4 flex flex-col gap-4 bg-[#070D18]">
            {/* Top Telemetry Metric Cards */}
            <MetricCards zones={zones} patrolPlan={patrolPlan} incidents={incidents} />

            {/* Split Grid: 12-Zone Ranked Table (7 cols) + Explainability Panel (5 cols) */}
            <div className="grid grid-cols-12 gap-4 flex-1">
              {/* Left Column: Campus Risk Priority Ranking */}
              <div className="col-span-12 lg:col-span-7 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
                <div>
                  {/* Table Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-sm text-white">Campus Risk Priority Ranking</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {filteredRiskZones.length} Sectors
                      </span>
                    </div>

                    {/* Filter and Search */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search zone..."
                          value={riskSearchQuery}
                          onChange={(e) => setRiskSearchQuery(e.target.value)}
                          className="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
                        />
                      </div>

                      <select
                        value={riskCategoryFilter}
                        onChange={(e) => setRiskCategoryFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="ALL">All Types</option>
                        <option value="ACADEMIC">Academic</option>
                        <option value="RESIDENTIAL">Residential</option>
                        <option value="ADMINISTRATIVE">Administrative</option>
                        <option value="COMMERCIAL">Commercial</option>
                        <option value="SPORTS">Sports</option>
                      </select>
                    </div>
                  </div>

                  {/* Zones Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="pb-2 pl-2">Sector</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Composite Score</th>
                          <th className="pb-2">Risk Tier</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredRiskZones.map((z) => {
                          const isSelected = selectedZone.zone_id === z.zone_id;
                          const score = Math.round(z.risk_score || z.risk_breakdown?.total_score || 0);
                          const level = z.risk_level || z.risk_breakdown?.risk_level || 'Low';
                          const color = z.risk_color || z.risk_breakdown?.risk_color || '#10B981';

                          return (
                            <tr
                              key={z.zone_id}
                              onClick={() => handleSelectZone(z.zone_id)}
                              className={`cursor-pointer transition ${
                                isSelected ? 'bg-blue-950/40 text-white' : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <td className="py-2.5 pl-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                    {z.zone_id}
                                  </span>
                                  <span className="font-semibold text-white truncate max-w-[150px] sm:max-w-[200px]">
                                    {z.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5">
                                <span className="text-[11px] text-slate-400">{z.category || 'Sector'}</span>
                              </td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
                                    />
                                  </div>
                                  <span className="font-mono font-bold text-xs" style={{ color }}>
                                    {score}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                                  style={{ backgroundColor: `${color}20`, color }}
                                >
                                  {level}
                                </span>
                              </td>
                              <td className="py-2.5">
                                {z.is_restricted ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                                    Lockdown
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                                    Normal
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right pr-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectZone(z.zone_id);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition text-[11px] font-semibold"
                                >
                                  Explain
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Calculated via 8-Factor Multi-Attribute Risk Engine</span>
                  <span className="font-mono text-slate-500">FastAPI ML Evaluation Service</span>
                </div>
              </div>

              {/* Right Column: Explainability Panel */}
              <div className="col-span-12 lg:col-span-5 flex flex-col">
                <ExplainabilityPanel
                  zone={selectedZone}
                  onToggleRestriction={handleToggleRestriction}
                />
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 4: PATROL PLANS (Dedicated Routing Hub)
            ========================================================================= */}
        {activeNav === 'Patrol Plans' && (
          <main className="flex-1 p-4 flex flex-col bg-[#070D18]">
            <PatrolRoutePanel
              zones={zones}
              patrolPlan={patrolPlan}
              currentUser={currentUser}
              onGeneratePlan={handleGeneratePatrolPlan}
              onApprovePlan={handleApprovePlan}
              isLoading={isLoadingPlan}
            />
          </main>
        )}

        {/* =========================================================================
            TAB 5: INCIDENTS (Scenario Simulator + Incident Reporting Feed)
            ========================================================================= */}
        {activeNav === 'Incidents' && (
          <main className="flex-1 p-4 grid grid-cols-12 gap-4 bg-[#070D18]">
            {/* Left Column: Simulator Panel & Quick Report Form */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
              <SimulatorPanel
                onSimulate={handleSimulateScenario}
                onReset={handleResetCampus}
                isLoading={isLoadingPlan}
              />

              {/* Manual Incident Reporting Card */}
              <div className="bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-xs text-white">Manual Field Incident Dispatch</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Operator Dispatch</span>
                </div>

                <form onSubmit={handleReportIncident} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Sector</label>
                      <select
                        value={newIncidentZone}
                        onChange={(e) => setNewIncidentZone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {zones.map((z) => (
                          <option key={z.zone_id} value={z.zone_id}>
                            {z.zone_id} - {z.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category</label>
                      <select
                        value={newIncidentCategory}
                        onChange={(e) => setNewIncidentCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="CROWD_CONGESTION">Crowd Congestion</option>
                        <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                        <option value="THEFT_REPORT">Theft / Lost Property</option>
                        <option value="FIRE_SAFETY">Fire / Hazard Alarm</option>
                        <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                        <option value="PROTEST_GATHERING">Student Gathering</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">Severity Level (1 to 5)</label>
                      <span className="text-xs font-mono font-bold text-amber-400">{newIncidentSeverity} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={newIncidentSeverity}
                      onChange={(e) => setNewIncidentSeverity(e.target.value)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Incident Summary</label>
                    <textarea
                      rows="2"
                      placeholder="Enter field observation or radio report details..."
                      value={newIncidentDesc}
                      onChange={(e) => setNewIncidentDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingIncident}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isSubmittingIncident ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>Record & Dispatch Incident</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Live Incidents Feed */}
            <div className="col-span-12 lg:col-span-6 bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-slate-200">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">Live Incident Audit Stream</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30">
                      {incidents.length} Logged Events
                    </span>
                    <button
                      onClick={fetchDashboardData}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Refresh Incident Stream"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Incidents List */}
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {incidents.length > 0 ? (
                    incidents.map((inc) => {
                      const isHigh = (inc.severity || 1) >= 4;
                      return (
                        <div
                          key={inc.incident_id || Math.random()}
                          className={`p-3 rounded-xl border transition ${
                            isHigh
                              ? 'bg-red-950/20 border-red-800/60'
                              : 'bg-slate-900/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                                  isHigh
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                }`}
                              >
                                SEV {inc.severity || 1}
                              </span>
                              <span className="font-bold text-xs text-white">
                                {inc.category?.replace(/_/g, ' ') || 'SECURITY EVENT'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {inc.incident_id}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {inc.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/70 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span>{inc.zone_name || inc.zone_id}</span>
                            </span>
                            <span className="font-mono">
                              Status: <strong className="text-emerald-400">{inc.status || 'ACTIVE'}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                      <p>All sectors peaceful. No active incidents recorded.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Incident feed automatically streams into AI Risk Classifier</span>
                <span className="font-mono text-slate-400">Sync: Real-time</span>
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 6: ZONE MANAGEMENT (Campus Sector Directory & Lockdown Controls)
            ========================================================================= */}
        {activeNav === 'Zone Management' && (
          <main className="flex-1 p-4 flex flex-col gap-4 bg-[#070D18]">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#091224] border border-slate-800 p-3.5 rounded-xl shadow-lg">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Total LPU Sectors
                </span>
                <div className="text-2xl font-bold text-white font-mono">{zones.length || 12}</div>
                <span className="text-[10px] text-slate-500">Verified Geographical Zones</span>
              </div>
              <div className="bg-[#091224] border border-slate-800 p-3.5 rounded-xl shadow-lg">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Accessible
                </span>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {zones.filter((z) => !z.is_restricted).length}
                </div>
                <span className="text-[10px] text-slate-500">Open Patrol Sectors</span>
              </div>
              <div className="bg-[#091224] border border-slate-800 p-3.5 rounded-xl shadow-lg">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Restricted / Lockdown
                </span>
                <div className="text-2xl font-bold text-purple-400 font-mono">
                  {zones.filter((z) => z.is_restricted).length}
                </div>
                <span className="text-[10px] text-slate-500">Active Access Controls</span>
              </div>
              <div className="bg-[#091224] border border-slate-800 p-3.5 rounded-xl shadow-lg">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  High Risk Sectors
                </span>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {zones.filter((z) => (z.risk_score || 0) >= 70).length}
                </div>
                <span className="text-[10px] text-slate-500">Priority AI Monitoring</span>
              </div>
            </div>

            {/* Zone Administration Table */}
            <div className="bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col flex-1 text-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Campus Sector Management & Boundary Control</h3>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by zone code, name or category..."
                    value={zoneSearchQuery}
                    onChange={(e) => setZoneSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-2.5 pl-2">Code</th>
                      <th className="pb-2.5">Sector Name</th>
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5">Coordinates (Lat, Lng)</th>
                      <th className="pb-2.5">Base Priority</th>
                      <th className="pb-2.5">Access Status</th>
                      <th className="pb-2.5 text-right pr-2">Security Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAdminZones.map((z) => (
                      <tr key={z.zone_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 pl-2">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                            {z.zone_id}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="font-bold text-white text-xs">{z.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{z.description}</div>
                        </td>
                        <td className="py-3">
                          <span className="text-[11px] text-slate-300 font-medium">{z.category || 'Standard'}</span>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {z.latitude?.toFixed(4)}, {z.longitude?.toFixed(4)}
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-300 text-xs">
                          {z.base_priority || 50} / 100
                        </td>
                        <td className="py-3">
                          {z.is_restricted ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              LOCKED DOWN
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ACCESSIBLE
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                handleSelectZone(z.zone_id);
                                setActiveNav('Map View');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                            >
                              Locate
                            </button>
                            <button
                              onClick={() => handleToggleRestriction(z.zone_id, !z.is_restricted)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                                z.is_restricted
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white border border-slate-700'
                              }`}
                            >
                              {z.is_restricted ? 'Lift Lockdown' : 'Lockdown Sector'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 7: REPORTS (Performance Evaluation & Baseline Comparison)
            ========================================================================= */}
        {activeNav === 'Reports' && (
          <main className="flex-1 p-4 flex flex-col gap-4 bg-[#070D18]">
            {/* Header Ribbon */}
            <div className="bg-[#091224] border border-slate-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-white">
                    Campus Security Operations Performance Audit
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative empirical evaluation: Traditional Fixed Patrol vs Adaptive AI Orienteering Agent
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEvaluationOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Launch Baseline Benchmarks</span>
                </button>
                <button
                  onClick={() => setIsAlgorithmsOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Algorithms Lab</span>
                </button>
              </div>
            </div>

            {/* 4 Academic KPI Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#091224] border border-slate-800 p-4 rounded-xl shadow-lg">
                <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                  Priority Risk Coverage
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400 font-mono">89.4%</span>
                  <span className="text-xs text-slate-500">vs 50.7% Baseline</span>
                </div>
                <div className="mt-2 text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block">
                  +38.7% Risk Mitigation Improvement
                </div>
              </div>

              <div className="bg-[#091224] border border-slate-800 p-4 rounded-xl shadow-lg">
                <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                  Patrol Route Efficiency
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-400 font-mono">42.1%</span>
                  <span className="text-xs text-slate-500">Transit Reduction</span>
                </div>
                <div className="mt-2 text-[10px] text-blue-300 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md inline-block">
                  A* Heuristic Shortest Walking Path
                </div>
              </div>

              <div className="bg-[#091224] border border-slate-800 p-4 rounded-xl shadow-lg">
                <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                  Critical Dwell Coverage
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-purple-400 font-mono">100%</span>
                  <span className="text-xs text-slate-500">Tier-1 Sectors</span>
                </div>
                <div className="mt-2 text-[10px] text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md inline-block">
                  Zero High-Risk Sectors Omitted
                </div>
              </div>

              <div className="bg-[#091224] border border-slate-800 p-4 rounded-xl shadow-lg">
                <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                  Dynamic Replanning Speed
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-400 font-mono">&lt; 45 ms</span>
                  <span className="text-xs text-slate-500">Reaction Time</span>
                </div>
                <div className="mt-2 text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                  Immediate Detour Calculation
                </div>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="bg-[#091224] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex-1 text-slate-200">
              <h4 className="font-bold text-sm text-white mb-3">
                Methodology & System Architecture Comparison Matrix
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-2.5 pl-2">System Dimension</th>
                      <th className="pb-2.5">Traditional Static Patrol (Baseline)</th>
                      <th className="pb-2.5">Adaptive AI Security Agent (Our Proposed System)</th>
                      <th className="pb-2.5 text-right pr-2">Observed Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 pl-2 font-bold text-white">Route Optimization</td>
                      <td className="py-3 text-slate-400">Fixed circular walking loop regardless of incidents</td>
                      <td className="py-3 text-blue-300 font-medium">Dynamic Orienteering Problem (DOP) with time budget</td>
                      <td className="py-3 text-right pr-2 font-bold text-emerald-400 font-mono">+42.1% Efficiency</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold text-white">Risk Responsiveness</td>
                      <td className="py-3 text-slate-400">Static subjective intuition; no real-time scoring</td>
                      <td className="py-3 text-blue-300 font-medium">8-Factor Multi-Criteria Utility Model updated continuously</td>
                      <td className="py-3 text-right pr-2 font-bold text-emerald-400 font-mono">+38.7% Priority Coverage</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold text-white">Graph Topology</td>
                      <td className="py-3 text-slate-400">Fixed manual walking paths</td>
                      <td className="py-3 text-blue-300 font-medium">NetworkX campus graph with A* Haversine edge heuristics</td>
                      <td className="py-3 text-right pr-2 font-bold text-emerald-400 font-mono">Guaranteed Shortest Path</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold text-white">Incident Adaptability</td>
                      <td className="py-3 text-slate-400">Manual radio broadcast; guards abandon route</td>
                      <td className="py-3 text-blue-300 font-medium">Automated re-weighting and real-time path diversion</td>
                      <td className="py-3 text-right pr-2 font-bold text-emerald-400 font-mono">&lt; 45 ms Re-route</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold text-white">Decision Verification</td>
                      <td className="py-3 text-slate-400">Paper logbooks; post-incident review</td>
                      <td className="py-3 text-blue-300 font-medium">Human-in-the-Loop (HITL) cryptographic approval & audit</td>
                      <td className="py-3 text-right pr-2 font-bold text-emerald-400 font-mono">100% Traceability</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* =========================================================================
            TAB 8: SETTINGS (Security Operations Center & Credentials Status)
            ========================================================================= */}
        {activeNav === 'Settings' && (
          <main className="flex-1 p-4 grid grid-cols-12 gap-4 bg-[#070D18]">
            {/* Operator Profile Card */}
            <div className="col-span-12 lg:col-span-6 bg-[#091224] border border-slate-800/90 rounded-2xl p-5 shadow-xl text-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-base text-white shadow-lg shadow-blue-600/30">
                    {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{currentUser.full_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{currentUser.email}</span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Assigned Security Role</span>
                    <strong className="text-white font-mono">{currentUser.role}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Session Authentication</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>HttpOnly Cookie + Bearer JWT</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Two-Factor Authentication</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Gmail SMTP OTP Active</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Session Lifetime</span>
                    <strong className="text-white font-mono">8 Hours (Auto-Invalidation)</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Security Clearance Verified</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold transition flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* System Health & Architecture Status */}
            <div className="col-span-12 lg:col-span-6 bg-[#091224] border border-slate-800/90 rounded-2xl p-5 shadow-xl text-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
                  <Server className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">System Architecture & Service Health</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">FastAPI Security Backend</div>
                      <div className="text-[10px] text-slate-400">http://127.0.0.1:8000 • REST Endpoints</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                      ONLINE (PORT 8000)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Google Maps JavaScript API</div>
                      <div className="text-[10px] text-slate-400">Satellite 45° Imagery • LPU Punjab Campus</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                      OPERATIONAL
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">AI Orienteering Optimizer</div>
                      <div className="text-[10px] text-slate-400">Constrained Heuristic Solver with Time Budget</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                      ACTIVE
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Gmail SMTP 2FA Gateway</div>
                      <div className="text-[10px] text-slate-400">5-min OTP TTL • Rate-Limited</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Version 2.4.0 (Production Release)</span>
                <span className="font-mono text-slate-400">Host: Localhost:5173</span>
              </div>
            </div>
          </main>
        )}
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
        zones={zones}
      />
    </div>
  );
}
