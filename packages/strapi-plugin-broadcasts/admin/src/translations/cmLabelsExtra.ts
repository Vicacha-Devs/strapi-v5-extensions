export const CM_LABEL_TRANSLATIONS_EXTRA: Record<
  string,
  Record<string, string>
> = {
  ar: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name":
      "الاسم",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug":
      "المسار المختصر (Slug)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName":
      "اسم الحدث المشغل",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType":
      "نوع المحتوى المستهدف (UID)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic":
      "موضوع البث",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels":
      "قنوات الإرسال",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active":
      "نشط",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority":
      "الأولوية",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate":
      "قالب عنوان الرسالة",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate":
      "قالب النص العادي",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate":
      "قالب نص HTML",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate":
      "قالب نص زر الإجراء (CTA)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate":
      "قالب رابط زر الإجراء (CTA)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations":
      "الترجمات المحلية",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt":
      "تاريخ آخر تشغيل",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount":
      "إجمالي مرات التشغيل",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId":
      "معرف المستند",
    "content-manager.content-types.plugin::broadcasts.campaign.title":
      "العنوان",
    "content-manager.content-types.plugin::broadcasts.campaign.slug":
      "المسار المختصر (Slug)",
    "content-manager.content-types.plugin::broadcasts.campaign.topic":
      "موضوع البث",
    "content-manager.content-types.plugin::broadcasts.campaign.channels":
      "قنوات الإرسال",
    "content-manager.content-types.plugin::broadcasts.campaign.priority":
      "الأولوية",
    "content-manager.content-types.plugin::broadcasts.campaign.status":
      "الحالة",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt":
      "تاريخ ووقت الإرسال المجدول",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt":
      "تاريخ ووقت الإرسال الفعلي",
    "content-manager.content-types.plugin::broadcasts.campaign.subject":
      "عنوان الرسالة",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText":
      "نص الرسالة العادي",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml":
      "محتوى الرسالة بصيغة HTML",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel":
      "نص زر الإجراء (CTA)",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl":
      "رابط زر الإجراء (CTA)",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl":
      "رابط الوسائط المرفقة",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef":
      "مرجع قالب البريد الإلكتروني",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName":
      "اسم قالب واتساب المعتمد",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds":
      "معرفات مجموعات وقنوات واتساب",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId":
      "معرف قناة أو مجموعة تيليغرام",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId":
      "معرف موضوع تيليغرام (Thread ID)",
    "content-manager.content-types.plugin::broadcasts.campaign.translations":
      "الترجمات المحلية",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate":
      "التاريخ الإضافي",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel":
      "تسمية التاريخ الإضافي",
    "content-manager.content-types.plugin::broadcasts.campaign.stats":
      "إحصائيات التسليم",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata":
      "بيانات وصفية إضافية (JSON)",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId":
      "معرف المستند",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey":
      "مفتاح منع التكرار (Idempotency)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug":
      "معرف الحملة (Slug)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel":
      "قناة الإرسال",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver":
      "مزود خدمة الإرسال",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked":
      "المستلم المخفي جزئياً",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale":
      "اللغة (Locale)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status":
      "الحالة",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId":
      "معرف الرسالة لدى المزود الخارجي",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage":
      "رسالة الخطأ",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt":
      "تاريخ ووقت الإرسال الفعلي",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel":
      "تسمية التاريخ الإضافي",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId":
      "معرف المستند",
    "content-manager.enum.scheduled": "مجدول",
    "content-manager.enum.cancelled": "ملغى",
    "content-manager.enum.whatsapp": "واتساب (WhatsApp)",
    "content-manager.enum.sent": "تم الإرسال",
    "content-manager.enum.low": "منخفضة",
    "content-manager.enum.normal": "عادية",
    "content-manager.enum.high": "عالية",
    "content-manager.enum.urgent": "عاجلة",
    "content-manager.enum.draft": "مسودة",
    "content-manager.enum.sending": "جاري الإرسال",
    "content-manager.enum.failed": "فشل الإرسال",
    "content-manager.enum.email": "البريد الإلكتروني",
    "content-manager.enum.telegram": "تيليغرام (Telegram)",
    "content-manager.enum.simulated": "محاكاة (تجريبي)",
    "content-manager.enum.skipped_duplicate": "تم التخطي (مكرر)",
  },
  tr: {
    "content-manager.content-types.plugin::broadcasts.automation-rule.name":
      "Ad",
    "content-manager.content-types.plugin::broadcasts.automation-rule.slug":
      "Kısa Ad (URL Slug)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.eventName":
      "Tetikleyici Olay Adı",
    "content-manager.content-types.plugin::broadcasts.automation-rule.targetContentType":
      "Hedef İçerik Türü (UID)",
    "content-manager.content-types.plugin::broadcasts.automation-rule.topic":
      "Yayın Konusu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.channels":
      "Gönderim Kanalları",
    "content-manager.content-types.plugin::broadcasts.automation-rule.active":
      "Aktif",
    "content-manager.content-types.plugin::broadcasts.automation-rule.priority":
      "Öncelik",
    "content-manager.content-types.plugin::broadcasts.automation-rule.subjectTemplate":
      "Konu Başlığı Şablonu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyTextTemplate":
      "Düz Metin Şablonu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.bodyHtmlTemplate":
      "HTML Gövde Şablonu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaLabelTemplate":
      "Eylem Düğmesi (CTA) Etiket Şablonu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.ctaUrlTemplate":
      "Eylem Düğmesi (CTA) Bağlantı Şablonu",
    "content-manager.content-types.plugin::broadcasts.automation-rule.translations":
      "Yerelleştirilmiş Çeviriler",
    "content-manager.content-types.plugin::broadcasts.automation-rule.lastTriggeredAt":
      "Son Tetiklenme Zamanı",
    "content-manager.content-types.plugin::broadcasts.automation-rule.triggerCount":
      "Toplam Tetiklenme Sayısı",
    "content-manager.content-types.plugin::broadcasts.automation-rule.documentId":
      "Belge Kimliği (ID)",
    "content-manager.content-types.plugin::broadcasts.campaign.title": "Başlık",
    "content-manager.content-types.plugin::broadcasts.campaign.slug":
      "Kısa Ad (URL Slug)",
    "content-manager.content-types.plugin::broadcasts.campaign.topic":
      "Yayın Konusu",
    "content-manager.content-types.plugin::broadcasts.campaign.channels":
      "Gönderim Kanalları",
    "content-manager.content-types.plugin::broadcasts.campaign.priority":
      "Öncelik",
    "content-manager.content-types.plugin::broadcasts.campaign.status": "Durum",
    "content-manager.content-types.plugin::broadcasts.campaign.scheduledAt":
      "Planlanan Gönderim Tarihi ve Saati",
    "content-manager.content-types.plugin::broadcasts.campaign.sentAt":
      "Gönderilme Tarihi ve Saati",
    "content-manager.content-types.plugin::broadcasts.campaign.subject":
      "Mesaj Konusu",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyText":
      "Düz Metin Mesajı",
    "content-manager.content-types.plugin::broadcasts.campaign.bodyHtml":
      "HTML Mesaj İçeriği",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaLabel":
      "Eylem Çağrısı (CTA) Düğme Metni",
    "content-manager.content-types.plugin::broadcasts.campaign.ctaUrl":
      "Eylem Çağrısı (CTA) Bağlantısı",
    "content-manager.content-types.plugin::broadcasts.campaign.mediaUrl":
      "Ekli Medya Bağlantısı (URL)",
    "content-manager.content-types.plugin::broadcasts.campaign.emailTemplateRef":
      "E-posta Şablonu Referansı",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappTemplateName":
      "WhatsApp Onaylı Şablon Adı",
    "content-manager.content-types.plugin::broadcasts.campaign.whatsappGroupIds":
      "WhatsApp Grup ve Kanal Kimlikleri (JID)",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramChatId":
      "Telegram Kanal veya Grup Kimliği",
    "content-manager.content-types.plugin::broadcasts.campaign.telegramThreadId":
      "Telegram Konu / Başlık Kimliği",
    "content-manager.content-types.plugin::broadcasts.campaign.translations":
      "Yerelleştirilmiş Çeviriler",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDate":
      "İkincil Takvim Tarihi",
    "content-manager.content-types.plugin::broadcasts.campaign.secondaryDateLabel":
      "İkincil Tarih Etiketi",
    "content-manager.content-types.plugin::broadcasts.campaign.stats":
      "Teslimat İstatistikleri",
    "content-manager.content-types.plugin::broadcasts.campaign.metadata":
      "Ek Meta Veriler (JSON)",
    "content-manager.content-types.plugin::broadcasts.campaign.documentId":
      "Belge Kimliği (ID)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.idempotencyKey":
      "Tekillik Anahtarı (Idempotency Key)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.campaignSlug":
      "Kampanya Kısa Adı (Slug)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.channel":
      "Gönderim Kanalı",
    "content-manager.content-types.plugin::broadcasts.delivery-log.driver":
      "Gönderim Sağlayıcısı (Sürücü)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.recipientMasked":
      "Maskelenmiş Alıcı",
    "content-manager.content-types.plugin::broadcasts.delivery-log.locale":
      "Dil (Locale)",
    "content-manager.content-types.plugin::broadcasts.delivery-log.status":
      "Durum",
    "content-manager.content-types.plugin::broadcasts.delivery-log.externalMessageId":
      "Harici Sağlayıcı Mesaj Kimliği",
    "content-manager.content-types.plugin::broadcasts.delivery-log.errorMessage":
      "Hata Mesajı",
    "content-manager.content-types.plugin::broadcasts.delivery-log.sentAt":
      "Gönderilme Tarihi ve Saati",
    "content-manager.content-types.plugin::broadcasts.delivery-log.secondaryDateLabel":
      "İkincil Tarih Etiketi",
    "content-manager.content-types.plugin::broadcasts.delivery-log.documentId":
      "Belge Kimliği (ID)",
    "content-manager.enum.scheduled": "Planlandı",
    "content-manager.enum.cancelled": "İptal Edildi",
    "content-manager.enum.whatsapp": "WhatsApp",
    "content-manager.enum.sent": "Gönderildi",
    "content-manager.enum.low": "Düşük",
    "content-manager.enum.normal": "Normal",
    "content-manager.enum.high": "Yüksek",
    "content-manager.enum.urgent": "Acil",
    "content-manager.enum.draft": "Taslak",
    "content-manager.enum.sending": "Gönderiliyor",
    "content-manager.enum.failed": "Başarısız",
    "content-manager.enum.email": "E-posta",
    "content-manager.enum.telegram": "Telegram",
    "content-manager.enum.simulated": "Simüle Edildi",
    "content-manager.enum.skipped_duplicate": "Atlandı (Mükerrer)",
  },
};
