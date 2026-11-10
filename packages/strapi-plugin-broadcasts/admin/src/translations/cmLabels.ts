import { CM_LABEL_TRANSLATIONS_EXTRA } from "./cmLabelsExtra";

export const CM_LABEL_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name":
      "Name",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug":
      "URL Slug",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName":
      "Trigger Event Name",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType":
      "Target Content Type (UID)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic":
      "Broadcast Topic",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels":
      "Delivery Channels",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active":
      "Active",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority":
      "Priority",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate":
      "Subject Template",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate":
      "Plain Text Body Template",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate":
      "HTML Body Template",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate":
      "CTA Button Label Template",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate":
      "CTA URL Template",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations":
      "Localized Translations",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt":
      "Last Triggered At",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount":
      "Total Trigger Count",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId":
      "Document ID",
    "content-manager.content-types.plugin::broadcasts.campaign.title": "Title",
    "content-manager.content-types.plugin::broadcasts.campaign.slug":
      "URL Slug",
    "content-manager.content-types.plugin::broadcasts.campaign.topic":
      "Broadcast Topic",
    "content-manager.content-types.plugin::broadcasts.campaign.channels":
      "Delivery Channels",
    "content-manager.content-types.plugin::broadcasts.campaign.priority":
      "Priority",
    "content-manager.content-types.plugin::broadcasts.campaign.status":
      "Status",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt":
      "Scheduled Send Date & Time",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt":
      "Sent Date & Time",
    "content-manager.content-types.plugin::broadcasts.campaign.subject":
      "Message Subject",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText":
      "Plain Text Message",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml":
      "HTML Message Content",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel":
      "Call-to-Action Button Label",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl":
      "Call-to-Action URL",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl":
      "Attached Media URL",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef":
      "Email Designer Template Reference",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName":
      "WhatsApp Approved Template Name",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds":
      "WhatsApp Group & Channel JIDs",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId":
      "Telegram Channel or Group Chat ID",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId":
      "Telegram Topic / Thread ID",
    "content-manager.content-types.plugin::broadcasts.campaign.translations":
      "Localized Translations",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate":
      "Secondary Calendar Date",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel":
      "Secondary Date Label",
    "content-manager.content-types.plugin::broadcasts.campaign.stats":
      "Delivery Statistics",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata":
      "Additional Metadata (JSON)",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId":
      "Document ID",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey":
      "Idempotency Key",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug":
      "Campaign Slug",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel":
      "Delivery Channel",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver":
      "Delivery Driver / Provider",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked":
      "Masked Recipient",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale":
      "Locale",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status":
      "Status",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId":
      "External Provider Message ID",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage":
      "Error Message",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt":
      "Sent Date & Time",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel":
      "Secondary Date Label",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId":
      "Document ID",
    "content-manager.enum.scheduled": "Scheduled",
    "content-manager.enum.cancelled": "Cancelled",
    "content-manager.enum.whatsapp": "WhatsApp",
    "content-manager.enum.sent": "Sent",
    "content-manager.enum.low": "Low",
    "content-manager.enum.normal": "Normal",
    "content-manager.enum.high": "High",
    "content-manager.enum.urgent": "Urgent",
    "content-manager.enum.draft": "Draft",
    "content-manager.enum.sending": "Sending",
    "content-manager.enum.failed": "Failed",
    "content-manager.enum.email": "Email",
    "content-manager.enum.telegram": "Telegram",
    "content-manager.enum.simulated": "Simulated (Dry Run)",
    "content-manager.enum.skipped_duplicate": "Skipped (Duplicate)",
  },
  es: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name":
      "Nombre",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug":
      "Slug (URL Amigable)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName":
      "Evento Disparador",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType":
      "Tipo de Contenido Destino (UID)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic":
      "Tema de Difusión",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels":
      "Canales de Envío",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active":
      "Activo",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority":
      "Prioridad",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate":
      "Plantilla del Asunto",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate":
      "Plantilla de Texto Plano",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate":
      "Plantilla de Cuerpo HTML",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate":
      "Plantilla de Texto del Botón (CTA)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate":
      "Plantilla de Enlace del Botón (CTA)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations":
      "Traducciones Localizadas",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt":
      "Última Ejecución",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount":
      "Número Total de Ejecuciones",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId":
      "ID del Documento",
    "content-manager.content-types.plugin::broadcasts.campaign.title": "Título",
    "content-manager.content-types.plugin::broadcasts.campaign.slug":
      "Slug (URL Amigable)",
    "content-manager.content-types.plugin::broadcasts.campaign.topic":
      "Tema de Difusión",
    "content-manager.content-types.plugin::broadcasts.campaign.channels":
      "Canales de Envío",
    "content-manager.content-types.plugin::broadcasts.campaign.priority":
      "Prioridad",
    "content-manager.content-types.plugin::broadcasts.campaign.status":
      "Estado",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt":
      "Fecha y Hora Programada de Envío",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt":
      "Fecha y Hora de Envío",
    "content-manager.content-types.plugin::broadcasts.campaign.subject":
      "Asunto del Mensaje",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText":
      "Mensaje en Texto Plano",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml":
      "Contenido HTML del Mensaje",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel":
      "Texto del Botón de Acción (CTA)",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl":
      "Enlace del Botón de Acción (CTA)",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl":
      "URL de Archivo Multimedia Adjunto",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef":
      "Referencia de Plantilla de Correo",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName":
      "Nombre de Plantilla de WhatsApp",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds":
      "IDs de Grupos y Canales de WhatsApp",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId":
      "ID de Canal o Grupo de Telegram",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId":
      "ID de Hilo / Tema de Telegram",
    "content-manager.content-types.plugin::broadcasts.campaign.translations":
      "Traducciones Localizadas",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate":
      "Fecha en Calendario Secundario",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel":
      "Etiqueta de Fecha Secundaria",
    "content-manager.content-types.plugin::broadcasts.campaign.stats":
      "Estadísticas de Entrega",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata":
      "Metadatos Adicionales (JSON)",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId":
      "ID del Documento",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey":
      "Clave de Idempotencia",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug":
      "Slug de la Campaña",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel":
      "Canal de Envío",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver":
      "Proveedor de Envío (Driver)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked":
      "Destinatario Enmascarado",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale":
      "Idioma (Locale)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status":
      "Estado",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId":
      "ID de Mensaje del Proveedor Externo",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage":
      "Mensaje de Error",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt":
      "Fecha y Hora de Envío",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel":
      "Etiqueta de Fecha Secundaria",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId":
      "ID del Documento",
    "content-manager.enum.scheduled": "Programado",
    "content-manager.enum.cancelled": "Cancelado",
    "content-manager.enum.whatsapp": "WhatsApp",
    "content-manager.enum.sent": "Enviado",
    "content-manager.enum.low": "Baja",
    "content-manager.enum.normal": "Normal",
    "content-manager.enum.high": "Alta",
    "content-manager.enum.urgent": "Urgente",
    "content-manager.enum.draft": "Borrador",
    "content-manager.enum.sending": "Enviando",
    "content-manager.enum.failed": "Fallido",
    "content-manager.enum.email": "Correo Electrónico",
    "content-manager.enum.telegram": "Telegram",
    "content-manager.enum.simulated": "Simulado (Prueba)",
    "content-manager.enum.skipped_duplicate": "Omitido (Duplicado)",
  },
  ...CM_LABEL_TRANSLATIONS_EXTRA,
};
