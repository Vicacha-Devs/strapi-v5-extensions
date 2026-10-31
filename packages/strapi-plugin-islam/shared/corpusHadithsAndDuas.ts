import type { CuratedDuaItem, CuratedHadithItem } from './types';

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
