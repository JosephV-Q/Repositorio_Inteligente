# Despliegue 02 — Requisitos de hardware y software

## 1. Desarrollo y pruebas locales

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 núcleos |
| RAM | 4 GB libres; 8 GB para frontend, backend y navegador simultáneos |
| Disco | 2 GB para dependencias y builds, más espacio para logs |
| Red | Acceso HTTPS estable a Neon, Gemini, Google Drive y Vercel |
| Sistema | Windows, Linux o macOS con Node.js compatible |
| Navegador | Chrome, Edge o Firefox actualizado |

No se requiere GPU: el procesamiento generativo y los embeddings se ejecutan en Google Gemini.

## 2. Producción

Vercel administra el cómputo de la función serverless y el frontend estático. Neon administra la base serverless. Google Drive administra el almacenamiento de binarios. Por tanto, no se requiere servidor físico propio ni disco persistente local.

## 3. Software

- Node.js y npm/pnpm.
- Git.
- Proyecto Vercel con variables de entorno configuradas.
- Proyecto Google Cloud con Drive API habilitada y credenciales OAuth2.
- Proyecto Google AI/Gemini con API key activa.
- Base Neon con conexión TLS (`sslmode=require`).

## 4. Compatibilidad

Los archivos funcionales previstos son PDF, DOCX y TXT. La calidad de PDF escaneado no está garantizada porque el alcance verificado no incluye OCR.
