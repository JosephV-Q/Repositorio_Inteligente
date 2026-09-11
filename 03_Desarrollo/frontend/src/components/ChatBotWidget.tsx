import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import { useChatBot } from '../hooks/useChatBot';
import type { DocumentItem } from '../types/document';

interface ChatBotWidgetProps {
  activeDocument?: DocumentItem | null;
  activeCategory?: string;
  onDocumentSelect?: (document: DocumentItem) => void;
}

/**
 * Renderizador ligero y seguro de Markdown para los mensajes del asistente
 */
function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;

  // Dividir por bloques de código primero
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="chat-markdown-body">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0].trim();
          const hasLang = /^[a-z0-9_-]+$/i.test(firstLine);
          const lang = hasLang ? firstLine : '';
          const codeContent = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="chat-code-block">
              {lang && <div className="chat-code-header">{lang}</div>}
              <pre>
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Renderizar párrafos, listas y estilos inline
        const paragraphs = part.split(/\n\n+/);
        return (
          <React.Fragment key={index}>
            {paragraphs.map((para, pIdx) => {
              const lines = para.split('\n');
              const isList = lines.every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\.\s/.test(line.trim()));

              if (isList) {
                return (
                  <ul key={pIdx} className="chat-list">
                    {lines.map((item, lIdx) => {
                      const cleanItem = item.trim().replace(/^[-*]\s+|\d+\.\s+/, '');
                      return (
                        <li key={lIdx}>
                          <InlineFormat text={cleanItem} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="chat-paragraph">
                  {lines.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      <InlineFormat text={line} />
                      {lIdx < lines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Formateador de texto inline: negritas, cursivas y fragmentos de código
 */
function InlineFormat({ text }: { text: string }) {
  // Regex para capturar `código`, **negrita**, y *cursiva*
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith('`') && token.endsWith('`')) {
          return (
            <code key={i} className="chat-inline-code">
              {token.slice(1, -1)}
            </code>
          );
        }
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={i}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={i}>{token.slice(1, -1)}</em>;
        }
        return token;
      })}
    </>
  );
}

export function ChatBotWidget({ activeDocument, activeCategory, onDocumentSelect }: ChatBotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [includeActiveDoc, setIncludeActiveDoc] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    messages,
    isThinking,
    sendMessage,
    retryLastMessage,
    clearHistory,
    resetSession,
    deleteMessage,
    exportTranscript,
    suggestedPrompts,
    serviceStatus,
    checkServiceStatus
  } = useChatBot();

  // Scroll automático hacia el último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isThinking, isOpen]);

  // Chequeo de estado inicial del servicio de Gemini
  useEffect(() => {
    if (isOpen && !serviceStatus) {
      checkServiceStatus();
    }
  }, [isOpen, serviceStatus, checkServiceStatus]);

  // Enfocar el textarea al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isThinking) return;

    setInputPrompt('');

    // Construir contexto adicional opcional si hay un documento activo
    let extraContext: string | undefined;
    if (includeActiveDoc && activeDocument) {
      extraContext = [
        `Documento actualmente consultado: "${activeDocument.title}" (Categoría: ${activeDocument.category}, Formato: ${activeDocument.format})`,
        `Descripción: ${activeDocument.description}`,
        activeDocument.summary?.length ? `Puntos clave/Resumen:\n- ${activeDocument.summary.join('\n- ')}` : null
      ]
        .filter(Boolean)
        .join('\n');
    } else if (activeCategory && activeCategory !== 'Todas las categorías') {
      extraContext = `Categoría activa de navegación en la biblioteca: "${activeCategory}"`;
    }

    try {
      await sendMessage(text, {
        extraContext,
        semanticSearch: true,
        semanticOptions: {
          categoria: activeCategory && activeCategory !== 'Todas las categorías' ? activeCategory : undefined,
          limit: 4,
          modo: 'hibrido',
        }
      });
    } catch (err) {
      console.error('[ChatBotWidget] Error al enviar mensaje:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const downloadTranscript = () => {
    const transcript = exportTranscript('markdown');
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocuHub_Conversacion_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar el ChatBot */}
      <button
        type="button"
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Cerrar asistente AI' : 'Abrir asistente virtual DocuHub AI'}
        title="DocuHub AI - Asistente Conversacional"
      >
        <span className="chatbot-fab-sparkle">
          <Sparkles size={16} />
        </span>
        {isOpen ? <X size={20} /> : <Bot size={22} />}
        {!isOpen && <span className="chatbot-fab-label">DocuHub AI</span>}
      </button>

      {/* Ventana flotante del ChatBot */}
      {isOpen && (
        <div className={`chatbot-window ${isExpanded ? 'expanded' : ''}`}>
          {/* Cabecera */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">
                <Bot size={18} />
                <span className={`chatbot-status-dot ${isThinking ? 'thinking' : 'online'}`} />
              </div>
              <div className="chatbot-header-info">
                <div className="chatbot-title-row">
                  <strong>DocuHub AI</strong>
                  <span className="chatbot-model-badge" style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    <Sparkles size={10} style={{ display: 'inline', marginRight: 3 }} /> pgvector Semántico
                  </span>
                </div>
                <small className="chatbot-subtitle">
                  {isThinking
                    ? 'Pensando y procesando...'
                    : serviceStatus?.configured
                      ? 'En línea • Conversación natural'
                      : 'Asistente conectado al backend'}
                </small>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Descargar transcripción (.md)"
                onClick={downloadTranscript}
                aria-label="Descargar transcripción"
              >
                <Download size={15} />
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Reiniciar conversación"
                onClick={resetSession}
                aria-label="Reiniciar conversación"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Vaciar todo el historial"
                onClick={() => {
                  if (window.confirm('¿Deseas vaciar todo el historial del chat?')) {
                    clearHistory();
                  }
                }}
                aria-label="Vaciar chat"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title={isExpanded ? 'Restaurar tamaño' : 'Maximizar'}
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label="Alternar tamaño"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Cerrar chat"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar chat"
              >
                <ChevronDown size={17} />
              </button>
            </div>
          </div>

          {/* Banner de contexto de documento activo si aplica */}
          {activeDocument && (
            <div className="chatbot-context-banner">
              <div className="context-banner-info">
                <FileText size={13} />
                <span>
                  Contexto: <b>{activeDocument.title}</b>
                </span>
              </div>
              <label className="context-banner-toggle" title="Incluir este documento en el contexto para Gemini">
                <input
                  type="checkbox"
                  checked={includeActiveDoc}
                  onChange={(e) => setIncludeActiveDoc(e.target.checked)}
                />
                <span>Usar en chat</span>
              </label>
            </div>
          )}

          {/* Área de Mensajes */}
          <div className="chatbot-messages">
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              const isUser = message.role === 'user';
              const isError = message.status === 'error';

              return (
                <div
                  key={message.id}
                  className={`chat-bubble-row ${isAssistant ? 'assistant' : 'user'} ${isError ? 'has-error' : ''}`}
                >
                  {isAssistant && (
                    <div className="chat-author-avatar">
                      <Bot size={14} />
                    </div>
                  )}

                  <div className="chat-bubble-container">
                    <div className="chat-bubble">
                      {isAssistant ? (
                        message.status === 'sending' ? (
                          <div className="chat-typing-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : (
                          <>
                            <FormattedMessage text={message.content} />
                            {message.metadata?.matchedDocuments && message.metadata.matchedDocuments.length > 0 && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid rgba(226, 232, 240, 0.8)',
                                  fontSize: '11px'
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontWeight: 600,
                                    color: '#2563eb',
                                    marginBottom: '6px'
                                  }}
                                >
                                  <Sparkles size={12} />
                                  <span>Fuentes semánticas del repositorio (pgvector):</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {message.metadata.matchedDocuments.map((doc: any, docIdx: number) => (
                                    <button
                                      key={doc.id || docIdx}
                                      type="button"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        textAlign: 'left',
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '5px 8px',
                                        cursor: 'pointer',
                                        gap: '6px',
                                        color: '#1e293b'
                                      }}
                                      onClick={() => {
                                        if (onDocumentSelect) {
                                          const ext = doc.nom_arch ? doc.nom_arch.split('.').pop()?.toUpperCase() : 'PDF';
                                          const validFormat = ext === 'PDF' || ext === 'DOCX' || ext === 'TXT' ? ext : 'PDF';
                                          onDocumentSelect({
                                            id: `REPO-${doc.id}`,
                                            title: doc.nom_arch,
                                            category: doc.categoria || 'Proyectos Activos',
                                            description: doc.descripcion || '',
                                            format: validFormat,
                                            author: 'Repositorio',
                                            summary: doc.resumen ? doc.resumen.split('\n').filter(Boolean) : [],
                                            viewUrl: doc.ruta_arch,
                                            ruta_arch: doc.ruta_arch
                                          });
                                        } else if (doc.ruta_arch) {
                                          window.open(doc.ruta_arch, '_blank');
                                        }
                                      }}
                                      title={`Consultar ${doc.nom_arch}`}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                                        <FileText size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {doc.nom_arch}
                                        </span>
                                        {doc.categoria && (
                                          <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                            {doc.categoria}
                                          </span>
                                        )}
                                      </div>
                                      {doc.similarity !== undefined && doc.similarity > 0 && (
                                        <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>
                                          {Math.round(doc.similarity * 100)}% relevancia
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <p className="chat-user-text">{message.content}</p>
                      )}
                    </div>

                    <div className="chat-meta">
                      <span className="chat-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      {isAssistant && message.status === 'sent' && (
                        <button
                          type="button"
                          className="chat-action-btn"
                          title="Copiar respuesta"
                          onClick={() => copyToClipboard(message.content, message.id)}
                        >
                          {copiedMessageId === message.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      )}

                      {isError && (
                        <button
                          type="button"
                          className="chat-action-btn retry-btn"
                          title="Reintentar consulta"
                          onClick={() => retryLastMessage()}
                        >
                          <RefreshCw size={12} /> Reintentar
                        </button>
                      )}

                      <button
                        type="button"
                        className="chat-action-btn delete-btn"
                        title="Eliminar mensaje"
                        onClick={() => deleteMessage(message.id)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {isUser && (
                    <div className="chat-user-avatar">
                      <User size={13} />
                    </div>
                  )}
                </div>
              );
            })}

            {isThinking && (
              <div className="chat-bubble-row assistant thinking-row">
                <div className="chat-author-avatar">
                  <Bot size={14} />
                </div>
                <div className="chat-bubble thinking-bubble">
                  <Sparkles size={13} className="spin-slow" />
                  <span>DocuHub AI está consultando semánticamente los repositorios...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias de preguntas rápidas (solo visibles si hay pocos mensajes) */}
          {messages.length <= 2 && (
            <div className="chatbot-suggestions">
              <div className="suggestions-title">
                <Sparkles size={12} /> Búsqueda y consultas semánticas:
              </div>
              <div className="suggestions-pills">
                {[
                  "🔍 Buscar auditorías y normativas de seguridad",
                  "🔍 Buscar contratos y acuerdos legales",
                  "🔍 Buscar especificaciones técnicas y microservicios",
                  ...suggestedPrompts.slice(0, 1)
                ].map((prompt: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Entrada / Envío */}
          <div className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta a la IA o busca en repositorios... (Enter para enviar)"
                rows={1}
                disabled={isThinking}
              />
              <button
                type="button"
                className="chatbot-send-btn"
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || isThinking}
                aria-label="Enviar mensaje"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="chatbot-input-footer">
              <span>Shift + Enter para salto de línea</span>
              <span>Backend endpoint: <code>/api/gemini</code></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBotWidget;
