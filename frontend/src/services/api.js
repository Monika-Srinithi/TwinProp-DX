import axios from 'axios';
// Base API URL defaulting to relative /api or environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'https://twinprop-dx.onrender.com/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      'An unexpected network or server error occurred.';
    console.error(`[TwinProp API Error]: ${message}`, error);
    return Promise.reject(new Error(message));
  }
);

// Engine API endpoints
export const getEngines = async () => {
  const res = await apiClient.get('/engines');
  return res.data;
};

export const getEngineById = async (engineId) => {
  const res = await apiClient.get(`/engines/${engineId}`);
  return res.data;
};

export const createEngine = async (engineData) => {
  const res = await apiClient.post('/engines', engineData);
  return res.data;
};

// Telemetry API endpoints
export const getTelemetry = async (engineId, limit = 50) => {
  const res = await apiClient.get(`/telemetry/${engineId}`, {
    params: { limit },
  });
  return res.data;
};

export const getLatestTelemetry = async (engineId) => {
  const res = await apiClient.get(`/telemetry/${engineId}/latest`);
  return res.data;
};

export const createTelemetry = async (telemetryData) => {
  const res = await apiClient.post('/telemetry', telemetryData);
  return res.data;
};

// Missions API endpoints
export const getMissions = async () => {
  const res = await apiClient.get('/missions');
  return res.data;
};

export const getMissionById = async (missionId) => {
  const res = await apiClient.get(`/missions/${missionId}`);
  return res.data;
};

export const createMission = async (missionData) => {
  const res = await apiClient.post('/missions', missionData);
  return res.data;
};

// Phase 3 Fault Diagnosis & Anomaly Detection API endpoints
export const getEngineDiagnosis = async (engineId) => {
  const res = await apiClient.get(`/faults/${engineId}/diagnosis`);
  return res.data;
};

export const getFaults = async (engineId, limit = 50, severity = null, unacknowledgedOnly = false) => {
  const res = await apiClient.get(`/faults/${engineId}`, {
    params: {
      limit,
      ...(severity ? { severity } : {}),
      ...(unacknowledgedOnly ? { unacknowledged_only: true } : {}),
    },
  });
  return res.data;
};

export const acknowledgeFault = async (faultId) => {
  const res = await apiClient.post(`/faults/${faultId}/acknowledge`, { is_acknowledged: true });
  return res.data;
};

export const simulateFault = async (engineId, scenario, severity = 'WARNING') => {
  const res = await apiClient.post('/faults/simulate', {
    engine_id: engineId,
    scenario,
    severity,
  });
  return res.data;
};

// Phase 2 Digital Twin API endpoints
export const getDigitalTwinState = async (engineId) => {
  const res = await apiClient.get(`/digital-twin/${engineId}`);
  return res.data;
};

export const getDigitalTwinHistory = async (engineId, limit = 25) => {
  const res = await apiClient.get(`/digital-twin/${engineId}/history`, {
    params: { limit },
  });
  return res.data;
};

// Phase 4 Remaining Useful Life (RUL) API endpoints
export const getEngineRUL = async (engineId) => {
  const res = await apiClient.get(`/rul/${engineId}`);
  return res.data;
};

export const getEngineRULTrajectory = async (engineId) => {
  const res = await apiClient.get(`/rul/${engineId}/trajectory`);
  return res.data;
};

// Phase 5 Mission Replay API endpoints
export const getReplayMissions = async () => {
  const res = await apiClient.get('/replay/missions');
  return res.data;
};

export const getMissionReplay = async (missionId) => {
  const res = await apiClient.get(`/replay/missions/${missionId}`);
  return res.data;
};

// System Health endpoint
export const getSystemHealth = async () => {
  // Directly hit /health on host (without /api prefix)
  const rootBase = API_BASE_URL.replace(/\/api\/?$/, '') || '';
  const rootClient = axios.create({
    baseURL: rootBase || undefined,
    timeout: 5000,
  });
  const res = await rootClient.get('/health');
  return res.data;
};

export const getRootInfo = async () => {
  const rootBase = API_BASE_URL.replace(/\/api\/?$/, '') || '';
  const rootClient = axios.create({
    baseURL: rootBase || undefined,
    timeout: 5000,
  });
  const res = await rootClient.get('/');
  return res.data;
};

export default apiClient;
