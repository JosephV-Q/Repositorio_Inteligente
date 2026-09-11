export type DocumentItem = {
  id: string;
  repoId?: number;
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
  similarity?: number;
  matchType?: "vector" | "texto" | "hibrido";
};