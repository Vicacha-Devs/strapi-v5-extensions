export const CM_PLACEHOLDER_TRANSLATIONS_EXTRA: Record<
  string,
  Record<string, string>
> = {
  ar: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name.placeholder":
      "أدخل الاسم...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug.placeholder":
      "معرف-الرابط-التلقائي",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName.placeholder":
      "أدخل اسم الحدث المشغل...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType.placeholder":
      "أدخل نوع المحتوى المستهدف (UID)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic.placeholder":
      "أدخل موضوع البث...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels.placeholder":
      "أدخل قنوات الإرسال...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active.placeholder":
      "أدخل نشط...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority.placeholder":
      "أدخل الأولوية...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate.placeholder":
      "أدخل قالب عنوان الرسالة...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate.placeholder":
      "أدخل قالب النص العادي...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate.placeholder":
      "أدخل قالب نص HTML...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate.placeholder":
      "أدخل قالب نص زر الإجراء (CTA)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate.placeholder":
      "أدخل قالب رابط زر الإجراء (CTA)...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations.placeholder":
      "أدخل الترجمات المحلية...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt.placeholder":
      "أدخل تاريخ آخر تشغيل...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount.placeholder":
      "أدخل إجمالي مرات التشغيل...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId.placeholder":
      "أدخل معرف المستند...",
    "content-manager.content-types.plugin::broadcasts.campaign.title.placeholder":
      "أدخل العنوان...",
    "content-manager.content-types.plugin::broadcasts.campaign.slug.placeholder":
      "معرف-الرابط-التلقائي",
    "content-manager.content-types.plugin::broadcasts.campaign.topic.placeholder":
      "أدخل موضوع البث...",
    "content-manager.content-types.plugin::broadcasts.campaign.channels.placeholder":
      "أدخل قنوات الإرسال...",
    "content-manager.content-types.plugin::broadcasts.campaign.priority.placeholder":
      "أدخل الأولوية...",
    "content-manager.content-types.plugin::broadcasts.campaign.status.placeholder":
      "أدخل الحالة...",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt.placeholder":
      "أدخل تاريخ ووقت الإرسال المجدول...",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt.placeholder":
      "أدخل تاريخ ووقت الإرسال الفعلي...",
    "content-manager.content-types.plugin::broadcasts.campaign.subject.placeholder":
      "أدخل عنوان الرسالة...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText.placeholder":
      "أدخل نص الرسالة العادي...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml.placeholder":
      "أدخل محتوى الرسالة بصيغة HTML...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel.placeholder":
      "أدخل نص زر الإجراء (CTA)...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef.placeholder":
      "أدخل مرجع قالب البريد الإلكتروني...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName.placeholder":
      "أدخل اسم قالب واتساب المعتمد...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds.placeholder":
      "مثال: 120363025891234567@g.us",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId.placeholder":
      "مثال: @MezquitaCentralBogota أو -1001234567890",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId.placeholder":
      "أدخل معرف موضوع تيليغرام (Thread ID)...",
    "content-manager.content-types.plugin::broadcasts.campaign.translations.placeholder":
      "أدخل الترجمات المحلية...",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate.placeholder":
      "مثال: ١٥ رمضان ١٤٤٧ هـ",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel.placeholder":
      "مثال: ١٥ رمضان ١٤٤٧ هـ",
    "content-manager.content-types.plugin::broadcasts.campaign.stats.placeholder":
      "أدخل إحصائيات التسليم...",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata.placeholder":
      "أدخل بيانات وصفية إضافية (JSON)...",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId.placeholder":
      "أدخل معرف المستند...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey.placeholder":
      "أدخل مفتاح منع التكرار (Idempotency)...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug.placeholder":
      "معرف-الرابط-التلقائي",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel.placeholder":
      "أدخل قناة الإرسال...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver.placeholder":
      "أدخل مزود خدمة الإرسال...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked.placeholder":
      "أدخل المستلم المخفي جزئياً...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale.placeholder":
      "مثال: ar، es، en",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status.placeholder":
      "أدخل الحالة...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId.placeholder":
      "أدخل معرف الرسالة لدى المزود الخارجي...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage.placeholder":
      "أدخل رسالة الخطأ...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt.placeholder":
      "أدخل تاريخ ووقت الإرسال الفعلي...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel.placeholder":
      "مثال: ١٥ رمضان ١٤٤٧ هـ",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId.placeholder":
      "أدخل معرف المستند...",
  },
  tr: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name.placeholder":
      "Ad girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug.placeholder":
      "otomatik-url-kisa-adi",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName.placeholder":
      "Tetikleyici Olay Adı girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType.placeholder":
      "Hedef İçerik Türü (UID) girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic.placeholder":
      "Yayın Konusu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels.placeholder":
      "Gönderim Kanalları girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active.placeholder":
      "Aktif girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority.placeholder":
      "Öncelik girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate.placeholder":
      "Konu Başlığı Şablonu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate.placeholder":
      "Düz Metin Şablonu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate.placeholder":
      "HTML Gövde Şablonu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate.placeholder":
      "Eylem Düğmesi (CTA) Etiket Şablonu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate.placeholder":
      "Eylem Düğmesi (CTA) Bağlantı Şablonu girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations.placeholder":
      "Yerelleştirilmiş Çeviriler girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt.placeholder":
      "Son Tetiklenme Zamanı girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount.placeholder":
      "Toplam Tetiklenme Sayısı girin...",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId.placeholder":
      "Belge Kimliği (ID) girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.title.placeholder":
      "Başlık girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.slug.placeholder":
      "otomatik-url-kisa-adi",
    "content-manager.content-types.plugin::broadcasts.campaign.topic.placeholder":
      "Yayın Konusu girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.channels.placeholder":
      "Gönderim Kanalları girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.priority.placeholder":
      "Öncelik girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.status.placeholder":
      "Durum girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt.placeholder":
      "Planlanan Gönderim Tarihi ve Saati girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt.placeholder":
      "Gönderilme Tarihi ve Saati girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.subject.placeholder":
      "Mesaj Konusu girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText.placeholder":
      "Düz Metin Mesajı girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml.placeholder":
      "HTML Mesaj İçeriği girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel.placeholder":
      "Eylem Çağrısı (CTA) Düğme Metni girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl.placeholder":
      "https://...",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef.placeholder":
      "E-posta Şablonu Referansı girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName.placeholder":
      "WhatsApp Onaylı Şablon Adı girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds.placeholder":
      "örn., 120363025891234567@g.us",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId.placeholder":
      "örn., @MezquitaCentralBogota veya -1001234567890",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId.placeholder":
      "Telegram Konu / Başlık Kimliği girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.translations.placeholder":
      "Yerelleştirilmiş Çeviriler girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate.placeholder":
      "örn., 15 Ramazan 1447 H",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel.placeholder":
      "örn., 15 Ramazan 1447 H",
    "content-manager.content-types.plugin::broadcasts.campaign.stats.placeholder":
      "Teslimat İstatistikleri girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata.placeholder":
      "Ek Meta Veriler (JSON) girin...",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId.placeholder":
      "Belge Kimliği (ID) girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey.placeholder":
      "Tekillik Anahtarı (Idempotency Key) girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug.placeholder":
      "otomatik-url-kisa-adi",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel.placeholder":
      "Gönderim Kanalı girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver.placeholder":
      "Gönderim Sağlayıcısı (Sürücü) girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked.placeholder":
      "Maskelenmiş Alıcı girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale.placeholder":
      "örn., tr, es, en",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status.placeholder":
      "Durum girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId.placeholder":
      "Harici Sağlayıcı Mesaj Kimliği girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage.placeholder":
      "Hata Mesajı girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt.placeholder":
      "Gönderilme Tarihi ve Saati girin...",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel.placeholder":
      "örn., 15 Ramazan 1447 H",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId.placeholder":
      "Belge Kimliği (ID) girin...",
  },
};
