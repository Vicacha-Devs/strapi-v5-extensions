import type {
  AsmaUlHusnaItem,
  CuratedAyahItem,
  CuratedDuaItem,
  CuratedHadithItem,
  DailyInspirationBundle,
  DailyInspirationPins,
  LocalizedStringMap,
  SupportedLocale,
  SurahMetadata,
  TasbihPresetItem,
} from './types';

// Compact 114 Surah tuples: [number, nameAr, transliteration, en, es, tr, revelationType ('M'|'D'), ayahCount, juzStart]
const RAW_SURAH_TUPLES: Array<
  [number, string, string, string, string, string, 'M' | 'D', number, number]
> = [
  [1, 'الفاتحة', 'Al-Fatihah', 'The Opening', 'La Apertura', 'Fâtiha', 'M', 7, 1],
  [2, 'البقرة', 'Al-Baqarah', 'The Cow', 'La Vaca', 'Bakara', 'D', 286, 1],
  [3, 'آل عمران', "Ali 'Imran", 'Family of Imran', 'La Familia de Imrán', 'Âl-i İmrân', 'D', 200, 3],
  [4, 'النساء', 'An-Nisa', 'The Women', 'Las Mujeres', 'Nisâ', 'D', 176, 4],
  [5, 'المائدة', "Al-Ma'idah", 'The Table Spread', 'La Mesa Servida', 'Mâide', 'D', 120, 6],
  [6, 'الأنعام', "Al-An'am", 'The Cattle', 'Los Rebaños', "En'âm", 'M', 165, 7],
  [7, 'الأعراف', "Al-A'raf", 'The Heights', 'Los Lugares Elevados', "A'râf", 'M', 206, 8],
  [8, 'الأنفال', 'Al-Anfal', 'The Spoils of War', 'El Botín', 'Enfâl', 'D', 75, 9],
  [9, 'التوبة', 'At-Tawbah', 'The Repentance', 'El Arrepentimiento', 'Tevbe', 'D', 129, 10],
  [10, 'يونس', 'Yunus', 'Jonah', 'Jonás', 'Yûnus', 'M', 109, 11],
  [11, 'هود', 'Hud', 'Hud', 'Hud', 'Hûd', 'M', 123, 11],
  [12, 'يوسف', 'Yusuf', 'Joseph', 'José', 'Yûsuf', 'M', 111, 12],
  [13, 'الرعد', "Ar-Ra'd", 'The Thunder', 'El Trueno', "Ra'd", 'D', 43, 13],
  [14, 'إبراهيم', 'Ibrahim', 'Abraham', 'Abraham', 'İbrâhîm', 'M', 52, 13],
  [15, 'الحجر', 'Al-Hijr', 'The Rocky Tract', 'Al-Hijr', 'Hicr', 'M', 99, 14],
  [16, 'النحل', 'An-Nahl', 'The Bee', 'Las Abejas', 'Nahl', 'M', 128, 14],
  [17, 'الإسراء', 'Al-Isra', 'The Night Journey', 'El Viaje Nocturno', 'İsrâ', 'M', 111, 15],
  [18, 'الكهف', 'Al-Kahf', 'The Cave', 'La Caverna', 'Kehf', 'M', 110, 15],
  [19, 'مريم', 'Maryam', 'Mary', 'María', 'Meryem', 'M', 98, 16],
  [20, 'طه', 'Taha', 'Ta-Ha', 'Ta-Ha', 'Tâhâ', 'M', 135, 16],
  [21, 'الأنبياء', 'Al-Anbiya', 'The Prophets', 'Los Profetas', 'Enbiyâ', 'M', 112, 17],
  [22, 'الحج', 'Al-Hajj', 'The Pilgrimage', 'La Peregrinación', 'Hac', 'D', 78, 17],
  [23, 'المؤمنون', "Al-Mu'minun", 'The Believers', 'Los Creyentes', "Mü'minûn", 'M', 118, 18],
  [24, 'النور', 'An-Nur', 'The Light', 'La Luz', 'Nûr', 'D', 64, 18],
  [25, 'الفرقان', 'Al-Furqan', 'The Criterion', 'El Criterio', 'Furkan', 'M', 77, 18],
  [26, 'الشعراء', "Ash-Shu'ara", 'The Poets', 'Los Poetas', 'Şuarâ', 'M', 227, 19],
  [27, 'النمل', 'An-Naml', 'The Ant', 'Las Hormigas', 'Neml', 'M', 93, 19],
  [28, 'القصص', 'Al-Qasas', 'The Stories', 'Los Relatos', 'Kasas', 'M', 88, 20],
  [29, 'العنكبوت', "Al-'Ankabut", 'The Spider', 'La Araña', 'Ankebût', 'M', 69, 20],
  [30, 'الروم', 'Ar-Rum', 'The Romans', 'Los Bizantinos', 'Rûm', 'M', 60, 21],
  [31, 'لقمان', 'Luqman', 'Luqman', 'Luqmán', 'Lokmân', 'M', 34, 21],
  [32, 'السجدة', 'As-Sajdah', 'The Prostration', 'La Postración', 'Secde', 'M', 30, 21],
  [33, 'الأحزاب', 'Al-Ahzab', 'The Combined Forces', 'Los Coaligados', 'Ahzâb', 'D', 73, 21],
  [34, 'سبأ', 'Saba', 'Sheba', 'Saba', "Sebe'", 'M', 54, 22],
  [35, 'فاطر', 'Fatir', 'Originator', 'El Originador', 'Fâtır', 'M', 45, 22],
  [36, 'يس', 'Ya-Sin', 'Ya Sin', 'Ya-Sin', 'Yâsîn', 'M', 83, 22],
  [37, 'الصافات', 'As-Saffat', 'Those Lined Up', 'Los Puestos en Filas', 'Sâffât', 'M', 182, 23],
  [38, 'ص', 'Sad', 'The Letter Sad', 'Sad', 'Sâd', 'M', 88, 23],
  [39, 'الزمر', 'Az-Zumar', 'The Troops', 'Los Grupos', 'Zümer', 'M', 75, 23],
  [40, 'غافر', 'Ghafir', 'The Forgiver', 'El Perdonador', "Mü'min (Gâfir)", 'M', 85, 24],
  [41, 'فصلت', 'Fussilat', 'Explained in Detail', 'Detallado', 'Fussilet', 'M', 54, 24],
  [42, 'الشورى', 'Ash-Shuraa', 'The Consultation', 'La Consulta', 'Şûrâ', 'M', 53, 25],
  [43, 'الزخرف', 'Az-Zukhruf', 'The Ornaments of Gold', 'Los Adornos Dorados', 'Zuhruf', 'M', 89, 25],
  [44, 'الدخان', 'Ad-Dukhan', 'The Smoke', 'El Humo', 'Duhân', 'M', 59, 25],
  [45, 'الجاثية', 'Al-Jathiyah', 'The Crouching', 'La Arrodillada', 'Câsiye', 'M', 37, 25],
  [46, 'الأحقاف', 'Al-Ahqaf', 'The Wind-Curved Sandhills', 'Las Dunas', 'Ahkâf', 'M', 35, 26],
  [47, 'محمد', 'Muhammad', 'Muhammad', 'Muhammad', 'Muhammed', 'D', 38, 26],
  [48, 'الفتح', 'Al-Fath', 'The Victory', 'La Victoria', 'Fetih', 'D', 29, 26],
  [49, 'الحجرات', 'Al-Hujurat', 'The Rooms', 'Los Aposentos', 'Hucurât', 'D', 18, 26],
  [50, 'ق', 'Qaf', 'The Letter Qaf', 'Qaf', 'Kâf', 'M', 45, 26],
  [51, 'الذاريات', 'Adh-Dhariyat', 'The Winnowing Winds', 'Los Vientos que Esparcen', 'Zâriyât', 'M', 60, 26],
  [52, 'الطور', 'At-Tur', 'The Mount', 'El Monte', 'Tûr', 'M', 49, 27],
  [53, 'النجم', 'An-Najm', 'The Star', 'La Estrella', 'Necm', 'M', 62, 27],
  [54, 'القمر', 'Al-Qamar', 'The Moon', 'La Luna', 'Kamer', 'M', 55, 27],
  [55, 'الرحمن', 'Ar-Rahman', 'The Most Merciful', 'El Clemente', 'Rahmân', 'D', 78, 27],
  [56, 'الواقعة', "Al-Waqi'ah", 'The Inevitable', 'El Acontecimiento', 'Vâkıa', 'M', 96, 27],
  [57, 'الحديد', 'Al-Hadid', 'The Iron', 'El Hierro', 'Hadîd', 'D', 29, 27],
  [58, 'المجادلة', 'Al-Mujadila', 'The Pleading Woman', 'La Discusión', 'Mücâdele', 'D', 22, 28],
  [59, 'الحشر', 'Al-Hashr', 'The Exile', 'El Destierro', 'Haşr', 'D', 24, 28],
  [60, 'الممتحنة', 'Al-Mumtahanah', 'She That Is To Be Examined', 'La Examinada', 'Mümtehine', 'D', 13, 28],
  [61, 'الصف', 'As-Saff', 'The Ranks', 'Las Filas', 'Saf', 'D', 14, 28],
  [62, 'الجمعة', "Al-Jumu'ah", 'The Congregation (Friday)', 'El Viernes', "Cum'a", 'D', 11, 28],
  [63, 'المنافقون', 'Al-Munafiqun', 'The Hypocrites', 'Los Hipócritas', 'Münâfikûn', 'D', 11, 28],
  [64, 'التغابن', 'At-Taghabun', 'The Mutual Disillusion', 'El Desengaño', 'Tegâbün', 'D', 18, 28],
  [65, 'الطلاق', 'At-Talaq', 'The Divorce', 'El Divorcio', 'Talâk', 'D', 12, 28],
  [66, 'التحريم', 'At-Tahrim', 'The Prohibition', 'La Prohibición', 'Tahrîm', 'D', 12, 28],
  [67, 'الملك', 'Al-Mulk', 'The Sovereignty', 'La Soberanía', 'Mülk', 'M', 30, 29],
  [68, 'القلم', 'Al-Qalam', 'The Pen', 'El Cálamo', 'Kalem', 'M', 52, 29],
  [69, 'الحاقة', 'Al-Haqqah', 'The Reality', 'La Realidad Inevitable', 'Hâkka', 'M', 52, 29],
  [70, 'المعارج', "Al-Ma'arij", 'The Ascending Stairways', 'Las Vías de Ascenso', 'Meâric', 'M', 44, 29],
  [71, 'نوح', 'Nuh', 'Noah', 'Noé', 'Nûh', 'M', 28, 29],
  [72, 'الجن', 'Al-Jinn', 'The Jinn', 'Los Genios', 'Cin', 'M', 28, 29],
  [73, 'المزمل', 'Al-Muzzammil', 'The Enshrouded One', 'El Arropado', 'Müzzemmil', 'M', 20, 29],
  [74, 'المدثر', 'Al-Muddaththir', 'The Cloaked One', 'El Envuelto en un Manto', 'Müddessir', 'M', 56, 29],
  [75, 'القيامة', 'Al-Qiyamah', 'The Resurrection', 'La Resurrección', 'Kıyâmet', 'M', 40, 29],
  [76, 'الإنسان', 'Al-Insan', 'The Man', 'El Ser Humano', 'İnsân', 'D', 31, 29],
  [77, 'المرسلات', 'Al-Mursalat', 'The Emissaries', 'Los Enviados', 'Mürselât', 'M', 50, 29],
  [78, 'النبأ', 'An-Naba', 'The Tidings', 'La Gran Noticia', 'Nebe', 'M', 40, 30],
  [79, 'النازعات', "An-Nazi'at", 'Those Who Drag Forth', 'Los que Arrancan', 'Nâziât', 'M', 46, 30],
  [80, 'عبس', "'Abasa", 'He Frowned', 'Frunció el Ceño', 'Abese', 'M', 42, 30],
  [81, 'التكوير', 'At-Takwir', 'The Overthrowing', 'El Oscurecimiento', 'Tekvîr', 'M', 29, 30],
  [82, 'الانفطار', 'Al-Infitar', 'The Cleaving', 'La Hendidura', 'İnfitâr', 'M', 19, 30],
  [83, 'المطففين', 'Al-Mutaffifin', 'The Defrauding', 'Los Defraudadores', 'Mutaffifîn', 'M', 36, 30],
  [84, 'الانشقاق', 'Al-Inshiqaq', 'The Sundering', 'El Resquebrajamiento', 'İnşikâk', 'M', 25, 30],
  [85, 'البروج', 'Al-Buruj', 'The Mansions of the Stars', 'Las Constelaciones', 'Burûc', 'M', 22, 30],
  [86, 'الطارق', 'At-Tariq', 'The Nightcomer', 'El Astro Nocturno', 'Târık', 'M', 17, 30],
  [87, 'الأعلى', "Al-A'la", 'The Most High', 'El Altísimo', "A'lâ", 'M', 19, 30],
  [88, 'الغاشية', 'Al-Ghashiyah', 'The Overwhelming', 'La Evento Abrumador', 'Gâşiye', 'M', 26, 30],
  [89, 'الفجر', 'Al-Fajr', 'The Dawn', 'La Aurora', 'Fecr', 'M', 30, 30],
  [90, 'البلد', 'Al-Balad', 'The City', 'La Ciudad', 'Beled', 'M', 20, 30],
  [91, 'الشمس', 'Ash-Shams', 'The Sun', 'El Sol', 'Şems', 'M', 15, 30],
  [92, 'الليل', 'Al-Layl', 'The Night', 'La Noche', 'Leyl', 'M', 21, 30],
  [93, 'الضحى', 'Ad-Duhaa', 'The Morning Hours', 'La Mañana', 'Duhâ', 'M', 11, 30],
  [94, 'الشرح', 'Ash-Sharh', 'The Relief', 'La Apertura del Pecho', 'İnşirâh', 'M', 8, 30],
  [95, 'التين', 'At-Tin', 'The Fig', 'La Higuera', 'Tîn', 'M', 8, 30],
  [96, 'العلق', "Al-'Alaq", 'The Clot', 'El Coágulo', 'Alak', 'M', 19, 30],
  [97, 'القدر', 'Al-Qadr', 'The Power', 'El Decreto', 'Kadir', 'M', 5, 30],
  [98, 'البينة', 'Al-Bayyinah', 'The Clear Proof', 'La Prueba Clara', 'Beyyine', 'D', 8, 30],
  [99, 'الزلزلة', 'Az-Zalzalah', 'The Earthquake', 'El Terremoto', 'Zilzâl', 'D', 8, 30],
  [100, 'العاديات', "Al-'Adiyat", 'The Courser', 'Los Corceles', 'Âdiyât', 'M', 11, 30],
  [101, 'القارعة', "Al-Qari'ah", 'The Calamity', 'La Calamidad', 'Kâria', 'M', 11, 30],
  [102, 'التكاثر', 'At-Takathur', 'The Rivalry in World Increase', 'La Codicia', 'Tekâsür', 'M', 8, 30],
  [103, 'العصر', "Al-'Asr", 'The Declining Day', 'El Tiempo', 'Asr', 'M', 3, 30],
  [104, 'الهمزة', 'Al-Humazah', 'The Traducer', 'El Difamador', 'Hümeze', 'M', 9, 30],
  [105, 'الفيل', 'Al-Fil', 'The Elephant', 'El Elefante', 'Fîl', 'M', 5, 30],
  [106, 'قريش', 'Quraysh', 'Quraysh', 'Quraish', 'Kureyş', 'M', 4, 30],
  [107, 'الماعون', "Al-Ma'un", 'The Small Kindnesses', 'La Ayuda Mínima', 'Mâûn', 'M', 7, 30],
  [108, 'الكوثر', 'Al-Kawthar', 'The Abundance', 'La Abundancia', 'Kevser', 'M', 3, 30],
  [109, 'الكافرون', 'Al-Kafirun', 'The Disbelievers', 'Los Incrédulos', 'Kâfirûn', 'M', 6, 30],
  [110, 'النصر', 'An-Nasr', 'The Divine Support', 'El Socorro Divino', 'Nasr', 'D', 3, 30],
  [111, 'المسد', 'Al-Masad', 'The Palm Fiber', 'Las Fibras de Palma', 'Tebbet (Mesed)', 'M', 5, 30],
  [112, 'الإخلاص', 'Al-Ikhlas', 'The Sincerity', 'La Unicidad Pura', 'İhlâs', 'M', 4, 30],
  [113, 'الفلق', 'Al-Falaq', 'The Daybreak', 'El Alba', 'Felak', 'M', 5, 30],
  [114, 'الناس', 'An-Nas', 'Mankind', 'La Humanidad', 'Nâs', 'M', 6, 30],
];

export const SURAH_DIRECTORY: SurahMetadata[] = RAW_SURAH_TUPLES.map(
  ([number, nameAr, transliteration, en, es, tr, rev, ayahCount, juzStart]) => ({
    number,
    nameAr,
    transliteration,
    names: { es, en, ar: nameAr, tr },
    revelationType: rev === 'M' ? 'Meccan' : 'Medinan',
    ayahCount,
    juzStart,
  })
);

export const CURATED_AYAT: CuratedAyahItem[] = [
  {
    id: 'ayat-al-kursi-2-255',
    surahNumber: 2,
    ayahNumber: 255,
    referenceKey: '2:255',
    surahNameAr: 'البقرة',
    surahNameTranslit: 'Al-Baqarah',
    arabicUthmani:
      'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ وَسِعَ كُرْسِيُّهُ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ',
    transliteration:
      "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm...",
    translations: {
      es: 'Alá: no hay divinidad salvo Él, el Viviente, el Sustentador de todo. No Le toman somnolencia ni sueño. Suyo es cuanto hay en los cielos y en la tierra...',
      en: 'Allah—there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep...',
      ar: 'آية الكرسي — أعظم آية في كتاب الله، توحيد خالص وحفظٌ لمن قرأها دبر كل صلاة وعند النوم.',
      tr: 'Allah, O’ndan başka ilah yoktur; O, Hayy ve Kayyûm’dur. O’nu ne bir uyuklama tutabilir ne de bir uyku...',
    },
    reflections: {
      es: 'El versículo más grandioso del Corán (Ayat al-Kursi). Quien lo recita tras cada oración obligatoria permanece bajo la protección divina.',
      en: 'The greatest verse in the Quran (Ayat al-Kursi). Reciting it after each obligatory prayer brings continuous divine protection.',
      ar: 'من قرأها دبر كل صلاة مكتوبة لم يمنعه من دخول الجنة إلا أن يموت.',
      tr: 'Kur’an-ı Kerim’in en faziletli ayeti (Âyetel Kürsî); her farz namazın ardından okunması tavsiye edilmiştir.',
    },
    topicTags: ['tawhid', 'protection', 'post-salah', 'daily'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3',
  },
  {
    id: 'al-baqarah-2-183-ramadan',
    surahNumber: 2,
    ayahNumber: 183,
    referenceKey: '2:183',
    surahNameAr: 'البقرة',
    surahNameTranslit: 'Al-Baqarah',
    arabicUthmani:
      'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ كُتِبَ عَلَيْكُمُ ٱلصِّيَامُ كَمَا كُتِبَ عَلَى ٱلَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ',
    transliteration:
      'Ya ayyuhalladhina amanu kutiba alaykumus-siyamu kama kutiba alalladhina min qablikum laallakum tattaqun',
    translations: {
      es: '¡Oh, creyentes! Se os ha prescrito el ayuno al igual que fue prescrito a quienes os precedieron, para que alcancéis la piedad consciente (Taqwa).',
      en: 'O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become mindful of Allah (Taqwa).',
      ar: 'نداء إيماني يبيّن الغاية العظمى من الصيام وهي تحقيق التقوى وتزكية النفس.',
      tr: 'Ey iman edenler! Sizden öncekilere farz kılındığı gibi, takvaya eresiniz diye sizin üzerinize de oruç farz kılındı.',
    },
    reflections: {
      es: 'El propósito espiritual del ayuno de Ramadán es cultivar la consciencia de Dios (Taqwa), la compasión hacia el necesitado y el dominio propio.',
      en: 'The spiritual goal of fasting in Ramadan is cultivating Taqwa (God-consciousness), empathy for the hungry, and self-discipline.',
      ar: 'الصوم مدرسة للتقوى ومواساة الفقراء وضبط النفس.',
      tr: 'Ramazan orucunun hikmeti, kalpte takva bilincini ve merhameti güçlendirmektir.',
    },
    topicTags: ['ramadan', 'fasting', 'taqwa'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/190.mp3',
  },
  {
    id: 'al-baqarah-2-261-charity',
    surahNumber: 2,
    ayahNumber: 261,
    referenceKey: '2:261',
    surahNameAr: 'البقرة',
    surahNameTranslit: 'Al-Baqarah',
    arabicUthmani:
      'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍ مِّا۟ئَةُ حَبَّةٍ ۗ وَٱللَّهُ يُضَـٰعِفُ لِمَن يَشَآءُ ۗ وَٱللَّهُ وَٰسِعٌ عَلِيمٌ',
    transliteration:
      "Mathalulladhina yunfiquna amwalahum fi sabilillahi kamathali habbatin anbatat sab'a sanabila fi kulli sunbulatin mi'atu habbah...",
    translations: {
      es: 'El ejemplo de quienes invierten sus bienes por la causa de Alá es como el de una semilla que produce siete espigas, y en cada espiga hay cien granos. Y Alá multiplica para quien Él quiere.',
      en: 'The example of those who spend their wealth in the way of Allah is like a seed of grain which grows seven spikes; in each spike is a hundred grains. And Allah multiplies His reward for whom He wills.',
      ar: 'مضاعفة الأجر لمن ينفق في سبيل الله بالزكاة والصدقة وعمارة المساجد.',
      tr: 'Mallarını Allah yolunda harcayanların durumu, her başağında yüz dane olmak üzere yedi başak veren bir danenin durumu gibidir.',
    },
    reflections: {
      es: 'La caridad (Zakat y Sadaqah) nunca disminuye la riqueza; por el contrario, multiplica la bendición (Barakah) en la comunidad.',
      en: 'Charity (Zakat and Sadaqah) never diminishes wealth; rather, it multiplies Barakah in both this life and the Hereafter.',
      ar: 'الصدقة والزكاة نماءٌ وبركةٌ للمال والمجتمع.',
      tr: 'Zekât ve sadaka malı eksiltmez; bilakis bereketini katbekat artırır.',
    },
    topicTags: ['zakat', 'sadaqah', 'charity', 'barakah'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/268.mp3',
  },
  {
    id: 'ash-sharh-94-5-6',
    surahNumber: 94,
    ayahNumber: 5,
    referenceKey: '94:5-6',
    surahNameAr: 'الشرح',
    surahNameTranslit: 'Ash-Sharh',
    arabicUthmani: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    transliteration: "Fa-inna ma'al-'usri yusra. Inna ma'al-'usri yusra.",
    translations: {
      es: 'Pues, ciertamente, junto a la dificultad hay facilidad. Ciertamente, junto a la dificultad hay facilidad.',
      en: 'For indeed, with hardship comes ease. Indeed, with hardship comes ease.',
      ar: 'وعدٌ إلهي جازم بأن مع كل ضيقٍ فرجاً ومع كل شدةٍ تيسيراً.',
      tr: 'Şüphesiz güçlükle beraber bir kolaylık vardır. Gerçekten, güçlükle beraber bir kolaylık vardır.',
    },
    reflections: {
      es: 'El alivio no solo viene después de la prueba, sino que acompaña al creyente paciente en medio mismo de la dificultad.',
      en: 'Ease does not merely follow hardship; Allah accompanies the patient believer with ease right alongside every trial.',
      ar: 'لن يغلب عسرٌ يسرين لمن توكل على الله وصبر.',
      tr: 'Sabır ve tevekkül eden mümin için her zorluğun yanında mutlaka bir çıkış yolu vardır.',
    },
    topicTags: ['patience', 'hope', 'comfort'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6095.mp3',
  },
  {
    id: 'al-hujurat-49-13-diversity',
    surahNumber: 49,
    ayahNumber: 13,
    referenceKey: '49:13',
    surahNameAr: 'الحجرات',
    surahNameTranslit: 'Al-Hujurat',
    arabicUthmani:
      'يَـٰٓأَيُّهَا ٱلنَّاسُ إِنَّا خَلَقْنَـٰكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَـٰكُمْ شُعُوبًا وَقَبَآئِلَ لِتَعَارَفُوٓا۟ ۚ إِنَّ أَكْرَمَكُمْ عِندَ ٱللَّهِ أَتْقَىٰكُمْ ۚ إِنَّ ٱللَّهَ عَلِيمٌ خَبِيرٌ',
    transliteration:
      "Ya ayyuhan-nasu inna khalaqnakum min dhakarin wa untha wa ja'alnakum shu'uban wa qaba'ila lita'arafu, inna akramakum 'indallahi atqakum...",
    translations: {
      es: '¡Oh, humanidad! Os hemos creado de un varón y una hembra y os hemos constituido en pueblos y tribus para que os conozcáis mutuamente. Ciertamente, el más noble de vosotros ante Alá es el más piadoso.',
      en: 'O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another. Indeed, the most noble of you in the sight of Allah is the most righteous of you.',
      ar: 'أساس التعارف الإنساني والمساواة في الإسلام؛ لا تفاضل بالعرق أو اللون بل بالتقوى والعمل الصالح.',
      tr: 'Ey insanlar! Şüphesiz sizi bir erkek ile bir dişiden yarattık, tanışasınız diye sizi kavim ve kabilelere ayırdık. Allah katında en değerli olanınız, O’na karşı en çok takva sahibi olanınızdır.',
    },
    reflections: {
      es: 'Fundamento de la fraternidad intercultural de nuestra Mezquita Central de Bogotá: la diversidad de lenguas y orígenes existe para el entendimiento mutuo.',
      en: 'Foundation of universal brotherhood in Islam: diversity of cultures and languages exists for mutual acquaintance and respect.',
      ar: 'رسالة المسجد الجامعة لكل الثقافات والألسن على مائدة الإيمان والتعارف.',
      tr: 'İslam’da evrensel kardeşlik ve farklı kültürlerin birbirini tanıması esastır.',
    },
    topicTags: ['brotherhood', 'community', 'equality'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/4625.mp3',
  },
  {
    id: 'al-ikhlas-112-1-4',
    surahNumber: 112,
    ayahNumber: 1,
    referenceKey: '112:1-4',
    surahNameAr: 'الإخلاص',
    surahNameTranslit: 'Al-Ikhlas',
    arabicUthmani:
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    transliteration:
      'Qul Huwallahu Ahad. Allahus-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translations: {
      es: 'Di: Él es Alá, el Único. Alá, el Eterno Sustento de todo. No engendró ni fue engendrado. Y no hay nada ni nadie comparable a Él.',
      en: 'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent.',
      ar: 'سورة الإخلاص تعدل ثلث القرآن لأنها جمعت أصول التوحيد الخالص.',
      tr: 'De ki: O, Allah’tır, bir tektir. Allah Samed’dir. O, doğurmamış ve doğrulmamıştır. O’nun hiçbir dengi yoktur.',
    },
    reflections: {
      es: 'Equivale en mérito a un tercio del Corán por sintetizar la pureza absoluta del monoteísmo islámico (Tawhid).',
      en: 'Equal in reward to one-third of the Quran for encapsulating the pure essence of Islamic monotheism (Tawhid).',
      ar: 'خلاصة العقيدة الإسلامية في تنزيه الخالق جل وعلا.',
      tr: 'Tevhid inancının özünü ifade eden ve Kur’an’ın üçte birine denk sayılan sure.',
    },
    topicTags: ['tawhid', 'sincerity', 'daily'],
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6222.mp3',
  },
];

export const CURATED_HADITHS: CuratedHadithItem[] = [
  {
    id: 'nawawi-1-intentions',
    collectionSlug: 'nawawi40',
    collectionNames: {
      es: 'Sahih al-Bujari y Muslim (40 Hadices de An-Nawawi #1)',
      en: "Sahih al-Bukhari & Muslim (An-Nawawi's 40 Hadith #1)",
      ar: 'صحيح البخاري ومسلم (الأربعون النووية #١)',
      tr: 'Sahîh-i Buhârî ve Müslim (Nevevî Kırk Hadis #1)',
    },
    hadithNumber: '1',
    grading: 'Sahih',
    narrator: {
      es: 'Umar ibn al-Jattab (que Alá esté complacido con él)',
      en: 'Umar ibn al-Khattab (may Allah be pleased with him)',
      ar: 'أمير المؤمنين عمر بن الخطاب رضي الله عنه',
      tr: 'Hz. Ömer bin Hattâb (r.a.)',
    },
    arabicText:
      'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ...',
    transliteration:
      "Innamal-a'malu bin-niyyat, wa innama likulli imri'in ma nawa...",
    translations: {
      es: '«Ciertamente las obras se juzgan por las intenciones, y a cada persona le corresponde aquello que tuvo intención de hacer...»',
      en: '“Actions are judged only by intentions, and every person shall have only that which they intended...”',
      ar: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى — مدار الإخلاص وقبول العمل في الإسلام.',
      tr: '“Ameller niyetlere göredir ve herkese ancak niyet ettiği şey vardır...”',
    },
    keyTakeaways: {
      es: 'La sinceridad de corazón (Ikhlas) transforma incluso las labores cotidianas en actos de adoración.',
      en: 'Sincerity of heart (Ikhlas) elevates everyday deeds into rewarded acts of worship.',
      ar: 'النية الصالحة تحوّل العادات إلى عبادات مأجورة.',
      tr: 'Halis niyet, günlük işleri bile ibadete dönüştürür.',
    },
    topicTags: ['intentions', 'sincerity', 'foundations'],
  },
  {
    id: 'muslim-charity-never-decreases',
    collectionSlug: 'muslim',
    collectionNames: {
      es: 'Sahih Muslim (#2588)',
      en: 'Sahih Muslim (#2588)',
      ar: 'صحيح مسلم (٢٥٨٨)',
      tr: 'Sahîh-i Müslim (#2588)',
    },
    hadithNumber: '2588',
    grading: 'Sahih',
    narrator: {
      es: 'Abu Hurairah (que Alá esté complacido con él)',
      en: 'Abu Hurairah (may Allah be pleased with him)',
      ar: 'أبو هريرة رضي الله عنه',
      tr: 'Ebû Hüreyre (r.a.)',
    },
    arabicText:
      'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ، وَمَا زَادَ اللَّهُ عَبْدًا بِعَفْوٍ إِلاَّ عِزًّا، وَمَا تَوَاضَعَ أَحَدٌ لِلَّهِ إِلاَّ رَفَعَهُ اللَّهُ',
    transliteration:
      "Ma naqasat sadaqatun min mal, wa ma zadallahu 'abdan bi-'afwin illa 'izza, wa ma tawada'a ahadun lillahi illa rafa'ahullah",
    translations: {
      es: '«La caridad (Sadaqah) jamás disminuye el patrimonio; Alá no añade al siervo que perdona sino honor; y nadie se humilla por Alá sin que Alá lo eleve.»',
      en: '“Charity (Sadaqah) does not decrease wealth; no one forgives another except that Allah increases their honor; and no one humbles themselves for the sake of Allah except that Allah raises their status.”',
      ar: 'ثلاث خصال مباركة: الصدقة تزيد البركة، والعفو يزيد العزة، والتواضع يرفع الدرجات.',
      tr: '“Sadaka malı eksiltmez. Allah, affeden kulunun ancak izzetini artırır. Allah için tevazu göstereni de Allah mutlaka yüceltir.”',
    },
    keyTakeaways: {
      es: 'Generosidad, perdón y humildad son los tres pilares del carácter profético en la vida comunitaria.',
      en: 'Generosity, forgiveness, and humility are three pillars of Prophetic character in community life.',
      ar: 'الإنفاق والعفو والتواضع مفاتيح البركة والرفعة.',
      tr: 'Cömertlik, affedicilik ve tevazu müminin en temel ahlaki vasıflarıdır.',
    },
    topicTags: ['charity', 'sadaqah', 'forgiveness', 'humility'],
  },
  {
    id: 'bukhari-best-learn-quran',
    collectionSlug: 'bukhari',
    collectionNames: {
      es: 'Sahih al-Bujari (#5027)',
      en: 'Sahih al-Bukhari (#5027)',
      ar: 'صحيح البخاري (٥٠٢٧)',
      tr: 'Sahîh-i Buhârî (#5027)',
    },
    hadithNumber: '5027',
    grading: 'Sahih',
    narrator: {
      es: 'Uthman ibn Affan (que Alá esté complacido con él)',
      en: 'Uthman ibn Affan (may Allah be pleased with him)',
      ar: 'عثمان بن عفان رضي الله عنه',
      tr: 'Hz. Osman bin Affân (r.a.)',
    },
    arabicText: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    transliteration: "Khayrukum man ta'allamal-Qur'ana wa 'allamah",
    translations: {
      es: '«El mejor de entre vosotros es quien aprende el Corán y lo enseña.»',
      en: '“The best among you are those who learn the Quran and teach it.”',
      ar: 'شرف تعلم كتاب الله وتعليمه والعمل به.',
      tr: '“Sizin en hayırlınız, Kur’an’ı öğrenen ve öğreteninizdir.”',
    },
    keyTakeaways: {
      es: 'Estudiar el Corán, comprender su significado y compartir su sabiduría es la labor educativa más noble.',
      en: 'Studying the Quran, understanding its meanings, and sharing its guidance is the noblest educational endeavor.',
      ar: 'حلقات القرآن في المسجد من أشرف مجالس العلم.',
      tr: 'Kur’an halkalarına katılmak ve ilmi paylaşmak en faziletli amellerdendir.',
    },
    topicTags: ['quran', 'education', 'knowledge'],
  },
  {
    id: 'riyad-smile-charity',
    collectionSlug: 'tirmidhi',
    collectionNames: {
      es: "Jami' at-Tirmidhi (#1956)",
      en: "Jami' at-Tirmidhi (#1956)",
      ar: 'جامع الترمذي (١٩٥٦)',
      tr: 'Câmiu’t-Tirmizî (#1956)',
    },
    hadithNumber: '1956',
    grading: 'Sahih',
    narrator: {
      es: 'Abu Dharr al-Ghifari (que Alá esté complacido con él)',
      en: 'Abu Dharr al-Ghifari (may Allah be pleased with him)',
      ar: 'أبو ذر الغفاري رضي الله عنه',
      tr: 'Ebû Zer el-Gıfârî (r.a.)',
    },
    arabicText: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ',
    transliteration: 'Tabassumuka fi wajhi akhika laka sadaqah',
    translations: {
      es: '«Tu sonrisa en el rostro de tu hermano es para ti una caridad (Sadaqah).»',
      en: '“Your smiling in the face of your brother is charity (Sadaqah) for you.”',
      ar: 'الابتسامة والكلمة الطيبة من أبواب الصدقة اليومية المتاحة لكل مسلم.',
      tr: '“Kardeşinin yüzüne tebessüm etmen senin için bir sadakadır.”',
    },
    keyTakeaways: {
      es: 'En el Islam, la bondad cotidiana, la hospitalidad y una sonrisa sincera cuentan como caridad recompensada.',
      en: 'In Islam, everyday kindness, warmth, and hospitality are rewarded as acts of charity.',
      ar: 'حسن الخلق وبشاشة الوجه صدقة جارية في القلوب.',
      tr: 'Güler yüz ve nezaket İslam’da başlı başına bir sadakadır.',
    },
    topicTags: ['manners', 'sadaqah', 'community'],
  },
];

export const CURATED_DUAS: CuratedDuaItem[] = [
  {
    id: 'dua-after-adhan',
    category: 'adhan',
    categoryLabels: {
      es: 'Súplica tras el Adhan (Llamado a la Oración)',
      en: 'Supplication After the Adhan',
      ar: 'دعاء ما بعد الأذان',
      tr: 'Ezan Duası',
    },
    titles: {
      es: 'Dua al concluir el Adhan',
      en: 'Dua Upon Hearing the Adhan',
      ar: 'اللهم رب هذه الدعوة التامة',
      tr: 'Ezan Okunduktan Sonra Yapılan Dua',
    },
    arabicText:
      'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
    transliteration:
      "Allahumma Rabba hadhihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah, wab'ath-hu maqaman mahmudanil-ladhi wa'adtah",
    translations: {
      es: '¡Oh Alá, Señor de esta llamada perfecta y de la oración que va a establecerse! Concede a Muhammad la Wasilah (la más alta estación en el Paraíso) y la excelencia, y elévalo al Rango Alabado que le has prometido.',
      en: 'O Allah, Lord of this perfect call and established prayer, grant Muhammad the intercession and favor, and raise him to the honored station You have promised him.',
      ar: 'من قالها حين يسمع النداء حلّت له شفاعة النبي ﷺ يوم القيامة (رواه البخاري).',
      tr: 'Allah’ım! Ey bu tam davetin ve kılınacak namazın Rabbi! Muhammed’e vesileyi ve fazileti ver; onu vaat ettiğin Makâm-ı Mahmûd’a ulaştır.',
    },
    virtueAndSource: {
      es: 'Sahih al-Bujari #614 — Quien la pronuncia tras el Adhan merece la intercesión del Profeta (ﷺ) en el Día del Juicio.',
      en: 'Sahih al-Bukhari #614 — Whoever recites this after the Adhan becomes worthy of the Prophet’s (ﷺ) intercession.',
      ar: 'صحيح البخاري (٦١٤) — تحلّ له شفاعة النبي ﷺ يوم القيامة.',
      tr: 'Sahîh-i Buhârî #614 — Ezanın ardından bu duayı okuyana Peygamber Efendimizin شefaati vacip olur.',
    },
    recommendedRepetitions: 1,
    topicTags: ['adhan', 'salah', 'daily'],
  },
  {
    id: 'dua-post-salah-peace',
    category: 'post_salah',
    categoryLabels: {
      es: 'Adhkar tras la Oración (Post-Salah)',
      en: 'Post-Salah Remembrance (Adhkar)',
      ar: 'أذكار بعد السلام من الصلاة',
      tr: 'Namaz Sonrası Tesbihat ve Dua',
    },
    titles: {
      es: 'Allahumma Antas-Salam (Al finalizar la oración)',
      en: 'Allahumma Antas-Salam (Immediately After Salah)',
      ar: 'أستغفر الله (٣ مرات) اللهم أنت السلام ومنك السلام',
      tr: 'Selamdan Sonra: Allahümme Ente’s-Selâm',
    },
    arabicText:
      'أَسْتَغْفِرُ اللَّهَ (ثَلَاثًا) اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration:
      'Astaghfirullah (3x). Allahumma Antas-Salamu wa minkas-salamu, tabarakta ya Dhal-Jalali wal-Ikram',
    translations: {
      es: 'Pido perdón a Alá (3 veces). ¡Oh Alá, Tú eres la Paz y de Ti procede la paz; bendito seas, oh Poseedor de la Majestad y la Generosidad!',
      en: 'I seek the forgiveness of Allah (3x). O Allah, You are Peace and from You comes peace; blessed are You, O Possessor of Majesty and Honor.',
      ar: 'أول ما كان يقوله النبي ﷺ إذا انصرف من صلاته (صحيح مسلم).',
      tr: 'Estağfirullah (3 defa). Allah’ım! Sen Selâm’sın, selamet ve esenlik ancak Sendendir. Ey Celâl ve İkram sahibi, Sen ne yücesin!',
    },
    virtueAndSource: {
      es: 'Sahih Muslim #591 — Primera invocación profética inmediatamente después de dar el Taslim en cada oración.',
      en: 'Sahih Muslim #591 — The Prophet’s (ﷺ) opening remembrance immediately after concluding each prayer.',
      ar: 'صحيح مسلم (٥٩١).',
      tr: 'Sahîh-i Müslim #591 — Farz namazlardan selam verdikten hemen sonra okunur.',
    },
    recommendedRepetitions: 1,
    topicTags: ['post-salah', 'peace', 'forgiveness'],
  },
  {
    id: 'dua-ramadan-iftar',
    category: 'ramadan_iftar',
    categoryLabels: {
      es: 'Ramadán y Ruptura del Ayuno (Iftar)',
      en: 'Ramadan & Breaking the Fast (Iftar)',
      ar: 'أدعية رمضان والإفطار',
      tr: 'Ramazan ve İftar Duaları',
    },
    titles: {
      es: 'Súplica al romper el ayuno (Iftar)',
      en: 'Supplication Upon Breaking the Fast (Iftar)',
      ar: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ',
      tr: 'İftar Duası (Oruç Açarken)',
    },
    arabicText:
      'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
    transliteration:
      "Dhahabadh-dhama'u wabtallatil-'uruqu, wa thabatal-ajru in sha'Allah",
    translations: {
      es: 'Se ha ido la sed, se han humedecido las venas y se ha confirmado la recompensa, si Alá quiere.',
      en: 'The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
      ar: 'دعاء النبي ﷺ عند الفطر (رواه أبو داود وحسنه الألباني).',
      tr: 'Susuzluk gitti, damarlar ıslandı ve inşallah mükâfat sabit oldu.',
    },
    virtueAndSource: {
      es: 'Sunan Abi Dawud #2357 — Súplica profética al probar el agua o los dátiles en el momento del Maghrib.',
      en: 'Sunan Abi Dawud #2357 — Prophetic supplication when breaking the fast at Maghrib.',
      ar: 'سنن أبي داود (٢٣٥٧).',
      tr: 'Sünen-i Ebû Dâvûd #2357 — Akşam ezanıyla oruç açıldığında okunur.',
    },
    recommendedRepetitions: 1,
    topicTags: ['ramadan', 'iftar', 'fasting'],
  },
  {
    id: 'dua-sayyidul-istighfar',
    category: 'forgiveness',
    categoryLabels: {
      es: 'Perdón y Mañana/Tarde (Adhkar)',
      en: 'Forgiveness & Morning/Evening Adhkar',
      ar: 'أذكار الصباح والمساء والاستغفار',
      tr: 'Sabah-Akşam Zikirleri ve İstiğfar',
    },
    titles: {
      es: 'Sayyidul Istighfar (La Súplica Suprema de Perdón)',
      en: 'Sayyidul Istighfar (The Master Supplication for Forgiveness)',
      ar: 'سيد الاستغفار',
      tr: 'Seyyidü’l-İstiğfâr Duası',
    },
    arabicText:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u laka bidhanbi faghfir li, fa-innahu la yaghfirudh-dhunuba illa Anta",
    translations: {
      es: '¡Oh Alá, Tú eres mi Señor, no hay divinidad salvo Tú! Me creaste y soy Tu siervo, y mantengo Tu pacto y Tu promesa en la medida de mis fuerzas. Busco refugio en Ti del mal que he cometido; reconozco Tus bendiciones sobre mí y reconozco mi falta; perdóname, pues nadie perdona los pecados sino Tú.',
      en: 'O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I uphold Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.',
      ar: 'من قالها من النهار موقناً بها فمات من يومه دخل الجنة، ومن قالها من الليل موقناً بها فمات دخل الجنة.',
      tr: 'Allah’ım! Sen benim Rabbimsin, Senden başka ilah yoktur. Beni Sen yarattın ve ben Senin kulunum. Gücüm yettiğince Senin ahdin ve vaadin üzereyim...',
    },
    virtueAndSource: {
      es: 'Sahih al-Bujari #6306 — Recitarla con convicción por la mañana y al atardecer abre las puertas del Paraíso.',
      en: 'Sahih al-Bukhari #6306 — Reciting it with conviction in the morning and evening guarantees Paradise.',
      ar: 'صحيح البخاري (٦٣٠٦).',
      tr: 'Sahîh-i Buhârî #6306 — Sabah ve akşam yakîn ile okunması tavsiye edilen en faziletli istiğfar.',
    },
    recommendedRepetitions: 1,
    topicTags: ['morning_evening', 'forgiveness', 'daily'],
  },
  {
    id: 'dua-rabbana-good-both-worlds',
    category: 'parents_family',
    categoryLabels: {
      es: 'Súplicas Coránicas (Rabbana) y Familia',
      en: 'Quranic Supplications (Rabbana) & Family',
      ar: 'الأدعية القرآنية والأسرة',
      tr: 'Kur’an Duaları (Rabbenâ) ve Aile',
    },
    titles: {
      es: 'Rabbana Atina fid-Dunya Hasanah (Corán 2:201)',
      en: 'Rabbana Atina fid-Dunya Hasanah (Quran 2:201)',
      ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً',
      tr: 'Rabbenâ Âtinâ Duası (Bakara 2:201)',
    },
    arabicText:
      'رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْـَٔاخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ',
    transliteration:
      "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translations: {
      es: '«¡Señor nuestro! Concédenos el bien en este mundo y el bien en la Última Vida, y presérvanos del castigo del Fuego.»',
      en: '“Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.”',
      ar: 'أجمع دعاء كان يكثر منه النبي ﷺ في كل أحواله.',
      tr: '“Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.”',
    },
    virtueAndSource: {
      es: 'Corán 2:201 y Sahih al-Bujari #6389 — La súplica más frecuente del Profeta Muhammad (ﷺ).',
      en: 'Quran 2:201 & Sahih al-Bukhari #6389 — The most frequent supplication of Prophet Muhammad (ﷺ).',
      ar: 'القرآن الكريم (٢:٢٠١) وصحيح البخاري (٦٣٨٩).',
      tr: 'Bakara Suresi 201. Ayet — Peygamber Efendimizin (s.a.v.) en çok okuduğu kapsamlı dua.',
    },
    recommendedRepetitions: 3,
    topicTags: ['quranic', 'daily', 'comprehensive'],
  },
];

export const ASMA_UL_HUSNA: AsmaUlHusnaItem[] = [
  {
    number: 1,
    arabic: 'الرَّحْمَٰنُ',
    transliteration: 'Ar-Rahman',
    meanings: {
      es: 'El Clemente / El Infinitamente Misericordioso',
      en: 'The Entirely Merciful',
      ar: 'ذو الرحمة الواسعة التي وسعت كل شيء',
      tr: 'Er-Rahmân (Sonsuz Merhamet Sahibi)',
    },
    reflections: {
      es: 'Su misericordia abarca a toda la creación sin excepción en esta vida.',
      en: 'His encompassing mercy embraces all creation without exception.',
      ar: 'رحمة شاملة لجميع الخلائق في الدنيا.',
      tr: 'Dünyada bütün yaratılmışları kuşatan sınırsız rahmet sahibi.',
    },
    quranReference: '1:1, 55:1',
  },
  {
    number: 2,
    arabic: 'الرَّحِيمُ',
    transliteration: 'Ar-Rahim',
    meanings: {
      es: 'El Misericordiosísimo / El Compasivo Especial',
      en: 'The Especially Merciful',
      ar: 'المتفضل بالرحمة الخاصة بالمؤمنين',
      tr: 'Er-Rahîm (Çok Bağışlayıcı ve Merhamet Edici)',
    },
    reflections: {
      es: 'Misericordia continua y eterna que guía, perdona y sostiene el corazón creyente.',
      en: 'Continuous, intimate mercy that guides, forgives, and sustains the believer.',
      ar: 'رحمة متصلة بالمؤمنين هدايةً ومغفرةً.',
      tr: 'Müminlere ahirette ve dünyada özel merhamet ve mağfiret ihsan eden.',
    },
    quranReference: '1:3, 33:43',
  },
  {
    number: 3,
    arabic: 'السَّلَامُ',
    transliteration: 'As-Salam',
    meanings: {
      es: 'La Paz / La Fuente de Toda Paz y Perfección',
      en: 'The Source of Peace and Perfection',
      ar: 'السالم من كل نقص ومانح السلام لعباده',
      tr: 'Es-Selâm (Esenlik ve Barış Kaynağı)',
    },
    reflections: {
      es: 'De Él proviene la serenidad interior y a Él pedimos paz para nuestra comunidad y el mundo.',
      en: 'From Him comes inner tranquility, safety, and peace for humanity.',
      ar: 'منه السلام وإليه يعود السلام.',
      tr: 'Kalplere huzur ve dünyaya esenlik bahşeden.',
    },
    quranReference: '59:23',
  },
  {
    number: 4,
    arabic: 'الرَّزَّاقُ',
    transliteration: 'Ar-Razzaq',
    meanings: {
      es: 'El Sustentador Supremo / El Proveedor',
      en: 'The Total Provider and Sustainer',
      ar: 'المتكفل بأرزاق الخلق المادية والروحية',
      tr: 'Er-Rezzâk (Bütün Canlıların Rızkını Veren)',
    },
    reflections: {
      es: 'Quien confía en Ar-Razzaq comparte su sustento con generosidad sabiendo que toda provisión viene de Él.',
      en: 'Trusting in Ar-Razzaq inspires generosity, knowing all sustenance flows from His treasury.',
      ar: 'اليقين بأن الرزق بيد الله يثمر التوكل والإنفاق.',
      tr: 'Maddi ve manevi her türlü rızkı kesintisiz ihsan eden.',
    },
    quranReference: '51:58',
  },
  {
    number: 5,
    arabic: 'الْغَفُورُ',
    transliteration: 'Al-Ghafur',
    meanings: {
      es: 'El Siempre Perdonador / El Indulgente',
      en: 'The All-Forgiving',
      ar: 'الذي يغفر الذنوب ويستر العيوب مهما عظمت',
      tr: 'El-Gafûr (Çok Bağışlayan)',
    },
    reflections: {
      es: 'Nunca desesperes de Su perdón; Él cubre las faltas y recibe con amor a quien vuelve a Él.',
      en: 'Never despair of His mercy; He conceals faults and welcomes all who turn back to Him.',
      ar: 'يغفر الذنب ويقبل التوب ويعفو عن الكثير.',
      tr: 'Günahları örten ve tövbe edenleri sonsuzca bağışlayan.',
    },
    quranReference: '39:53',
  },
];

export const TASBIH_PRESETS: TasbihPresetItem[] = [
  {
    id: 'subhanallah-33',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    translations: {
      es: 'Glorificado y libre de toda imperfección sea Alá',
      en: 'Glory be to Allah (Free is He from all imperfection)',
      ar: 'تنزيه الله وتعظيمه دبر كل صلاة',
      tr: 'Allah her türlü eksiklikten münezzehtir',
    },
    targetCount: 33,
    virtue: {
      es: 'Parte del Tasbih profético tras cada oración (33 veces).',
      en: 'Part of the Prophetic post-prayer Tasbih (33 times).',
      ar: 'تُقال ٣٣ مرة بعد كل صلاة مكتوبة.',
      tr: 'Her farz namazın ardından 33 defa okunur.',
    },
  },
  {
    id: 'alhamdulillah-33',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    translations: {
      es: 'Toda alabanza y gratitud pertenece a Alá',
      en: 'All praise and gratitude belong to Allah',
      ar: 'ثناءٌ وشكرٌ لله على نعمه الظاهرة والباطنة',
      tr: 'Hamd ve şükür yalnızca Allah’a mahsustur',
    },
    targetCount: 33,
    virtue: {
      es: 'Llena la balanza de las buenas obras (Sahih Muslim #223).',
      en: 'Fills the scale of good deeds (Sahih Muslim #223).',
      ar: 'والحمد لله تملأ الميزان (صحيح مسلم).',
      tr: 'Mizanı sevapla dolduran şükür zikri (Müslim #223).',
    },
  },
  {
    id: 'allahu-akbar-34',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    translations: {
      es: 'Alá es el Más Grande',
      en: 'Allah is the Greatest',
      ar: 'تكبير الله وإجلاله فوق كل شيء',
      tr: 'Allah en büyüktür',
    },
    targetCount: 34,
    virtue: {
      es: 'Completa las 100 alabanzas tras cada oración obligatoria.',
      en: 'Completes the 100 remembrances after each obligatory prayer.',
      ar: 'تتمة المائة في تسبيح دبر الصلاة.',
      tr: 'Namaz tesbihatını 100’e tamamlayan tekbir.',
    },
  },
  {
    id: 'astaghfirullah-100',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaha wa atubu ilayh',
    translations: {
      es: 'Pido perdón a Alá y me vuelvo a Él en arrepentimiento',
      en: 'I seek forgiveness from Allah and repent to Him',
      ar: 'استغفار وتوبة تجلب الفرج والرزق',
      tr: 'Allah’tan bağışlanma diler ve O’na tövbe ederim',
    },
    targetCount: 100,
    virtue: {
      es: 'El Profeta (ﷺ) pedía perdón a Alá más de 70 o 100 veces al día.',
      en: 'The Prophet (ﷺ) sought forgiveness from Allah 70 to 100 times daily.',
      ar: 'سنة نبوية يومية تفتح أبواب الرزق والسكينة.',
      tr: 'Peygamber Efendimizin (s.a.v.) her gün 100 defa okuduğu istiğfar.',
    },
  },
];

export const SHAHADA_REFERENCE = {
  arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ',
  transliteration:
    'Ash-hadu an la ilaha illa Allah, wa ash-hadu anna Muhammadan Rasulu Allah',
  translations: {
    es: 'Atestiguo que no hay divinidad digna de adoración sino Alá, y atestiguo que Muhammad es el Mensajero de Alá.',
    en: 'I bear witness that there is no deity worthy of worship except Allah, and I bear witness that Muhammad is the Messenger of Allah.',
    ar: 'شهادة التوحيد والرسالة، مفتاح الدخول في الإسلام وركنه الأول.',
    tr: 'Şahitlik ederim ki Allah’tan başka ilah yoktur ve yine şahitlik ederim ki Muhammed O’nun kulu ve elçisidir.',
  } as LocalizedStringMap,
};

export const FIVE_PILLARS_REFERENCE: Array<{
  order: number;
  slug: string;
  arabicName: string;
  transliteration: string;
  titles: LocalizedStringMap;
  summaries: LocalizedStringMap;
}> = [
  {
    order: 1,
    slug: 'shahada',
    arabicName: 'الشَّهَادَتَان',
    transliteration: 'Ash-Shahadatan',
    titles: {
      es: '1. Shahada (Testimonio de Fe)',
      en: '1. Shahada (Declaration of Faith)',
      ar: '١. الشهادتان',
      tr: '1. Kelime-i Şehâdet',
    },
    summaries: {
      es: 'Reconocer con sinceridad la Unicidad absoluta de Dios (Alá) y la profecía de Muhammad (ﷺ).',
      en: 'Sincerely affirming the absolute Oneness of God (Allah) and the prophethood of Muhammad (ﷺ).',
      ar: 'الإقرار بوحدانية الله جل وعلا وبرسالة نبيه محمد ﷺ.',
      tr: 'Allah’ın birliğine ve Hz. Muhammed’in (s.a.v.) O’nun elçisi olduğuna kalpten inanıp dil ile ikrar etmek.',
    },
  },
  {
    order: 2,
    slug: 'salah',
    arabicName: 'الصَّلَاة',
    transliteration: 'As-Salah',
    titles: {
      es: '2. Salah (Las Cinco Oraciones Diarias)',
      en: '2. Salah (The Five Daily Prayers)',
      ar: '٢. إقام الصلاة',
      tr: '2. Namaz (Salât)',
    },
    summaries: {
      es: 'Vínculo espiritual directo con el Creador cinco veces al día en dirección a la Qibla (Fajr, Dhuhr, Asr, Maghrib e Isha).',
      en: 'Direct spiritual connection with the Creator five times daily facing the Qibla (Fajr, Dhuhr, Asr, Maghrib, and Isha).',
      ar: 'الصلة اليومية المباشرة بين العبد وربه خمس مرات في اليوم والليلة.',
      tr: 'Günde beş vakit Kıble’ye yönelerek Allah’ın huzurunda durmak ve kulluğu yenilemek.',
    },
  },
  {
    order: 3,
    slug: 'zakat',
    arabicName: 'الزَّكَاة',
    transliteration: 'Az-Zakah',
    titles: {
      es: '3. Zakat (Purificación Solidaria de la Riqueza — 2.5%)',
      en: '3. Zakat (Obligatory Almsgiving — 2.5%)',
      ar: '٣. إيتاء الزكاة',
      tr: '3. Zekât',
    },
    summaries: {
      es: 'Aporte anual del 2.5% del patrimonio neto que supera el Nisab para dignificar a los vulnerables y sostener la comunidad.',
      en: 'Annual contribution of 2.5% of net wealth above the Nisab threshold to uplift those in need.',
      ar: 'تطهير المال ومواساة الفقراء والمستحقين بنسبة ٢.٥٪ ممن بلغ النصاب وحال عليه الحول.',
      tr: 'Nisap miktarını aşan mal varlığının yılda %2,5’ini ihtiyaç sahipleriyLe paylaşarak malı arındırmak.',
    },
  },
  {
    order: 4,
    slug: 'sawm',
    arabicName: 'الصَّوْم',
    transliteration: 'As-Sawm',
    titles: {
      es: '4. Sawm (Ayuno del Mes de Ramadán)',
      en: '4. Sawm (Fasting in the Month of Ramadan)',
      ar: '٤. صوم رمضان',
      tr: '4. Ramazan Orucu (Savm)',
    },
    summaries: {
      es: 'Abstinencia desde el alba (Fajr) hasta el ocaso (Maghrib) durante Ramadán para cultivar Taqwa, gratitud y empatía.',
      en: 'Abstaining from dawn (Fajr) to sunset (Maghrib) during Ramadan to nurture Taqwa, gratitude, and compassion.',
      ar: 'الإمساك عن المفطرات من الفجر إلى المغرب إيماناً واحتساباً طوال شهر رمضان.',
      tr: 'Ramazan ayı boyunca imsak vaktinden akşam ezanına kadar ibadet niyetiyle oruç tutmak.',
    },
  },
  {
    order: 5,
    slug: 'hajj',
    arabicName: 'الْحَجّ',
    transliteration: 'Al-Hajj',
    titles: {
      es: '5. Hajj (Peregrinación a La Meca)',
      en: '5. Hajj (Pilgrimage to Makkah)',
      ar: '٥. حج البيت لمن استطاع إليه سبيلا',
      tr: '5. Hac',
    },
    summaries: {
      es: 'Peregrinación a la Sagrada Kaaba en La Meca al menos una vez en la vida para quien disponga de salud y medios.',
      en: 'Pilgrimage to the Sacred Kaaba in Makkah once in a lifetime for those physically and financially able.',
      ar: 'قصد بيت الله الحرام بمكة المكرمة لأداء المناسك مرة في العمر للمستطيع.',
      tr: 'Sağlık ve mali imkânı elverenlerin ömründe bir kez Mekke’deki Kâbe-i Muazzama’yı ziyaret ederek hac menasikini yerine getirmesi.',
    },
  },
];

export function getDailyInspirationBundle(
  dateIso: string,
  locale: SupportedLocale = 'es',
  pins?: DailyInspirationPins
): DailyInspirationBundle {
  const cleanDate = dateIso.slice(0, 10);
  const seed = cleanDate
    .split('-')
    .reduce((acc, part) => acc * 31 + Number(part || 1), 7);

  const pinnedAyah = pins?.pinnedAyahId
    ? CURATED_AYAT.find((a) => a.id === pins.pinnedAyahId)
    : undefined;
  const pinnedHadith = pins?.pinnedHadithId
    ? CURATED_HADITHS.find((h) => h.id === pins.pinnedHadithId)
    : undefined;
  const pinnedDua = pins?.pinnedDuaId
    ? CURATED_DUAS.find((d) => d.id === pins.pinnedDuaId)
    : undefined;
  const pinnedAsma = pins?.pinnedAsmaNumber
    ? ASMA_UL_HUSNA.find((n) => n.number === pins.pinnedAsmaNumber)
    : undefined;

  return {
    date: cleanDate,
    locale,
    ayahOfTheDay: pinnedAyah || CURATED_AYAT[Math.abs(seed) % CURATED_AYAT.length],
    hadithOfTheDay:
      pinnedHadith || CURATED_HADITHS[Math.abs(seed + 3) % CURATED_HADITHS.length],
    duaOfTheDay: pinnedDua || CURATED_DUAS[Math.abs(seed + 5) % CURATED_DUAS.length],
    nameOfAllahOfTheDay:
      pinnedAsma || ASMA_UL_HUSNA[Math.abs(seed + 7) % ASMA_UL_HUSNA.length],
    isPinnedOverride: {
      ayah: Boolean(pinnedAyah),
      hadith: Boolean(pinnedHadith),
      dua: Boolean(pinnedDua),
      asma: Boolean(pinnedAsma),
    },
  };
}
