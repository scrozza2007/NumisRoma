/**
 * Centralized API client for NumisRoma.
 *
 * Handles:
 *   - credentialed requests (`credentials: 'include'`) so the browser
 *     sends and receives the httpOnly `token` auth cookie automatically.
 *   - CSRF token lifecycle for the double-submit pattern used by the
 *     backend: fetch-once, cache in memory, attach on mutating requests,
 *     auto-refresh after a CSRF_INVALID 403.
 */

import { ensureCsrfToken, invalidateCsrfToken, getCsrfHeader } from './csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(message, status, details = null, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Attempt a silent token refresh via the httpOnly refreshToken cookie.
 * Returns true if the refresh succeeded (new access token cookie is set).
 */
const tryRefreshToken = async (csrfRetried = false) => {
  try {
    const csrfHeader = await getCsrfHeader('POST');
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeader }
    });
    if (res.ok) invalidateCsrfToken();
    if (res.status === 403 && !csrfRetried) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'CSRF_INVALID') {
        invalidateCsrfToken();
        return tryRefreshToken(true);
      }
    }
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Main fetch wrapper with error handling, cookie credentials, and CSRF.
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/coins')
 * @param {Object} options - Fetch options. Set `options._retry` internally to
 *                           prevent infinite CSRF/refresh retry loops.
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = MUTATING_METHODS.has(method);

  // Attach CSRF token for mutating requests (safe methods don't need it).
  // Server ignores it for non-cookie-auth requests, so there's no downside.
  const csrfHeader = isMutating ? await getCsrfHeader(method) : {};

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...csrfHeader
  };

  const config = {
    ...options,
    method,
    credentials: 'include', // send/receive httpOnly auth + CSRF cookies
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses (like image downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError('Request failed', response.status);
      }
      return response;
    }

    // Parse JSON response
    const data = await response.json().catch(() => ({}));

    // Handle error responses
    if (!response.ok) {
      const errCode = data.code || null;

      // If the server rejected our CSRF token, refresh and retry once.
      if (response.status === 403 && errCode === 'CSRF_INVALID' && !options._retry) {
        invalidateCsrfToken();
        return apiFetch(endpoint, { ...options, _retry: true });
      }

      // If the access token expired (but session is NOT terminated), try a
      // silent refresh via the httpOnly refreshToken cookie and retry once.
      if (response.status === 401 && errCode !== 'SESSION_TERMINATED' && !data.sessionTerminated && !options._tokenRefreshed) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          return apiFetch(endpoint, { ...options, _tokenRefreshed: true });
        }
      }

      throw new ApiError(
        data.message || data.error || data.msg || 'Request failed',
        response.status,
        data.details || null,
        errCode
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('API request failed:', error);
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      error.message
    );
  }
};

/**
 * API client object with HTTP methods
 */
export const apiClient = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data = null, options = {}) => apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),

  put: (endpoint, data = null, options = {}) => apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  }),

  patch: (endpoint, data = null, options = {}) => apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  }),

  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' }),

  /**
   * POST request with FormData (for file uploads).
   * We can't reuse apiFetch because it sets Content-Type: application/json.
   * But we DO honor the same cookie + CSRF conventions.
   */
  postFormData: async (endpoint, formData, options = {}) => {
    const method = options.method || 'POST';
    const doFetch = async (retry = false) => {
      let csrfToken = null;
      try {
        csrfToken = await ensureCsrfToken();
      } catch {
        // Proceed without; server will reject if truly required.
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        credentials: 'include',
        headers: {
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          ...options.headers
        },
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.code === 'CSRF_INVALID' && !retry) {
          invalidateCsrfToken();
          return doFetch(true);
        }
        throw new ApiError(
          data.message || data.error || data.msg || 'Upload failed',
          res.status,
          data.details,
          data.code || null
        );
      }
      return data;
    };

    return doFetch(false);
  },

  _invalidateCsrfToken: invalidateCsrfToken
};

/**
 * Specific API endpoints (optional convenience methods)
 */
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials) => apiClient.post('/api/auth/login', credentials),
    register: (userData) => apiClient.post('/api/auth/register', userData),
    logout: async () => {
      const result = await apiClient.post('/api/auth/logout');
      // Cookie is cleared by the server, but our cached CSRF token was bound
      // to the old session identity — drop it so the next request fetches a
      // fresh one.
      invalidateCsrfToken();
      return result;
    },
    me: () => apiClient.get('/api/auth/me'),
    changePassword: (passwords) => apiClient.post('/api/auth/change-password', passwords),
    deleteAccount: (password) => apiClient.post('/api/auth/delete-account', { password }),
  },

  // Coins endpoints
  coins: {
    getAll: (params = {}) => {
      // Sort parameters for consistent cache keys across different parameter orders
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key];
          return acc;
        }, {});
      const queryString = new URLSearchParams(sortedParams).toString();
      return apiClient.get(`/api/coins${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => apiClient.get(`/api/coins/${id}`),
    getRandom: (limit = 3) => apiClient.get(`/api/coins/random?limit=${limit}`),
    getFilterOptions: () => apiClient.get('/api/coins/filter-options'),
  },

  // Collections endpoints
  collections: {
    getMy: () => apiClient.get('/api/collections'),
    getPublic: () => apiClient.get('/api/collections/public'),
    getById: (id) => apiClient.get(`/api/collections/${id}`),
    create: (data) => apiClient.post('/api/collections', data),
    update: (id, data) => apiClient.put(`/api/collections/${id}`, data),
    delete: (id) => apiClient.delete(`/api/collections/${id}`),
    addCoin: (id, coinData) => apiClient.post(`/api/collections/${id}/coins`, coinData),
    removeCoin: (collectionId, coinId) =>
      apiClient.delete(`/api/collections/${collectionId}/coins/${coinId}`),
  },

  wishlist: {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiClient.get(`/api/wishlist${queryString ? `?${queryString}` : ''}`);
    },
    create: (data) => apiClient.post('/api/wishlist', data),
    update: (id, data) => apiClient.put(`/api/wishlist/${id}`, data),
    delete: (id) => apiClient.delete(`/api/wishlist/${id}`),
    markAcquired: (id) => apiClient.post(`/api/wishlist/${id}/acquired`),
    convert: (id, data) => apiClient.post(`/api/wishlist/${id}/convert`, data),
  },

  // Users endpoints
  users: {
    getProfile: (id) => apiClient.get(`/api/users/${id}/profile`),
    follow: (id) => apiClient.post(`/api/users/${id}/follow`),
    unfollow: (id) => apiClient.delete(`/api/users/${id}/unfollow`),
  },
};

export default apiClient;
