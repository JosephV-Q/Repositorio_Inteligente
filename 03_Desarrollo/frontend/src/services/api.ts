import { ApiClient, ApiClientError } from '../../client/ApiClient';
export type * from '../../client/ApiClient';
export { ApiClient, ApiClientError };

type UnauthorizedCallback = () => void;
let unauthorizedCallback: UnauthorizedCallback | null = null;

export const setUnauthorizedCallback = (cb: UnauthorizedCallback | null) => {
  unauthorizedCallback = cb;
};

// URL Base: Variable de entorno o backend Neon en Vercel
const apiBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://db-repo.vercel.app';

export const api = new ApiClient({
  baseUrl: apiBaseUrl,
  tokenStorageKey: 'db_repo_session_token',
  onUnauthorized: () => {
    if (unauthorizedCallback) {
      unauthorizedCallback();
    }
  },
});

export default api;
