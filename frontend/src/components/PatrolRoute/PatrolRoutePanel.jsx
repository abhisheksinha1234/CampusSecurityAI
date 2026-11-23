import React, { useState } from 'react';
import {
  Navigation,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  MapPin,
  Car,
  DoorOpen,
  Users,
} from 'lucide-react';

export const PatrolRoutePanel = ({
  zones = [],
  patrolPlan = null,
  currentUser = null,
  onGeneratePlan,
  onApprovePlan,
  isLoading = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // 'timeline' or 'optimizer'
  const [startZone, setStartZone] = useState('Z12');
  const [endZone, setEndZone] = useState('Z12');
  const [timeBudget, setTimeBudget] = useState(45);
  const [reviewerName, setReviewerName] = useState(
    currentUser?.full_name || 'Chief Security Officer'
  );

  // Recon notes checklist state (matching the reference image)
  const [reconChecks, setReconChecks] = useState({
    mainEntrance: true,
    stagingLotB: true,
    responseLane: true,
    pedestrianFlow: true,
  });

  const toggleCheck = (key) => {
    setReconChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleGenerate = (e) => {
    e.preventDefault();
    if (onGeneratePlan) {
      onGeneratePlan({
        startZoneId: startZone,
        endZoneId: endZone,
        timeBudgetMinutes: timeBudget,
      });
    }
  };

  const handleAction = (action) => {
    if (!patrolPlan?.plan_id) return;
    if (onApprovePlan) {
      onApprovePlan(patrolPlan.plan_id, reviewerName, action);
    }
  };

  // Generate dynamic arrival plan timeline items based on verified active patrol plan stops
  const hasActiveStops = Boolean(patrolPlan?.stops && patrolPlan.stops.length > 0);
  const timelineStops = hasActiveStops
    ? patrolPlan.stops.slice(0, 6).map((stop, i) => {
        const baseMin = 30 + i * 8;
        const hr = Math.floor(baseMin / 60) + 8;
        const min = baseMin % 60;
        const timeStr = `0${hr}`.slice(-2) + ':' + `0${min}`.slice(-2);
        return {
          time: timeStr,
          title: stop.zone_name.split('(')[0].split('-')[0].trim(),
          subtitle: stop.reason_for_visit || `Priority ${stop.risk_level} stop`,
          icon: i === 0 ? 'dep' : i === 1 ? 'window' : i === 2 ? 'gate' : i === 3 ? 'site' : 'venue',
        };
      })
    : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full text-slate-200">
      {/* Header with Sub-tab Switcher matching Protective Operations Planner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-600/20 text-cyan-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Operations Schedule</h3>
            <p className="text-[10px] text-slate-400">Protective Security & Patrol Plan</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              activeSubTab === 'timeline'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Arrival plan
          </button>
          <button
            onClick={() => setActiveSubTab('optimizer')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              activeSubTab === 'optimizer'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Optimizer
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ARRIVAL PLAN TIMELINE (Exact match of Right Sidebar in Image)
          ========================================================================= */}
      {activeSubTab === 'timeline' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* 1. Arrival Plan Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Arrival plan</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                hasActiveStops
                  ? 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60'
                  : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
              }`}>
                {patrolPlan?.status || 'NO ACTIVE PLAN'}
              </span>
            </div>

            {hasActiveStops ? (
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                {timelineStops.map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 text-xs">
                    {/* Timeline Dot */}
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-900 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>

                    <span className="font-mono text-slate-400 font-bold shrink-0 text-[11px] pt-0.5">
                      {item.time}
                    </span>

                    <div className="flex-1 min-w-0 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                      <div className="font-bold text-white text-xs truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 px-3 text-center rounded-xl bg-slate-800/30 border border-slate-800 text-slate-400 my-2">
                <Navigation className="w-7 h-7 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">No Active Patrol Plan Deployed</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Switch to the 'AI Optimizer' tab to configure constraints and dispatch patrol officers.
                </p>
              </div>
            )}
          </div>

          {/* 2. Gate Assignments (from reference image) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Gate assignments</span>
            </div>

            <div className="space-y-1.5 text-xs bg-slate-800/30 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Gate 1</span>
                <span className="text-cyan-400 font-medium text-[11px]">VIP / Executive Access</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/60 pt-1">
                <span className="font-semibold text-slate-300">Gate 3</span>
                <span className="text-slate-400 font-medium text-[11px]">Vendors / Load-in</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/60 pt-1">
                <span className="font-semibold text-slate-300">Gate 4</span>
                <span className="text-slate-400 font-medium text-[11px]">Staff / Media Entry</span>
              </div>
            </div>
          </div>

          {/* 3. Recon Notes Checklist (from reference image) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recon notes</span>
            </div>

            <div className="space-y-2 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div
                className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                onClick={() => toggleCheck('mainEntrance')}
              >
                {reconChecks.mainEntrance ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={reconChecks.mainEntrance ? 'text-slate-200' : 'text-slate-400 line-through'}>
                  Clear approach at Main Entrance
                </span>
              </div>

              <div
                className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                onClick={() => toggleCheck('stagingLotB')}
              >
                {reconChecks.stagingLotB ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={reconChecks.stagingLotB ? 'text-slate-200' : 'text-slate-400 line-through'}>
                  Staging area ready in Lot B
                </span>
              </div>

              <div
                className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                onClick={() => toggleCheck('responseLane')}
              >
                {reconChecks.responseLane ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={reconChecks.responseLane ? 'text-slate-200' : 'text-slate-400 line-through'}>
                  Response lane unobstructed
                </span>
              </div>

              <div
                className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                onClick={() => toggleCheck('pedestrianFlow')}
              >
                {reconChecks.pedestrianFlow ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={reconChecks.pedestrianFlow ? 'text-slate-200' : 'text-slate-400 line-through'}>
                  Pedestrian flow normal
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI OPTIMIZER & DISPATCH APPROVAL
          ========================================================================= */}
      {activeSubTab === 'optimizer' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Configuration Form */}
          <form onSubmit={handleGenerate} className="space-y-2.5 mb-3 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Start Hub</label>
                <select
                  value={startZone}
                  onChange={(e) => setStartZone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_id} - {z.name.slice(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Return Hub</label>
                <select
                  value={endZone}
                  onChange={(e) => setEndZone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_id} - {z.name.slice(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Shift Budget</span>
                <span className="font-mono font-bold text-cyan-400">{timeBudget} Mins</span>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={timeBudget}
                onChange={(e) => setTimeBudget(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-cyan-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Computing AI Route...' : 'Generate AI Patrol Plan'}</span>
            </button>
          </form>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
            {patrolPlan?.stops && patrolPlan.stops.length > 0 ? (
              patrolPlan.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition flex items-start gap-2"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-900"
                    style={{ backgroundColor: stop.risk_color || '#38BDF8' }}
                  >
                    {stop.stop_number}
                  </div>

                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-semibold text-white truncate">{stop.zone_name}</h4>
                      <span
                        className="text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0"
                        style={{
                          color: stop.risk_color || '#10B981',
                          backgroundColor: `${stop.risk_color || '#10B981'}20`,
                        }}
                      >
                        Risk {stop.risk_score?.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>+{stop.segment_distance_meters}m</span>
                      <span>+{stop.segment_time_minutes}m walk</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active patrol plan. Click Generate above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Review & Approval Footer */}
      <div className="border-t border-slate-800 pt-2.5 mt-auto space-y-2 shrink-0">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Reviewer Name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={patrolPlan?.status === 'APPROVED'}
                className="py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Route</span>
              </button>
              <button
                onClick={() => handleAction('REJECT')}
                className="py-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject / Halt</span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] text-slate-400">
            <span>Route approval requires Chief Security Officer (Admin) role.</span>
          </div>
        )}
      </div>
    </div>
  );
};
