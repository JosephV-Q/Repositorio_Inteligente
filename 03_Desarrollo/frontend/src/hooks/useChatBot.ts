import { useEffect, useState, useCallback, useMemo } from 'react';
import { chatBot, GeminiChatBot, type ChatMessage, type ChatBotStatus, type SendMessageOptions } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface UseChatBotOptions {
  botInstance?: GeminiChatBot;
  customContext?: string | string[];
  autoSyncAuth?: boolean;
}

export function useChatBot(options: UseChatBotOptions = {}) {
  const { botInstance = chatBot, customContext, autoSyncAuth = true } = options;
  const { user, isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(() => botInstance.getMessages());
  const [status, setStatus] = useState<ChatBotStatus>(() => botInstance.getStatus());
  const [serviceStatus, setServiceStatus] = useState<{ configured: boolean; message: string; defaultModel: string } | null>(null);
  const [isCheckingService, setIsCheckingService] = useState(false);

  // Sincronizar perfil del usuario autenticado para diálogo natural
  useEffect(() => {
    if (autoSyncAuth && isAuthenticated && user) {
      botInstance.setUserProfile(user.nombre, user.nombre_rol || `Rol ${user.rol}`);
    }
  }, [botInstance, autoSyncAuth, isAuthenticated, user]);

  // Sincronizar contexto adicional personalizado si cambia
  useEffect(() => {
    if (customContext) {
      botInstance.setContext(customContext);
    }
  }, [botInstance, customContext]);

  // Suscribirse a los cambios del bot
  useEffect(() => {
    const unsubscribe = botInstance.subscribe((updatedMessages, currentStatus) => {
      setMessages(updatedMessages);
      setStatus(currentStatus);
    });
    return unsubscribe;
  }, [botInstance]);

  // Comprobar estado del servicio Gemini en el backend
  const checkServiceStatus = useCallback(async () => {
    setIsCheckingService(true);
    try {
      const res = await botInstance.getGeminiServiceStatus();
      setServiceStatus({
        configured: res.configured,
        message: res.message,
        defaultModel: res.defaultModel
      });
      return res;
    } catch (err: any) {
      setServiceStatus({
        configured: false,
        message: err?.message || 'No se pudo verificar el estado de Gemini en el backend.',
        defaultModel: 'gemini-2.5-flash'
      });
      return null;
    } finally {
      setIsCheckingService(false);
    }
  }, [botInstance]);

  const sendMessage = useCallback(
    async (text: string, sendOptions?: SendMessageOptions) => {
      return botInstance.sendMessage(text, sendOptions);
    },
    [botInstance]
  );

  const retryLastMessage = useCallback(async () => {
    return botInstance.retryLastMessage();
  }, [botInstance]);

  const clearHistory = useCallback(() => {
    botInstance.clearHistory();
  }, [botInstance]);

  const resetSession = useCallback(() => {
    botInstance.resetSession();
  }, [botInstance]);

  const deleteMessage = useCallback(
    (id: string) => {
      return botInstance.deleteMessage(id);
    },
    [botInstance]
  );

  const exportTranscript = useCallback(
    (format: 'markdown' | 'text' | 'json' = 'markdown') => {
      return botInstance.exportTranscript(format);
    },
    [botInstance]
  );

  const setContext = useCallback(
    (context: string | string[]) => {
      botInstance.setContext(context);
    },
    [botInstance]
  );

  const addContext = useCallback(
    (snippet: string) => {
      botInstance.addContext(snippet);
    },
    [botInstance]
  );

  const suggestedPrompts = useMemo(() => {
    return botInstance.getSuggestedPrompts();
  }, [botInstance]);

  const isThinking = status === 'thinking' || status === 'sending';

  return {
    messages,
    status,
    isThinking,
    sendMessage,
    retryLastMessage,
    clearHistory,
    resetSession,
    deleteMessage,
    exportTranscript,
    setContext,
    addContext,
    suggestedPrompts,
    serviceStatus,
    isCheckingService,
    checkServiceStatus,
    botInstance
  };
}

export default useChatBot;
