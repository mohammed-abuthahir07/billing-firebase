// Centralized API abstraction layer for Firebase
// Replaces Axios baseURL configuration while preserving helper patterns

export const API_BASE_URL = '';
export const SERVER_ORIGIN = '';

const api = {
  // Stub for any remaining legacy calls
  get: async () => Promise.resolve({ data: {} }),
  post: async () => Promise.resolve({ data: {} }),
  put: async () => Promise.resolve({ data: {} }),
  delete: async () => Promise.resolve({ data: {} }),
};

export default api;
