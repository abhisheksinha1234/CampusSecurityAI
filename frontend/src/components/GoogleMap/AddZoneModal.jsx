import React, { useState, useEffect } from 'react';
import { MapPin, X, PlusCircle, Loader2 } from 'lucide-react';

export const AddZoneModal = ({ isOpen, onClose, coordinates, onAddZone }) => {
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Academic');
  const [lat, setLat] = useState(coordinates?.lat ?? 31.2530);
  const [lng, setLng] = useState(coordinates?.lng ?? 75.7037);
  const [basePriority, setBasePriority] = useState(5);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng) {
      setLat(coordinates.lat);
      setLng(coordinates.lng);
    }
  }, [coordinates]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanId = zoneId.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanId || !cleanName) {
      setError('Please provide both Zone Code (e.g. Z13) and Sector Name.');
      return;
    }

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) {
      setError('Please provide valid numerical coordinates.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddZone) {
        await onAddZone({
          zone_id: cleanId,
          name: cleanName,
          category,
          latitude: numLat,
          longitude: numLng,
          base_priority: parseInt(basePriority, 10),
          last_patrol_hours_ago: 1.0,
          is_restricted: false,
          restriction_reason: null,
          is_accessible: true,
          data_completeness: 1.0,
          description: description.trim() || `Newly registered ${cleanName} campus zone.`,
          historical_incidents_count: 0,
        });
      }
      setZoneId('');
      setName('');
      setDescription('');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add campus zone.');
    } finally {
      setIsSubmitting(false);
    }
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
            <p className="text-xs text-slate-400">Register a new security sector on LPU Punjab campus</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-900/30 border border-red-700/50 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Zone Code</label>
              <input
                type="text"
                placeholder="e.g. Z13"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
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
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Sector Name</label>
            <input
              type="text"
              placeholder="e.g. Innovation Centre & Robotics Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Base Priority Ranking (1-10)</label>
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
              placeholder="Campus infrastructure details, entry points, key facilities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 h-14 resize-none text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>Register Zone</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
