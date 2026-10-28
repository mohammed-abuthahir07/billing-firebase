// Centralized Admin API abstraction layer
export const ADMIN_API_BASE_URL = '';

const adminApi = {
    get: async () => Promise.resolve({ data: {} }),
    post: async () => Promise.resolve({ data: {} }),
    put: async () => Promise.resolve({ data: {} }),
    delete: async () => Promise.resolve({ data: {} }),
};

export default adminApi;
