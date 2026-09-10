import type { DocumentItem } from "../types/document";

export const documents: DocumentItem[] = [
  {
    id: "DOC-2024-03", title: "Plan Estratégico Q3 - Expansión e Infraestructura.pdf", category: "Proyectos Activos",
    description: "Desglose detallado de hitos, presupuesto asignado para infraestructura e indicadores clave de rendimiento (KPIs).", format: "PDF", author: "Elena Torres",
    summary: ["Aprobación de capital por $1.2M USD para ampliación de servidores dedicados y contratación del equipo de operaciones de nube.", "Migración inicial prevista para inicio del tercer trimestre, culminando con pruebas de estrés en la semana 38.", "Requerimiento formal de auditoría externa SOC2 Tipo II antes de desplegar en nuevas regiones de la UE."],
  },
  {
    id: "DOC-2024-08", title: "Especificaciones de Microservicios.docx", category: "Proyectos Activos",
    description: "Diseño de microservicios backend, diagramas de flujo de datos y protocolos de seguridad OpenAPI validados.", format: "DOCX", author: "Carlos Mena",
    summary: ["Arquitectura distribuida con contratos OpenAPI versionados y validación de esquemas en cada entrada.", "El sistema de eventos centralizado reduce el acoplamiento entre servicios y facilita el seguimiento operacional.", "Los secretos de servicio deben mantenerse fuera del repositorio y rotarse cada noventa días."],
  },
  {
    id: "DOC-2024-11", title: "Notas de Auditoría de Seguridad.txt", category: "Proyectos Activos",
    description: "Registro crudo de eventos de auditoría del clúster principal, tiempos de latencia y anomalías detectadas en logs.", format: "TXT", author: "Javier Silva",
    summary: ["Se detectaron tres picos de latencia durante la ventana de mantenimiento programada.", "No se encontraron accesos no autorizados en la muestra revisada por el equipo de seguridad.", "La retención de logs debe ampliarse para cubrir el nuevo periodo de cumplimiento."],
  },
  {
    id: "DOC-2024-14", title: "Contrato de Proveedores Tecnológicos.pdf", category: "Proyectos Activos",
    description: "Acuerdos legales estandarizados para contratistas externos y partners de desarrollo tecnológico 2024.", format: "PDF", author: "Ana Ríos",
    summary: ["El acuerdo establece niveles de servicio, tiempos de respuesta y responsables de escalamiento.", "Las cláusulas de propiedad intelectual aplican a todos los entregables desarrollados durante la vigencia.", "La revisión legal anual queda agendada para el cierre del cuarto trimestre."],
  },
  {
    id: "DOC-2024-18", title: "Requerimientos Funcionales v2.docx", category: "Proyectos Activos",
    description: "Definición de historias de usuario, criterios de aceptación y matrices de trazabilidad para el módulo core.", format: "DOCX", author: "María León",
    summary: ["El módulo de búsqueda debe responder en menos de dos segundos para consultas indexadas.", "Cada requerimiento contará con una historia de usuario y un criterio de aceptación verificable.", "La matriz de trazabilidad vinculará requerimientos, pruebas y documentos publicados."],
  },
];

export const categories = ["Proyectos Activos", "Finanzas & Legal", "Recursos Humanos", "Informes Técnicos", "Investigación + I+D"];