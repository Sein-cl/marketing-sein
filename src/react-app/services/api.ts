// src/react-app/services/api.ts

const API_BASE_URL = '/api'; // Base URL for all API requests, proxied by Vite dev server

// --- Token Management ---
/** Retrieves the auth token from localStorage. */
export const getToken = (): string | null => localStorage.getItem('authToken');
/** Sets the auth token in localStorage. */
const setToken = (token: string): void => localStorage.setItem('authToken', token);
/** Removes the auth token from localStorage. */
export const removeToken = (): void => localStorage.removeItem('authToken');
/** Checks if an auth token exists, indicating an authenticated session. */
export const isAuthenticated = (): boolean => getToken() !== null;

// --- Generic API Request Function ---
/**
 * Generic request helper to interact with the backend API.
 * Handles adding Authorization header if a token exists in localStorage.
 * Throws an error if the response is not ok, parsing JSON error details if available.
 * @template T Expected type of the JSON response.
 * @param {string} endpoint API endpoint path (e.g., '/users/login').
 * @param {RequestInit} options RequestInit options (method, body, custom headers).
 * @returns {Promise<T>} Parsed JSON response.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        // Attempt to parse error response from backend, otherwise throw a generic error
        let errorPayload;
        try {
            errorPayload = await response.json();
        } catch (e) {
            // If response is not JSON or other parsing error
            errorPayload = { message: `API request failed with status ${response.status} and non-JSON response.` };
        }
        throw new Error(errorPayload.error || errorPayload.message || `API request to ${endpoint} failed with status ${response.status}`);
    }

    // Handle responses that are successful but have no content (e.g., HTTP 204)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T; // Return undefined for no content responses
    }
    return response.json() as T; // Assumes all other successful responses are JSON
}

// --- Type Definitions for API Payloads ---

// User types (mirror backend responses for user operations)
interface User { id: string; email: string; }
interface LoginResponse { token: string; userId: string; email: string; }

// Domain type (mirrors backend D1 table, excluding sensitive fields if any)
export interface Domain {
    id: string;
    user_id: string;
    fqdn: string;
    status: string;
    created_at: string;
    updated_at: string;
    validated_at?: string | null;
}

// Certificate types
export interface CertificateSummary {
    id: string;
    common_name: string;
    issued_at: string; // Consider formatting these dates in UI
    expires_at: string;
    status: string;
}

export interface IssueCertificateResponse {
    success?: boolean; // Make optional to align with potential backend responses not always including it
    certificateId?: string;
    message: string; // Message is primary, success can be inferred from HTTP status too
}

// --- User Authentication API Calls ---
export const registerUser = (email: string, password: string): Promise<User> =>
    request<User>('/users/register', { method: 'POST', body: JSON.stringify({ email, password }) });

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
    const data = await request<LoginResponse>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.token) {
        setToken(data.token);
    }
    return data;
};

export const logoutUser = (): void => {
    removeToken();
    // Optionally, call a backend logout endpoint if it exists to invalidate session server-side
    // e.g., await request('/users/logout', { method: 'POST' });
};

// --- Domain Management API Calls ---
export const getDomains = (): Promise<Domain[]> =>
    request<Domain[]>('/domains');

export const addDomain = (fqdn: string): Promise<Domain> =>
    request<Domain>('/domains', { method: 'POST', body: JSON.stringify({ fqdn }) });

export const deleteDomain = (domainId: string): Promise<void> => // Backend returns 200 with message or 204
    request<void>(`/domains/${domainId}`, { method: 'DELETE' });

export const getDomainById = (domainId: string): Promise<Domain> =>
    request<Domain>(`/domains/${domainId}`);

// --- Certificate Management API Calls ---
export const issueCertificate = (domainId: string): Promise<IssueCertificateResponse> =>
    request<IssueCertificateResponse>(`/domains/${domainId}/issue-certificate`, { method: 'POST' });

export const getCertificatesForDomain = (domainId: string): Promise<CertificateSummary[]> =>
    request<CertificateSummary[]>(`/domains/${domainId}/certificates`);
