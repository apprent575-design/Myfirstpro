import { ContractInventoryItem, ContractInventorySection } from '../types';

/* -------------------------------------------------------------------------
   قائمة المنقولات الافتراضية (ملحق العقد)
   دي نفس البنود والبيانات المكتوبة في نموذج العقد المرفق (شاليه 2ج)،
   وبتتحط أوتوماتيك في أي عقد جديد — وتقدر تعدّل/تمسح/تزوّد من الموقع.
   ------------------------------------------------------------------------- */

export interface InventoryItemTemplate {
  name: string;
  specs: string;
  count: string;
  condition: string;
}

export interface InventorySectionTemplate {
  title: string;
  nameHeader: string;
  specsHeader: string;
  countHeader: string;
  conditionHeader: string;
  items: InventoryItemTemplate[];
}

export const DEFAULT_INVENTORY: InventorySectionTemplate[] = [
  {
    title: 'أولاً: الأجهزة الكهربائية والإلكترونية (Electrical & Electronics)',
    nameHeader: 'اسم الجهاز / البند',
    specsHeader: 'المواصفات والماركة',
    countHeader: 'العدد',
    conditionHeader: 'الحالة التشغيلية',
    items: [
      { name: 'ديب فريزر', specs: 'سعة 5 درج - ماركة توشيبا (Toshiba)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'ثلاجة منزلية', specs: 'سعة 12 قدم - ماركة كريازي (Kiriazi)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'بوتاجاز مطبخ', specs: '5 شعلة - ماركة كريازي (Kiriazi)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'ميكروويف', specs: 'سعة 25 لتر بحالة ممتازة', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'مبرد مياه (Dispenser)', specs: 'مبرد مياه ساخن / بارد', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'غسالة ملابس', specs: 'نصف أوتوماتيك - ماركة فريش (Fresh)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'سخان مياه', specs: 'كهربائي - ماركة أوليمبيك (Olympic)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'أجهزة تكييف هواء', specs: 'أجهزة تكييف مع الريموتات الخاصة بها', count: '3', condition: 'ممتازة / يعمل' },
      { name: 'شاشة عرض تلفزيونية', specs: 'مقاس 45 بوصة - ماركة يونيون اير (Unionaire)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'جهاز رسيفر', specs: 'جهاز استقبال قنوات فضائية + الريموت', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'راوتر انترنت', specs: 'جهاز راوتر شبكة فودافون (Vodafone)', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'مكنسة كهربائية', specs: 'مكنسة تنظيف بالملحقات الخاصة بها', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'خلاط مطبخ', specs: 'خلاط متعدد الاستخدامات مع الدورق', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'غلاية مياه (كاتل)', specs: 'غلاية مياه كهربائية للمطبخ', count: '1', condition: 'ممتازة / يعمل' },
      { name: 'غلاية قهوة (كاتل)', specs: 'كنكة / غلاية قهوة كهربائية', count: '1', condition: 'ممتازة / يعمل' },
    ],
  },
  {
    title: 'ثانياً: الأثاث والمفروشات والتجهيزات (Furniture & Fixtures)',
    nameHeader: 'البند / المكون',
    specsHeader: 'الوصف والتفاصيل',
    countHeader: 'العدد',
    conditionHeader: 'حالة الاستلام',
    items: [
      { name: 'طقم ركنة مع طاولة', specs: 'طقم ركنة مكون من 3 كنبات حجم كبير + ترابيزة ركنة', count: '1 طقم', condition: 'سليمة وجيدة' },
      { name: 'طاولة زجاجية داخلية', specs: 'ترابيزة زجاجية مع مجموعة الكراسي الملحقة بها', count: '1 طقم', condition: 'سليمة وجيدة' },
      { name: 'طاولة حديقة خارجية', specs: 'ترابيزة حديقة خاصة بالجلسة الخارجية مع الكراسي', count: '1 طقم', condition: 'سليمة وجيدة' },
      { name: 'جزامة تنظيم الأحذية', specs: 'جزامة بلاستيكية لترتيب الأحذية', count: '1', condition: 'سليمة وجيدة' },
      { name: 'مطبخ أمريكي بأدواته', specs: 'وحدات مطبخ أمريكي (American Kitchen) شامل أدوات المطبخ كاملة', count: 'متكامل', condition: 'سليمة وجيدة' },
      { name: 'غرفة نوم رئيسية (أ)', specs: 'عدد 2 سرير عرض 120 سم + دولاب ملابس + بوف + مروحة (سقف / ستاند)', count: '1 غرفة', condition: 'سليمة وجيدة' },
      { name: 'غرفة نوم إضافية (ب)', specs: 'عدد 2 سرير عرض 120 سم + دولاب ملابس + بوف + مروحة (سقف / ستاند)', count: '1 غرفة', condition: 'سليمة وجيدة' },
    ],
  },
];

export const newInventoryId = (prefix: string) => {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return `${prefix}_${c.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const createInventoryItem = (overrides: Partial<ContractInventoryItem> = {}): ContractInventoryItem => ({
  id: overrides.id || newInventoryId('item'),
  name: overrides.name || '',
  specs: overrides.specs || '',
  count: overrides.count || '1',
  condition: overrides.condition || 'ممتازة / يعمل',
});

export const createInventorySection = (
  overrides: Partial<ContractInventorySection> = {},
  items: ContractInventoryItem[] = []
): ContractInventorySection => ({
  id: overrides.id || newInventoryId('sec'),
  title: overrides.title || 'بند جديد',
  nameHeader: overrides.nameHeader || 'البند',
  specsHeader: overrides.specsHeader || 'المواصفات',
  countHeader: overrides.countHeader || 'العدد',
  conditionHeader: overrides.conditionHeader || 'الحالة',
  items,
});

// القايمة الافتراضية جاهزة للاستخدام في أي عقد جديد
export const buildDefaultInventory = (): ContractInventorySection[] =>
  DEFAULT_INVENTORY.map(section =>
    createInventorySection(
      {
        title: section.title,
        nameHeader: section.nameHeader,
        specsHeader: section.specsHeader,
        countHeader: section.countHeader,
        conditionHeader: section.conditionHeader,
      },
      section.items.map(item => createInventoryItem(item))
    )
  );

export const normalizeInventory = (raw: any): ContractInventorySection[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((section: any) =>
    createInventorySection(
      {
        id: section?.id,
        title: section?.title || 'بند',
        nameHeader: section?.nameHeader || 'البند',
        specsHeader: section?.specsHeader || 'المواصفات',
        countHeader: section?.countHeader || 'العدد',
        conditionHeader: section?.conditionHeader || 'الحالة',
      },
      Array.isArray(section?.items)
        ? section.items.map((item: any) =>
            createInventoryItem({
              id: item?.id,
              name: item?.name || '',
              specs: item?.specs || '',
              count: String(item?.count ?? ''),
              condition: item?.condition || '',
            })
          )
        : []
    )
  );
};
