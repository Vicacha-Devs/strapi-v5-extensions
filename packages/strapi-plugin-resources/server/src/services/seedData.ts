import type { GalleryAlbumCategory, GlossaryCategory, PublicationCategory } from "../../../shared";

export interface SeedPublicationItem {
  locale: string;
  title: string;
  slug: string;
  summary: string;
  category: PublicationCategory;
  authorName: string;
  isbnOrReference: string;
  pageCount: number;
  languageCode: string;
  publishedAtDate: string;
  mediaFolderPath: string;
  featured: boolean;
  allowPublicDownload: boolean;
  externalDownloadUrl: string;
}

export interface SeedGalleryAlbumItem {
  locale: string;
  title: string;
  slug: string;
  description: string;
  category: GalleryAlbumCategory;
  eventDate: string;
  mediaFolderPath: string;
  photographerCredit: string;
  framingNotes: string;
  featured: boolean;
  sortOrder: number;
}

export interface SeedGlossaryTermItem {
  locale: string;
  term: string;
  slug: string;
  nativeScript: string;
  transliteration: string;
  definition: string;
  category: GlossaryCategory;
  letterGroup: string;
  relatedTerms: string[];
  featured: boolean;
}

export const DEFAULT_SEED_PUBLICATIONS: SeedPublicationItem[] = [
  {
    locale: "es",
    title: "Guía de Bienvenida y Etiqueta de Visita a la Mezquita",
    slug: "guia-bienvenida-visita-mezquita",
    summary:
      "Manual ilustrado con recomendaciones de vestimenta, horarios de visita guiada, normas de respeto en la sala de oración y preguntas frecuentes para visitantes y colegios.",
    category: "guide",
    authorName: "Comité Educativo y Cultural",
    isbnOrReference: "PUB-GUI-001",
    pageCount: 16,
    languageCode: "es",
    publishedAtDate: "2026-01-15",
    mediaFolderPath: "/resources/publications",
    featured: true,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/guia-bienvenida-visita-mezquita-es.pdf",
  },
  {
    locale: "es",
    title: "Introducción a los Cinco Pilares del Islam",
    slug: "introduccion-cinco-pilares-islam",
    summary:
      "Compendio introductorio sobre el testimonio de fe (Shahada), la oración (Salah), la caridad purificadora (Zakat), el ayuno de Ramadán (Sawm) y la peregrinación (Hajj).",
    category: "book",
    authorName: "Departamento de Dawah y Publicaciones",
    isbnOrReference: "ISBN-978-958-00-0102-4",
    pageCount: 48,
    languageCode: "es",
    publishedAtDate: "2026-02-01",
    mediaFolderPath: "/resources/publications",
    featured: true,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/introduccion-cinco-pilares-es.pdf",
  },
  {
    locale: "es",
    title: "Dossier de Prensa e Identidad Arquitectónica",
    slug: "dossier-prensa-identidad-arquitectonica",
    summary:
      "Ficha técnica, reseña histórica y lineamientos editoriales para medios de comunicación, investigadores y aliados institucionales.",
    category: "press_kit",
    authorName: "Oficina de Comunicaciones",
    isbnOrReference: "PUB-PRK-003",
    pageCount: 24,
    languageCode: "es",
    publishedAtDate: "2026-02-18",
    mediaFolderPath: "/resources/publications",
    featured: false,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/dossier-prensa-arquitectura-es.pdf",
  },
  {
    locale: "en",
    title: "Mosque Visitor Etiquette & Welcome Guide",
    slug: "mosque-visitor-etiquette-welcome-guide",
    summary:
      "Illustrated visitor handbook covering dress code guidelines, guided tour schedules, prayer hall etiquette, and frequently asked questions for guests and schools.",
    category: "guide",
    authorName: "Educational & Cultural Committee",
    isbnOrReference: "PUB-GUI-001-EN",
    pageCount: 16,
    languageCode: "en",
    publishedAtDate: "2026-01-15",
    mediaFolderPath: "/resources/publications",
    featured: true,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/mosque-visitor-etiquette-en.pdf",
  },
  {
    locale: "en",
    title: "Understanding the Five Pillars of Islam",
    slug: "understanding-five-pillars-of-islam",
    summary:
      "Foundational reader explaining the Declaration of Faith (Shahada), Daily Prayer (Salah), Almsgiving (Zakat), Fasting in Ramadan (Sawm), and Pilgrimage (Hajj).",
    category: "book",
    authorName: "Department of Outreach & Publications",
    isbnOrReference: "ISBN-978-958-00-0102-4-EN",
    pageCount: 48,
    languageCode: "en",
    publishedAtDate: "2026-02-01",
    mediaFolderPath: "/resources/publications",
    featured: true,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/understanding-five-pillars-en.pdf",
  },
  {
    locale: "ar",
    title: "دليل الزوار وآداب زيارة المسجد",
    slug: "mosque-visitor-guide-ar",
    summary:
      "دليل تعريفي مصور يتضمن إرشادات اللباس، ومواعيد الجولات التعريفية، وآداب قاعة الصلاة، والأسئلة الشائعة للوفود والمدارس.",
    category: "guide",
    authorName: "اللجنة التعليمية والثقافية",
    isbnOrReference: "PUB-GUI-001-AR",
    pageCount: 16,
    languageCode: "ar",
    publishedAtDate: "2026-01-15",
    mediaFolderPath: "/resources/publications",
    featured: true,
    allowPublicDownload: true,
    externalDownloadUrl: "/media/resources/mosque-visitor-guide-ar.pdf",
  },
];

export const DEFAULT_SEED_GALLERY_ALBUMS: SeedGalleryAlbumItem[] = [
  {
    locale: "es",
    title: "Arquitectura, Cúpula Caligráfica y Mihrab",
    slug: "arquitectura-cupula-caligrafica-mihrab",
    description:
      "Recorrido visual por la geometría sagrada, el minarete, la cúpula central y los detalles en madera tallada de la sala principal de oración.",
    category: "architecture",
    eventDate: "2026-01-20",
    mediaFolderPath: "/resources/galleries/architecture",
    photographerCredit: "Archivo Fotográfico Institucional",
    framingNotes: "Respeto a la privacidad de los asistentes; enfoque arquitectónico.",
    featured: true,
    sortOrder: 1,
  },
  {
    locale: "es",
    title: "Iftar Comunitario y Noches de Ramadán",
    slug: "iftar-comunitario-noches-ramadan",
    description:
      "Jornadas de ruptura del ayuno, hospitalidad interreligiosa y encuentros familiares durante el mes sagrado de Ramadán.",
    category: "ramadan_eid",
    eventDate: "2026-03-10",
    mediaFolderPath: "/resources/galleries/ramadan",
    photographerCredit: "Comité de Medios",
    framingNotes: "Planos generales de hospitalidad y servicio comunitario.",
    featured: true,
    sortOrder: 2,
  },
  {
    locale: "en",
    title: "Architecture, Calligraphic Dome & Mihrab",
    slug: "architecture-calligraphic-dome-mihrab",
    description:
      "Visual tour across the sacred geometry, minaret, central dome, and hand-carved woodwork of the main prayer hall.",
    category: "architecture",
    eventDate: "2026-01-20",
    mediaFolderPath: "/resources/galleries/architecture",
    photographerCredit: "Institutional Photo Archive",
    framingNotes: "Privacy-respecting architectural framing.",
    featured: true,
    sortOrder: 1,
  },
  {
    locale: "ar",
    title: "العمارة الإسلامية والقبة الخطية والمحراب",
    slug: "islamic-architecture-dome-mihrab-ar",
    description:
      "جولة بصرية تستعرض الهندسة الإسلامية، والمئذنة، والقبة المركزية، والزخارف الخشبية في قاعة الصلاة الرئيسية.",
    category: "architecture",
    eventDate: "2026-01-20",
    mediaFolderPath: "/resources/galleries/architecture",
    photographerCredit: "الأرشيف الفوتوغرافي للمركز",
    framingNotes: "تصوير معماري يحترم خصوصية المصلين.",
    featured: true,
    sortOrder: 1,
  },
];

export const DEFAULT_SEED_GLOSSARY_TERMS: SeedGlossaryTermItem[] = [
  {
    locale: "es",
    term: "Adhan",
    slug: "adhan",
    nativeScript: "أَذَان",
    transliteration: "Adhān",
    definition:
      "El llamado público a la oración islámica proclamado cinco veces al día desde la mezquita para convocar a los creyentes al Salah.",
    category: "worship",
    letterGroup: "A",
    relatedTerms: ["Salah", "Iqamah", "Minarete"],
    featured: true,
  },
  {
    locale: "es",
    term: "Jumuah",
    slug: "jumuah",
    nativeScript: "جُمُعَة",
    transliteration: "Jumu'ah",
    definition:
      "La oración congregacional del viernes al mediodía, precedida por el sermón (Jutba) pronunciado desde el Minbar.",
    category: "worship",
    letterGroup: "J",
    relatedTerms: ["Khutbah", "Minbar", "Salah"],
    featured: true,
  },
  {
    locale: "es",
    term: "Mihrab",
    slug: "mihrab",
    nativeScript: "مِحْرَاب",
    transliteration: "Miḥrāb",
    definition:
      "Nicho arquitectónico en el muro principal de la sala de oración que señala la Qibla (la dirección hacia la Kaaba en La Meca).",
    category: "community",
    letterGroup: "M",
    relatedTerms: ["Qibla", "Minbar"],
    featured: true,
  },
  {
    locale: "es",
    term: "Zakat",
    slug: "zakat",
    nativeScript: "زَكَاة",
    transliteration: "Zakāh",
    definition:
      "Tercer pilar del Islam: contribución anual obligatoria del 2.5% sobre el patrimonio ahorrado que supera el umbral mínimo (Nisab), destinada al bienestar social.",
    category: "ethics",
    letterGroup: "Z",
    relatedTerms: ["Sadaqah", "Nisab"],
    featured: true,
  },
  {
    locale: "en",
    term: "Adhan",
    slug: "adhan-en",
    nativeScript: "أَذَان",
    transliteration: "Adhān",
    definition:
      "The Islamic call to prayer recited five times daily to announce the time for obligatory congregational prayer (Salah).",
    category: "worship",
    letterGroup: "A",
    relatedTerms: ["Salah", "Iqamah"],
    featured: true,
  },
  {
    locale: "en",
    term: "Mihrab",
    slug: "mihrab-en",
    nativeScript: "مِحْرَاب",
    transliteration: "Miḥrāb",
    definition:
      "Semicircular architectural niche in the wall of a mosque indicating the Qibla direction toward Mecca.",
    category: "community",
    letterGroup: "M",
    relatedTerms: ["Qibla", "Minbar"],
    featured: true,
  },
  {
    locale: "ar",
    term: "أذان",
    slug: "adhan-ar",
    nativeScript: "أَذَان",
    transliteration: "Adhān",
    definition: "النداء الشرعي للإعلام بدخول وقت الصلاة المفروضة خمس مرات في اليوم والليلة.",
    category: "worship",
    letterGroup: "#",
    relatedTerms: ["صلاة", "إقامة"],
    featured: true,
  },
];
