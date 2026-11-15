import React from 'react';
import { Info, ShieldAlert, Award, FileText, CheckCircle, AlertOctagon } from 'lucide-react';

export const ExplainabilityPanel = ({ zone = null, onToggleRestriction }) => {
  if (!zone) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center text-slate-500 h-full flex flex-col items-center justify-center">
        <Info className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="font-semibold text-sm text-slate-400">No Zone Selected</h4>
        <p className="text-xs max-w-xs mt-1">
          Click any campus zone marker on the Google Map to inspect its 8-factor risk breakdown and AI reasoning.
        </p>
      </div>
    );
  }

  const breakdown = zone.risk_breakdown || {};
  const factors = breakdown.factors || {};
  const riskScore = zone.risk_score || breakdown.total_score || 0;
  const riskLevel = zone.risk_level || breakdown.risk_level || 'Low';
  const riskColor = zone.risk_color || breakdown.risk_color || '#10B981';
  const confidence = breakdown.confidence ?? zone.data_completeness ?? 1.0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {zone.zone_id}
            </span>
            <span className="text-xs text-slate-400">{zone.category}</span>
          </div>
          <h3 className="font-bold text-base text-white mt-1 leading-snug">{zone.name}</h3>
        </div>

        <div className="text-right">
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: riskColor }}
          >
            {riskScore.toFixed(0)}
          </div>
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
            style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
          >
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        {zone.description || 'Verified Lovely Professional University geographical zone.'}
      </p>

      {/* AI Explainability Narrative */}
      <div className="mb-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <span>Explainable AI Risk Reasoning</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          {breakdown.justification || 'Standard surveillance baseline. No acute anomalous triggers observed.'}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px] text-slate-400 font-mono">
          <span>Data Completeness: {(confidence * 100).toFixed(0)}%</span>
          <span>Last Patrol: {zone.last_patrol_hours_ago?.toFixed(1) || 0} hrs ago</span>
        </div>
      </div>

      {/* 8-Factor Contribution Breakdown */}
      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Multi-Factor Risk Breakdown
        </h4>

        {Object.entries(factors).map(([factorKey, factorVal]) => {
          const factorLabel = factorKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={factorKey} className="text-xs">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-slate-400 text-[11px]">{factorLabel}</span>
                <span className="font-mono text-slate-300 text-[11px] font-medium">{factorVal.toFixed(0)} / 100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, factorVal)}%`,
                    backgroundColor: factorVal > 70 ? '#EF4444' : factorVal > 40 ? '#F59E0B' : '#3B82F6',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Button */}
      <div className="mt-auto pt-2 border-t border-slate-800">
        <button
          onClick={() => onToggleRestriction && onToggleRestriction(zone.zone_id, !zone.is_restricted)}
          className={`w-full py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            zone.is_restricted
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{zone.is_restricted ? 'Lift Zone Restriction' : 'Restrict / Lockdown Zone'}</span>
        </button>
      </div>
    </div>
  );
};
