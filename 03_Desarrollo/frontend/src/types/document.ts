export type DocumentItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  format: "PDF" | "DOCX" | "TXT";
  author: string;
  summary: string[];
  driveFileId?: string;
  viewUrl?: string;
  ruta_arch?: string;
  palabras_clave?: string[];
  contexto?: string;
  createdAt?: string;
};