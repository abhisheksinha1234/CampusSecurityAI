import React, { useState } from 'react';
import { MapPin, X, PlusCircle } from 'lucide-react';

export const AddZoneModal = ({ isOpen, onClose, coordinates, onAddZone }) => {
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Academic');
  const [basePriority, setBasePriority] = useState(5);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!zoneId.trim() || !name.trim()) {
      setError('Please provide both Zone ID and Name.');
      return;
    }

    onAddZone({
      zone_id: zoneId.toUpperCase().trim(),
      name: name.trim(),
      category,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      base_priority: parseInt(basePriority, 10),
      last_patrol_hours_ago: 1.0,
      is_restricted: false,
      restriction_reason: null,
      is_accessible: true,
      data_completeness: 1.0,
      description: description.trim(),
      historical_incidents_count: 0,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Add Campus Zone</h3>
            <p className="text-xs text-slate-400">Pin a new security zone on Lovely Professional University map</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-900/30 border border-red-700/50 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Zone ID</label>
              <input
                type="text"
                placeholder="e.g. Z13"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Academic">Academic</option>
                <option value="Hostel">Hostel</option>
                <option value="Commercial">Commercial</option>
                <option value="Entrance">Entrance</option>
                <option value="Transit">Transit</option>
                <option value="Medical">Medical</option>
                <option value="Sports">Sports</option>
                <option value="Library">Library</option>
                <option value="Assembly">Assembly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Zone Name</label>
            <input
              type="text"
              placeholder="e.g. Innovation Centre & Robotics Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block">Latitude</span>
              <span className="font-mono font-medium text-slate-200">{coordinates?.lat?.toFixed(6)}</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block">Longitude</span>
              <span className="font-mono font-medium text-slate-200">{coordinates?.lng?.toFixed(6)}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Base Surveillance Priority (1-10)</label>
              <span className="text-xs font-mono font-bold text-blue-400">{basePriority}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={basePriority}
              onChange={(e) => setBasePriority(e.target.value)}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Description</label>
            <textarea
              placeholder="Campus infrastructure details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 h-16 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition"
            >
              Save Campus Zone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
