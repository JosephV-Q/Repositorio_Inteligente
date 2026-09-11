export type SupportedFileType = 'pdf' | 'docx' | 'txt' | 'doc-unsupported' | 'unknown';

export interface FileValidationResult {
  isValid: boolean;
  fileType: SupportedFileType;
  errorMessage?: string;
}

/**
 * Formatea un tamaño de bytes a un string legible (KB, MB, etc.).
 */
export function formatFileSize(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Inspecciona los primeros bytes binarios (Magic Bytes) para identificar
 * el tipo real del archivo.
 */
export function detectFileSignature(bytes: Uint8Array): SupportedFileType {
  if (bytes.length >= 4) {
    // PDF: '%PDF' -> 0x25 0x50 0x44 0x46
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }

    // DOCX: Archivo ZIP 'PK..' -> 0x50 0x4B (0x03 0x04 o 0x05 0x06)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return 'docx';
    }
  }

  if (bytes.length >= 8) {
    // DOC Antiguo (Word 97-2003 OLE2 / Compound File): D0 CF 11 E0 A1 B1 1A E1
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      return 'doc-unsupported';
    }
  }

  return 'unknown';
}

/**
 * Valida tamaño, firma y compatibilidad antes de procesar el archivo.
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  if (file.size === 0) {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: `El archivo "${file.name}" está vacío (0 bytes).`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Interceptar .doc explícito antes de procesar
  if (extension === 'doc') {
    return {
      isValid: false,
      fileType: 'doc-unsupported',
      errorMessage:
        'El formato .DOC (Word 97-2003) es un formato binario propietario (OLE2) que no se puede procesar en el navegador. Por favor conviértelo a .DOCX o .PDF.',
    };
  }

  // Leer cabecera binaria (primeros 16 bytes)
  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const signature = detectFileSignature(new Uint8Array(headerBuffer));

  if (signature === 'doc-unsupported') {
    return {
      isValid: false,
      fileType: 'doc-unsupported',
      errorMessage:
        'El archivo contiene una firma binaria de Word 97-2003 (.doc). Debe ser guardado en formato moderno .docx.',
    };
  }

  if (extension === 'pdf' && signature !== 'pdf') {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: 'El archivo tiene extensión .pdf pero su cabecera no es un PDF válido.',
    };
  }

  if (extension === 'docx' && signature !== 'docx') {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: 'El archivo tiene extensión .docx pero no es un paquete OpenXML/ZIP válido.',
    };
  }

  if (extension === 'txt') {
    return { isValid: true, fileType: 'txt' };
  }

  if (signature === 'pdf' || signature === 'docx') {
    return { isValid: true, fileType: signature };
  }

  return {
    isValid: false,
    fileType: 'unknown',
    errorMessage: `Formato no compatible (.${extension}). Solo se admiten archivos .pdf, .docx y .txt.`,
  };
}
