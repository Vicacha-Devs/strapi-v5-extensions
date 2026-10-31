import type { ChecklistItem, FormField, FormRecord } from "./types";

export interface FormStarterTemplate {
  id: string;
  name: string;
  description: string;
  form: Omit<FormRecord, "documentId" | "submissionCount">;
}

export const STARTER_FORM_TEMPLATES: readonly FormStarterTemplate[] = [
  {
    id: "general-contact",
    name: "General Contact & Inquiry",
    description: "Multi-language contact form with subject routing and anti-spam protection.",
    form: {
      title: "General Contact",
      slug: "general-contact",
      description: "Send us a message and our team will respond promptly.",
      category: "contact",
      active: true,
      publishedAt: "2026-01-01T00:00:00.000Z",
      translations: {
        es: {
          title: "Contacto General",
          description: "Envíanos un mensaje y nuestro equipo te responderá pronto.",
          submitButtonLabel: "Enviar mensaje",
          successMessage: "Gracias por contactarnos. Hemos recibido tu mensaje.",
        },
        en: {
          title: "General Contact",
          description: "Send us a message and our team will respond promptly.",
          submitButtonLabel: "Send message",
          successMessage: "Thank you for reaching out. We have received your message.",
        },
        ar: {
          title: "الاتصال العام",
          description: "أرسل لنا رسالة وسيرد فريقنا في أقرب وقت.",
          submitButtonLabel: "إرسال الرسالة",
          successMessage: "شكراً لتواصلك معنا. لقد استلمنا رسالتك.",
        },
      },
      fields: [
        {
          id: "fld_full_name",
          type: "text",
          name: "fullName",
          label: "Full Name",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Nombre completo",
            en: "Full Name",
            ar: "الاسم الكامل",
          },
          validation: [{ type: "minLength", value: 2 }],
        },
        {
          id: "fld_email",
          type: "email",
          name: "email",
          label: "Email Address",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Correo electrónico",
            en: "Email Address",
            ar: "البريد الإلكتروني",
          },
        },
        {
          id: "fld_phone",
          type: "phone",
          name: "phone",
          label: "Phone / WhatsApp",
          required: false,
          width: "half",
          localizedLabels: {
            es: "Teléfono / WhatsApp",
            en: "Phone / WhatsApp",
            ar: "الهاتف / واتساب",
          },
        },
        {
          id: "fld_subject",
          type: "select",
          name: "subject",
          label: "Subject",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Asunto",
            en: "Subject",
            ar: "الموضوع",
          },
          options: [
            {
              value: "general",
              label: "General Inquiry",
              localizedLabels: { es: "Consulta general", en: "General Inquiry", ar: "استفسار عام" },
            },
            {
              value: "visit",
              label: "Guided Visit",
              localizedLabels: { es: "Visita guiada", en: "Guided Visit", ar: "زيارة إرشادية" },
            },
            {
              value: "support",
              label: "Support & Assistance",
              localizedLabels: {
                es: "Apoyo y asistencia",
                en: "Support & Assistance",
                ar: "الدعم والمساعدة",
              },
            },
          ],
        },
        {
          id: "fld_message",
          type: "textarea",
          name: "message",
          label: "Message",
          required: true,
          width: "full",
          localizedLabels: {
            es: "Mensaje",
            en: "Message",
            ar: "الرسالة",
          },
          validation: [
            { type: "minLength", value: 10 },
            { type: "maxLength", value: 2000 },
          ],
        },
      ],
      settings: {
        honeypotField: "_website_url",
        rateLimitPerHour: 15,
        captchaProvider: "none",
        defaultPriority: "normal",
        department: "general",
      },
    },
  },
  {
    id: "service-desk-application",
    name: "Service-Desk Casework & Document Checklist",
    description:
      "Casework intake form with document verification checklist, booking bridge, and certificate bridge.",
    form: {
      title: "Formal Service Request",
      slug: "service-request",
      description: "Submit an official service application and required supporting documents.",
      category: "service_desk",
      active: true,
      publishedAt: "2026-01-01T00:00:00.000Z",
      translations: {
        es: {
          title: "Solicitud Formal de Servicio",
          description: "Envía una solicitud oficial de servicio con los documentos requeridos.",
          submitButtonLabel: "Radicar solicitud",
          successMessage: "Tu solicitud ha sido radicada con éxito.",
        },
        en: {
          title: "Formal Service Request",
          description: "Submit an official service application and required supporting documents.",
          submitButtonLabel: "Submit application",
          successMessage: "Your application has been registered.",
        },
        ar: {
          title: "طلب خدمة رسمي",
          description: "قدم طلب خدمة رسمي مع المستندات المطلوبة.",
          submitButtonLabel: "تقديم الطلب",
          successMessage: "تم تسجيل طلبك بنجاح.",
        },
      },
      fields: [
        {
          id: "fld_applicant_name",
          type: "text",
          name: "applicantName",
          label: "Applicant Full Name",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Nombre completo del solicitante",
            en: "Applicant Full Name",
            ar: "الاسم الكامل لمقدم الطلب",
          },
        },
        {
          id: "fld_applicant_email",
          type: "email",
          name: "applicantEmail",
          label: "Applicant Email",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Correo del solicitante",
            en: "Applicant Email",
            ar: "البريد الإلكتروني لمقدم الطلب",
          },
        },
        {
          id: "fld_applicant_phone",
          type: "phone",
          name: "applicantPhone",
          label: "Contact Phone",
          required: true,
          width: "half",
          localizedLabels: {
            es: "Teléfono de contacto",
            en: "Contact Phone",
            ar: "هاتف الاتصال",
          },
        },
        {
          id: "fld_preferred_date",
          type: "date",
          name: "preferredDate",
          label: "Preferred Appointment Date",
          required: false,
          width: "half",
          localizedLabels: {
            es: "Fecha preferida de cita",
            en: "Preferred Appointment Date",
            ar: "تاريخ الموعد المفضل",
          },
        },
        {
          id: "fld_details",
          type: "textarea",
          name: "details",
          label: "Case Details & Notes",
          required: true,
          width: "full",
          localizedLabels: {
            es: "Detalles del caso y observaciones",
            en: "Case Details & Notes",
            ar: "تفاصيل الطلب والملاحظات",
          },
        },
      ],
      checklistTemplate: [
        {
          id: "chk_id_document",
          label: "Government ID / Passport Copy",
          required: true,
          verified: false,
          localizedLabels: {
            es: "Copia de documento de identidad / Pasaporte",
            en: "Government ID / Passport Copy",
            ar: "نسخة من بطاقة الهوية أو جواز السفر",
          },
        },
        {
          id: "chk_supporting_form",
          label: "Signed Application Form",
          required: true,
          verified: false,
          localizedLabels: {
            es: "Formulario de solicitud firmado",
            en: "Signed Application Form",
            ar: "نموذج الطلب الموقع",
          },
        },
      ],
      settings: {
        honeypotField: "_website_url",
        rateLimitPerHour: 10,
        captchaProvider: "none",
        enableBookingBridge: true,
        enableCertificateBridge: true,
        defaultPriority: "normal",
        department: "services",
      },
    },
  },
];

export function localizeFormForLocale(form: FormRecord, locale: string): FormRecord {
  const tr = form.translations?.[locale];
  const localizedFields: FormField[] = (form.fields || []).map((field) => ({
    ...field,
    label: field.localizedLabels?.[locale] || field.label,
    placeholder: field.localizedPlaceholders?.[locale] || field.placeholder,
    helpText: field.localizedHelpTexts?.[locale] || field.helpText,
    options: field.options?.map((opt) => ({
      ...opt,
      label: opt.localizedLabels?.[locale] || opt.label,
    })),
  }));

  const localizedChecklist: ChecklistItem[] | undefined = form.checklistTemplate?.map((item) => ({
    ...item,
    label: item.localizedLabels?.[locale] || item.label,
  }));

  return {
    ...form,
    title: tr?.title || form.title,
    description: tr?.description || form.description,
    fields: localizedFields,
    checklistTemplate: localizedChecklist,
    settings: {
      ...form.settings,
      submitButtonLabel:
        tr?.submitButtonLabel ||
        form.settings?.localizedSubmitLabels?.[locale] ||
        form.settings?.submitButtonLabel,
      successMessage:
        tr?.successMessage ||
        form.settings?.localizedSuccessMessages?.[locale] ||
        form.settings?.successMessage,
    },
  };
}
