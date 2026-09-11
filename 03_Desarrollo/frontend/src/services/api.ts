import { ApiClient, ApiClientError } from '../../client/ApiClient';
import { GeminiChatBot, createChatBot } from '../../client/GeminiChatBot';
export type * from '../../client/ApiClient';
export type * from '../../client/GeminiChatBot';
export { ApiClient, ApiClientError, GeminiChatBot, createChatBot };

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

export const chatBot = new GeminiChatBot({
  client: api,
  botName: 'DocuHub AI',
  storageKey: 'docuhub_gemini_chat_history'
});

export default api;

