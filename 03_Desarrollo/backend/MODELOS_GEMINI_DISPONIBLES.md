# Catálogo y Diagnóstico de Modelos Google Gemini AI

> **Fecha de Actualización:** Septiembre 2026  
> **Proyecto:** db_repo / DocuHub AI  
> **SDK:** `@google/genai` (v2.21.0)  
> **Tipo de Cuenta Evaluada:** Cuenta estándar de Google AI Studio (Tier gratuito / No Premium)

Este documento detalla los modelos de Google Gemini registrados en la API, su estado operativo comprobado mediante pruebas directas de generación (`generateContent`) y su compatibilidad con cuentas gratuitas/estándar.

---

## 1. Resumen Ejecutivo de Compatibilidad

| Categoría | Estado de Disponibilidad | Descripción y Hallazgos |
| :--- | :---: | :--- |
| **Familia Flash (3.x)** | 🟢 **100% Operativo** | Modelos vigentes y optimizados para chat, balance de velocidad y cero costo en cuota estándar. |
| **Familia Pro** | 🔴 **Requiere Plan de Pago (429)** | En cuentas no premium, la cuota gratuita para la serie `pro` es nula o restrictiva (`quota exceeded`). |
| **Familia 2.5 y anteriores** | 🔴 **Deprecados / 404** | Modelos como `gemini-2.5-flash` fueron retirados para nuevas peticiones. La API devuelve error `404 NOT_FOUND`. |
| **Modelos Multimodales Especializados** | 🟡 **Según Modalidad** | Modelos de audio en vivo, embeddings, video (Veo) y música (Lyria) con endpoints específicos. |

---

## 2. Modelos Activos para Cuentas Estándar (Recomendados para Chat)

Estos modelos fueron probados exitosamente con la clave del proyecto, generando texto en tiempo real:

| Identificador de Modelo (`model`) | Nombre en Pantalla | Latencia Promedio | Ventana Entrada / Salida | Recomendación de Uso |
| :--- | :--- | :---: | :---: | :--- |
| **`gemini-3.6-flash`** | Gemini 3.6 Flash | **~2.2 s** | 1M / 64k tokens | 🌟 **Recomendado por defecto.** Indicado explícitamente por Google para migrar desde 2.5. Alto rendimiento conversacional. |
| **`gemini-3.5-flash-lite`** | Gemini 3.5 Flash Lite | **~800 ms** | 1M / 64k tokens | ⚡ **Ultra rápido.** Ideal para respuestas cortas en widgets de chat interactivos donde la baja latencia es crítica. |
| **`gemini-3.8-flash`** | Gemini 3.8 Flash | **~3.0 s** | 1M / 64k tokens | 🧠 Mayor capacidad de razonamiento híbrido para preguntas analíticas o estructuración de datos. |
| **`gemini-3.1-flash-lite`** | Gemini 3.1 Flash Lite | **~1.9 s** | 1M / 64k tokens | Alternativa liviana de la serie 3.1. |
| **`gemini-flash-latest`** | Gemini Flash Latest | **~1.7 s** | 1M / 64k tokens | Alias dinámico al último Flash estable (puede presentar picos ocasionales de demanda `503`). |
| **`gemini-3.5-flash`** | Gemini 3.5 Flash | **~12 s** | 1M / 64k tokens | Operativo, pero con mayor latencia comparado con 3.6. |

---

## 3. Modelos Incompatibles o Inactivos en Cuenta Estándar

| Modelo | Error Retornado | Motivo Técnico |
| :--- | :---: | :--- |
| `gemini-2.5-flash` | **404 NOT_FOUND** | *“This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash”*. |
| `gemini-2.5-flash-lite` | **404 NOT_FOUND** | Retirado para nuevas peticiones. Sustituido por `gemini-3.5-flash-lite`. |
| `gemini-2.0-flash` | **404 NOT_FOUND** | Modelo de ciclo previo fuera de servicio para nuevas llamadas. |
| `gemini-1.5-flash` | **404 NOT_FOUND** | Retirado del endpoint estándar `v1beta`. |
| `gemini-pro-latest` | **429 RESOURCE_EXHAUSTED** | *“You exceeded your current quota”*. Los modelos Pro requieren facturación vinculada (Pay-as-you-go). |
| `gemini-2.5-pro` | **429 RESOURCE_EXHAUSTED** | Cuota excedida en nivel gratuito. |

---

## 4. Modelos Especializados y Multimodales en Catálogo

La API expone otros modelos diseñados para casos de uso específicos:

### 4.1. Embeddings y Búsqueda Semántica
* **`gemini-embedding-001`**: Representación vectorial de texto (hasta 2,048 tokens).
* **`gemini-embedding-2`**: Modelo vectorial multimodal para texto e imágenes (hasta 8,192 tokens).

### 4.2. Audio y Conversación en Tiempo Real (Bi-direccional)
* **`gemini-3.1-flash-live-preview`**: Audio y conversación streaming de baja latencia.
* **`gemini-3.5-transcribe-live`**: Transcripción y traducción en tiempo real.
* **`gemini-3.1-flash-tts-preview`**: Generación Text-to-Speech (voz sintetizada).

### 4.3. Generación Visual y Multimedia
* **`gemini-3.1-flash-image` / `gemini-3.1-flash-image-preview`**: Generación y edición de imágenes (Nano Banana 2).
* **`veo-3.1-generate-preview` / `veo-3.1-lite-generate-preview`**: Generación de video de alta definición (Veo 3.1).
* **`lyria-3.5`**: Generación musical y síntesis de audio.

### 4.4. Investigación Profunda y Agentes Autónomos
* **`deep-research-max-preview-04-2026`**: Motor de investigación profunda para síntesis de múltiples fuentes.
* **`antigravity-preview-05-2026`**: Motor para ejecución de tareas autónomas complejas y llamadas a herramientas.

---

## 5. Configuración Activa en el Backend (`db_repo`)

Para prevenir errores `502 Bad Gateway` en el frontend (`test.utsvps.com` / `DocuHub AI`), el backend implementa:

1. **Modelo Predeterminado:**
   * Variable en código: `'gemini-3.6-flash'`
   * Variable de entorno opcional: `GEMINI_DEFAULT_MODEL` en `.env` o Vercel.

2. **Capa de Reemplazo Automático (Fallback Transparente):**
   Cualquier petición que todavía envíe nombres de modelos deprecados es redirigida internamente sin rechazar la conexión:
   * `"gemini-2.5"` ➔ `"gemini-3.6-flash"`
   * `"gemini-2.5-flash"` ➔ `"gemini-3.6-flash"`
   * `"gemini-2.5-flash-lite"` ➔ `"gemini-3.5-flash-lite"`
   * `"gemini-2.0-flash"` ➔ `"gemini-3.6-flash"`
   * `"gemini-1.5-flash"` ➔ `"gemini-3.6-flash"`
   * `"gemini-pro"` ➔ `"gemini-3.6-flash"`

---

## 6. Verificación en Cualquier Momento

Para comprobar el estado de conexión de los modelos con la clave activa, ejecuta en la raíz del proyecto:

```bash
npm run test:gemini
```
