import React, { useState } from 'react';
import { X, Play, GitBranch, Compass, Search } from 'lucide-react';
import { apiService } from '../../services/apiService';

export const AlgorithmsModal = ({ isOpen, onClose, zones = [] }) => {
  const [startZone, setStartZone] = useState('Z01');
  const [targetZone, setTargetZone] = useState('Z08');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('astar');

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await apiService.runAlgorithmDemo(startZone, targetZone);
      setResults(res);
    } catch (err) {
      console.error('Failed to run algorithm demo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">Graph Search Algorithm Demonstrator</h3>
            <p className="text-xs text-slate-400">BFS, DFS, Dijkstra, and A* Search on Lovely Professional University Graph</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Source Zone</label>
            <select
              value={startZone}
              onChange={(e) => setStartZone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_id} - {z.name.slice(0, 24)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Zone</label>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_id} - {z.name.slice(0, 24)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Running...' : 'Execute Algorithms'}</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4">
            {/* Algorithm Switcher Tabs */}
            <div className="flex border-b border-slate-800 text-xs">
              {[
                { id: 'astar', label: 'A* Search (Haversine)' },
                { id: 'dijkstra', label: "Dijkstra's Algorithm" },
                { id: 'bfs', label: 'Breadth-First Search (BFS)' },
                { id: 'dfs', label: 'Depth-First Search (DFS)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Algorithm Display */}
            {(() => {
              const current = results.results[activeTab];
              if (!current) return null;

              return (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Search Steps</span>
                      <span className="text-xl font-bold font-mono text-white">{current.steps}</span>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Nodes Expanded</span>
                      <span className="text-xl font-bold font-mono text-indigo-400">
                        {current.nodes_expanded ?? current.total_nodes_visited}
                      </span>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Distance (Meters)</span>
                      <span className="text-xl font-bold font-mono text-sky-400">
                        {current.total_distance_meters != null ? `${current.total_distance_meters}m` : 'Hop-based'}
                      </span>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Est. Foot Time</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {current.estimated_duration_minutes != null ? `${current.estimated_duration_minutes}m` : 'Unweighted'}
                      </span>
                    </div>
                  </div>

                  {/* Reconstructed Path */}
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Optimal Reconstructed Path</h4>
                    <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                      {current.path?.map((nodeId, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2 py-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 font-semibold">
                            {nodeId}
                          </span>
                          {idx < current.path.length - 1 && (
                            <span className="text-slate-500 font-bold">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Traversal Order */}
                  {current.visited_order && (
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-semibold text-slate-400 mb-2">Expansion Order Trace</h4>
                      <div className="flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                        {current.visited_order.join(' → ')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Academic Analysis */}
            <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs space-y-1.5">
              <h4 className="font-semibold text-indigo-300">Algorithmic Theory for Viva & Examination</h4>
              <p className="text-slate-300 text-[11px]">
                {results.academic_analysis?.unweighted_vs_weighted}
              </p>
              <p className="text-slate-300 text-[11px]">
                {results.academic_analysis?.informed_vs_uninformed}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            Select source and target campus zones and click "Execute Algorithms" to compare execution profiles.
          </div>
        )}
      </div>
    </div>
  );
};
