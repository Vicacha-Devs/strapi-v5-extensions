import { CM_PLACEHOLDER_TRANSLATIONS_EXTRA } from "./cmPlaceholdersExtra";

export const CM_PLACEHOLDER_TRANSLATIONS: Record<
  string,
  Record<string, string>
> = {
  en: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name.placeholder":
      "Enter name...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug.placeholder":
      "auto-generated-url-slug",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName.placeholder":
      "Enter trigger event name...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType.placeholder":
      "Enter target content type (uid)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic.placeholder":
      "Enter broadcast topic...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels.placeholder":
      "Enter delivery channels...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active.placeholder":
      "Enter active...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority.placeholder":
      "Enter priority...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate.placeholder":
      "Enter subject template...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate.placeholder":
      "Enter plain text body template...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate.placeholder":
      "Enter html body template...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate.placeholder":
      "Enter cta button label template...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate.placeholder":
      "Enter cta url template...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations.placeholder":
      "Enter localized translations...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt.placeholder":
      "Enter last triggered at...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount.placeholder":
      "Enter total trigger count...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId.placeholder":
      "Enter document id...",
    "content-manager.content-types.plugin::broadcasts.campaign.title.placeholder":
      "Enter title...",
    "content-manager.content-types.plugin::broadcasts.campaign.slug.placeholder":
      "auto-generated-url-slug",
    "content-manager.content-types.plugin::broadcasts.campaign.topic.placeholder":
      "Enter broadcast topic...",
    "content-manager.content-types.plugin::broadcasts.campaign.channels.placeholder":
      "Enter delivery channels...",
    "content-manager.content-types.plugin::broadcasts.campaign.priority.placeholder":
      "Enter priority...",
    "content-manager.content-types.plugin::broadcasts.campaign.status.placeholder":
      "Enter status...",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt.placeholder":
      "Enter scheduled send date & time...",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt.placeholder":
      "Enter sent date & time...",
    "content-manager.content-types.plugin::broadcasts.campaign.subject.placeholder":
      "Enter message subject...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText.placeholder":
      "Enter plain text message...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml.placeholder":
      "Enter html message content...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel.placeholder":
      "Enter call-to-action button label...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef.placeholder":
      "Enter email designer template reference...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName.placeholder":
      "Enter whatsapp approved template name...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds.placeholder":
      "e.g., 120363025891234567@g.us",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId.placeholder":
      "e.g., @MezquitaCentralBogota or -1001234567890",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId.placeholder":
      "Enter telegram topic / thread id...",
    "content-manager.content-types.plugin::broadcasts.campaign.translations.placeholder":
      "Enter localized translations...",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate.placeholder":
      "e.g., 15 Ramadan 1447 AH",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel.placeholder":
      "e.g., 15 Ramadan 1447 AH",
    "content-manager.content-types.plugin::broadcasts.campaign.stats.placeholder":
      "Enter delivery statistics...",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata.placeholder":
      "Enter additional metadata (json)...",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId.placeholder":
      "Enter document id...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey.placeholder":
      "Enter idempotency key...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug.placeholder":
      "auto-generated-url-slug",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel.placeholder":
      "Enter delivery channel...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver.placeholder":
      "Enter delivery driver / provider...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked.placeholder":
      "Enter masked recipient...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale.placeholder":
      "e.g., es, en, ar, tr",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status.placeholder":
      "Enter status...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId.placeholder":
      "Enter external provider message id...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage.placeholder":
      "Enter error message...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt.placeholder":
      "Enter sent date & time...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel.placeholder":
      "e.g., 15 Ramadan 1447 AH",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId.placeholder":
      "Enter document id...",
  },
  es: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name.placeholder":
      "Ingresa nombre...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug.placeholder":
      "slug-generado-automaticamente",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName.placeholder":
      "Ingresa evento disparador...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType.placeholder":
      "Ingresa tipo de contenido destino (uid)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic.placeholder":
      "Ingresa tema de difusión...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels.placeholder":
      "Ingresa canales de envío...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active.placeholder":
      "Ingresa activo...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority.placeholder":
      "Ingresa prioridad...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate.placeholder":
      "Ingresa plantilla del asunto...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate.placeholder":
      "Ingresa plantilla de texto plano...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate.placeholder":
      "Ingresa plantilla de cuerpo html...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate.placeholder":
      "Ingresa plantilla de texto del botón (cta)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate.placeholder":
      "Ingresa plantilla de enlace del botón (cta)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations.placeholder":
      "Ingresa traducciones localizadas...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt.placeholder":
      "Ingresa última ejecución...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount.placeholder":
      "Ingresa número total de ejecuciones...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId.placeholder":
      "Ingresa id del documento...",
    "content-manager.content-types.plugin::broadcasts.campaign.title.placeholder":
      "Ingresa título...",
    "content-manager.content-types.plugin::broadcasts.campaign.slug.placeholder":
      "slug-generado-automaticamente",
    "content-manager.content-types.plugin::broadcasts.campaign.topic.placeholder":
      "Ingresa tema de difusión...",
    "content-manager.content-types.plugin::broadcasts.campaign.channels.placeholder":
      "Ingresa canales de envío...",
    "content-manager.content-types.plugin::broadcasts.campaign.priority.placeholder":
      "Ingresa prioridad...",
    "content-manager.content-types.plugin::broadcasts.campaign.status.placeholder":
      "Ingresa estado...",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt.placeholder":
      "Ingresa fecha y hora programada de envío...",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt.placeholder":
      "Ingresa fecha y hora de envío...",
    "content-manager.content-types.plugin::broadcasts.campaign.subject.placeholder":
      "Ingresa asunto del mensaje...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText.placeholder":
      "Ingresa mensaje en texto plano...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml.placeholder":
      "Ingresa contenido html del mensaje...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel.placeholder":
      "Ingresa texto del botón de acción (cta)...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef.placeholder":
      "Ingresa referencia de plantilla de correo...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName.placeholder":
      "Ingresa nombre de plantilla de whatsapp...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds.placeholder":
      "ej., 120363025891234567@g.us",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId.placeholder":
      "ej., @MezquitaCentralBogota o -1001234567890",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId.placeholder":
      "Ingresa id de hilo / tema de telegram...",
    "content-manager.content-types.plugin::broadcasts.campaign.translations.placeholder":
      "Ingresa traducciones localizadas...",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate.placeholder":
      "ej., 15 Ramadán 1447 AH",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel.placeholder":
      "ej., 15 Ramadán 1447 AH",
    "content-manager.content-types.plugin::broadcasts.campaign.stats.placeholder":
      "Ingresa estadísticas de entrega...",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata.placeholder":
      "Ingresa metadatos adicionales (json)...",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId.placeholder":
      "Ingresa id del documento...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey.placeholder":
      "Ingresa clave de idempotencia...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug.placeholder":
      "slug-generado-automaticamente",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel.placeholder":
      "Ingresa canal de envío...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver.placeholder":
      "Ingresa proveedor de envío (driver)...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked.placeholder":
      "Ingresa destinatario enmascarado...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale.placeholder":
      "ej., es, en, ar, tr",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status.placeholder":
      "Ingresa estado...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId.placeholder":
      "Ingresa id de mensaje del proveedor externo...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage.placeholder":
      "Ingresa mensaje de error...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt.placeholder":
      "Ingresa fecha y hora de envío...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel.placeholder":
      "ej., 15 Ramadán 1447 AH",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId.placeholder":
      "Ingresa id del documento...",
  },
  ...CM_PLACEHOLDER_TRANSLATIONS_EXTRA,
};
