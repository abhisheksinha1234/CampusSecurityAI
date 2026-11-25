/**
 * Central API Service for LPU Campus Security AI.
 * Communicates with FastAPI backend on http://127.0.0.1:8000
 * Handles Authentication, Session Tokens, and HttpOnly Cookies.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://campus-security-ai-backend.onrender.com';

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('lpu_security_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const apiService = {
  // Authentication
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('lpu_security_token', data.token);
    }
    return data;
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Backend logout notification failed:', e);
    } finally {
      localStorage.removeItem('lpu_security_user');
      localStorage.removeItem('lpu_security_token');
    }
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Session invalid');
    return res.json();
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    if (!res.ok) throw new Error('Failed to fetch demo accounts');
    return res.json();
  },

  async sendOtp(email, role = 'ADMIN', username = 'admin') {
    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, role, username }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to dispatch OTP email');
    }
    return res.json();
  },

  async verifyOtp(email, otp, role = 'ADMIN', username = 'admin') {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp, role, username }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'OTP verification failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('lpu_security_token', data.token);
    }
    return data;
  },

  // Campus & Zones
  async getZones() {
    const res = await fetch(`${API_BASE}/campus/zones?include_risk=true`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (!res.ok) throw new Error('Failed to fetch campus zones');
    return res.json();
  },

  async getZoneDetails(zoneId) {
    const res = await fetch(`${API_BASE}/campus/zones/${zoneId}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch zone ${zoneId}`);
    return res.json();
  },

  async addZone(zoneData) {
    const res = await fetch(`${API_BASE}/campus/zones`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(zoneData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to add zone');
    }
    return res.json();
  },

  async getCampusGraph() {
    const res = await fetch(`${API_BASE}/campus/graph`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch campus graph');
    return res.json();
  },

  async getEdges() {
    const res = await fetch(`${API_BASE}/campus/edges`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (!res.ok) throw new Error('Failed to fetch campus walkways');
    return res.json();
  },

  async toggleEdgeStatus(edgeId, isOpen, reason) {
    const params = new URLSearchParams({ is_open: isOpen });
    if (reason) params.append('restriction_reason', reason);
    const res = await fetch(`${API_BASE}/campus/edges/${edgeId}/status?${params}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to toggle walkway status');
    return res.json();
  },

  async toggleZoneRestriction(zoneId, isRestricted, reason = '') {
    const params = new URLSearchParams({ is_restricted: isRestricted });
    if (reason) params.append('reason', reason);
    const res = await fetch(`${API_BASE}/campus/zones/${zoneId}/restriction?${params}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to toggle zone restriction');
    }
    return res.json();
  },

  // Risk Engine
  async getRiskScores() {
    const res = await fetch(`${API_BASE}/risk/scores`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch risk scores');
    return res.json();
  },

  async explainZoneRisk(zoneId) {
    const res = await fetch(`${API_BASE}/risk/zones/${zoneId}/explain`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to explain zone ${zoneId}`);
    return res.json();
  },

  async getIncidents() {
    const res = await fetch(`${API_BASE}/risk/incidents`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async createIncident(incidentData) {
    const res = await fetch(`${API_BASE}/risk/incidents`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(incidentData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to report incident');
    }
    return res.json();
  },

  async updateIncidentStatus(incidentId, status, resolutionNotes = '') {
    const res = await fetch(`${API_BASE}/risk/incidents/${encodeURIComponent(incidentId)}/status`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        status,
        resolution_notes: resolutionNotes,
      }),
    });
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update incident status to ${status}`);
    }
    return res.json();
  },

  // Patrol Agent Planning
  async generatePatrolPlan({ startZoneId = 'Z12', endZoneId = 'Z12', timeBudgetMinutes = 45, dwellMinutes = 2 } = {}) {
    const params = new URLSearchParams({
      start_zone_id: startZoneId,
      end_zone_id: endZoneId,
      time_budget_minutes: timeBudgetMinutes,
      dwell_time_minutes: dwellMinutes,
    });
    const res = await fetch(`${API_BASE}/patrol/plan?${params}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to generate patrol plan');
    return res.json();
  },

  async getCurrentPlan() {
    try {
      const res = await fetch(`${API_BASE}/patrol/current`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status === 401) {
        throw new Error('AUTH_EXPIRED');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch active patrol plan');
      }
      return await res.json();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') throw err;
      console.warn('getCurrentPlan warning:', err.message);
      return null;
    }
  },

  async approvePlan(planId, reviewerName, action, comments = '') {
    const res = await fetch(`${API_BASE}/patrol/approve`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        plan_id: planId,
        reviewer_name: reviewerName,
        action,
        comments,
      }),
    });
    if (!res.ok) throw new Error('Failed to update plan approval status');
    return res.json();
  },

  // Scenario Simulator
  async simulateScenario(payload) {
    const res = await fetch(`${API_BASE}/scenarios/simulate`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to trigger simulation scenario');
    return res.json();
  },

  async resetScenario() {
    const res = await fetch(`${API_BASE}/scenarios/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to reset simulation environment');
    return res.json();
  },

  // Evaluation & Algorithms
  async compareWithBaseline(scenarioName = 'Live Campus Assessment') {
    const res = await fetch(`${API_BASE}/evaluation/compare?scenario_name=${encodeURIComponent(scenarioName)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to run baseline comparison');
    return res.json();
  },

  async runAlgorithmDemo(startZoneId = 'Z01', targetZoneId = 'Z08') {
    const res = await fetch(
      `${API_BASE}/evaluation/algorithms/demo?start_zone_id=${startZoneId}&target_zone_id=${targetZoneId}`,
      {
        headers: getAuthHeaders(),
        credentials: 'include',
      }
    );
    if (!res.ok) throw new Error('Failed to run algorithm demonstration');
    return res.json();
  },
};
