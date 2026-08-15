const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('chakrify_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-logout on 401
  if (res.status === 401) {
    localStorage.removeItem('chakrify_token');
    localStorage.removeItem('chakrify_user');
    window.dispatchEvent(new CustomEvent('chakrify:unauthorized'));
    const err = await res.json().catch(() => ({ detail: 'Session expired. Please log in again.' }));
    throw new Error(err.detail || 'Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  register: (email, username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Candidates
  uploadCV: (formData) => request('/candidates/upload', { method: 'POST', body: formData }),
  getProfile: () => request('/candidates/profile'),
  deleteProfile: () => request('/candidates/profile', { method: 'DELETE' }),

  // Jobs
  searchJobs: (query = '', location = '', remote = 'any', page = 1, limit = 20) =>
    request(`/jobs/search?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&remote=${encodeURIComponent(remote)}&page=${page}&limit=${limit}`),
  listJobs: (page = 1, limit = 20) => request(`/jobs/list?page=${page}&limit=${limit}`),
  getJob: (jobId) => request(`/jobs/${jobId}`),

  // Saved Jobs
  saveJob: (jobId) => request(`/saved-jobs/${jobId}`, { method: 'POST' }),
  unsaveJob: (jobId) => request(`/saved-jobs/${jobId}`, { method: 'DELETE' }),
  getSavedJobs: () => request('/saved-jobs/'),

  // Matches
  scoreJob: (jobId, candidateId) =>
    request(`/matches/score/${jobId}?candidate_id=${candidateId}`, { method: 'POST' }),
  scoreAllJobs: (candidateId) =>
    request(`/matches/score_all?candidate_id=${candidateId}`, { method: 'POST' }),
  getCandidateMatches: (candidateId) =>
    request(`/matches/candidate/${candidateId}`),

  // Cover Letters
  generateCoverLetter: (jobId, candidateId, tone = 'professional', customInstructions = '') =>
    request('/cover_letters/generate', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, candidate_id: candidateId, tone, custom_instructions: customInstructions })
    }),
  getCandidateCoverLetters: (candidateId) => request(`/cover_letters/candidate/${candidateId}`),
  updateCoverLetter: (clId, content, tone) =>
    request(`/cover_letters/${clId}`, { method: 'PUT', body: JSON.stringify({ content, tone }) }),
  deleteCoverLetter: (clId) => request(`/cover_letters/${clId}`, { method: 'DELETE' }),

  // Preferences
  getPreferences: () => request('/preferences'),
  savePreferences: (prefs) => request('/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  // Stats
  getStats: () => request('/stats'),

  // Health
  health: () => request('/health'),
};
