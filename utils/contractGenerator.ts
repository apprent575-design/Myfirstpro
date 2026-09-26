import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { RentalContract, ContractInventorySection } from '../types';
import { contractDurationLabel } from './contractStore';

/* -------------------------------------------------------------------------
   عقد الإيجار + ملحق قائمة المنقولات — أبيض وأسود، رسمي، جاهز للطباعة
   كل نصوص العقد في مكان واحد (CONTRACT_CLAUSES + buildContractHtml).
   الصياغة مأخوذة من نموذج العقد المرفق: عقد إيجار شاليه سياحي (مؤقت).
   ------------------------------------------------------------------------- */

// A4 at 96dpi
const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN_X = 48;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOP_FIRST = 54;
const TOP_NEXT = 96;
const FOOTER_H = 78;
const SCALE = 2;
// أقصى عدد صفوف في جدول المنقولات قبل ما يتقسّم (عشان ما يتقطعش بين صفحتين)
const INVENTORY_CHUNK_ROWS = 14;

const FIRST_PAGE_AVAIL = PAGE_H - TOP_FIRST - FOOTER_H;
const NEXT_PAGE_AVAIL = PAGE_H - TOP_NEXT - FOOTER_H;

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? escapeHtml(iso) : format(d, 'd/M/yyyy');
};

const fmtWeekday = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? '—' : format(d, 'EEEE', { locale: arSA });
};

const money = (value?: number) => `${(value || 0).toLocaleString('en-US')} جنيهًا مصريًا`;

const partyNameWithTitle = (party: { title: string; name: string }) =>
  `${party.title}/ ${party.name}`.trim();

const typeLabel = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'chalet': return 'شاليه';
    case 'villa': return 'فيلا';
    case 'palace': return 'قصر';
    default: return type || 'وحدة';
  }
};

const contractTitle = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'chalet': return 'عقد إيجار شاليه سياحي (مؤقت)';
    case 'villa': return 'عقد إيجار فيلا سياحية (مؤقت)';
    case 'palace': return 'عقد إيجار قصر سياحي (مؤقت)';
    default: return 'عقد إيجار وحدة سكنية (مؤقت)';
  }
};

// "صن لايت" و"قرية صن لايت" لازم يطلعوا بنفس الشكل بدون تكرار كلمة قرية
const villageLabel = (name?: string) => {
  const value = (name || '').trim();
  if (!value) return '';
  return value.includes('قرية') ? value : `قرية ${value}`;
};

const tenantsLabel = (count: number) => (count > 1 ? 'المستأجرون' : 'المستأجر');

// هل قائمة المنقولات مفعّلة في العقد ده؟
export const hasInventory = (c: RentalContract) =>
  Boolean(c.inventory_enabled) && (c.inventory?.length || 0) > 0;

// ---- نصوص بنود العقد (تعديل الصياغة يتم من هنا) ----
export const CONTRACT_CLAUSES: {
  title: string | ((c: RentalContract) => string);
  body: (c: RentalContract) => string;
}[] = [
  {
    title: 'البند الأول (موضوع العقد)',
    body: c =>
      `أجر الطرف الأول بموجب هذا العقد للطرف الثاني ${typeLabel(c.unit_type)} رقم (${c.unit_name || '—'})` +
      `${c.village_name ? ` الكائن بـ${villageLabel(c.village_name)}` : ''}${c.unit_phase ? ` - ${c.unit_phase}` : ''}، ` +
      `والمكوّن من أثاث ومعدات وأجهزة كهربائية${
        hasInventory(c)
          ? ' (المبيّنة تفصيلًا بقائمة المنقولات المرفقة بالعقد، والتي تُعد جزءًا لا يتجزأ منه ومكمّلة لأحكامه)'
          : ''
      }، وذلك بغرض السكن السياحي المؤقت فقط.`,
  },
  {
    title: 'البند الثاني (مدة الإيجار)',
    body: c =>
      `تبدأ مدة الإيجار من يوم ${fmtDate(c.start_date)} وتنتهي في يوم ${fmtDate(c.end_date)}، ومقدارها ${contractDurationLabel(c)}، ` +
      `وتلتزم ${tenantsLabel(c.parties?.length || 1)} بإخلاء العين وتسليمها للمؤجر في نهاية هذه المدة دون الحاجة إلى تنبيه أو إنذار سابق.`,
  },
  {
    title: 'البند الثالث (القيمة الإيجارية والتأمين)',
    body: c =>
      `اتفق الطرفان على إجمالي قيمة إيجارية قدرها ${money(c.rent_amount)} عن كامل المدة، ` +
      `${c.payment_terms || 'سُددت بالكامل عند توقيع العقد.'} كما سدد الطرف الثاني مبلغ وقدره ${money(c.deposit_amount)} ` +
      `كـ تأمين تلفيات، يُرد بالكامل عند المغادرة بعد معاينة العين والتأكد من سلامة المحتويات المطابقة للقائمة المرفقة ` +
      `وسداد أي استهلاكات للمرافق إن وُجدت.`,
  },
  {
    title: 'البند الرابع (طبيعة الإقامة والأفراد)',
    body: c =>
      `الإقامة مقصورة حصريًا على ${tenantsLabel(c.parties?.length || 1)} المذكورة أسماؤهم وأرقامهم القومية في هذا العقد، ` +
      `ويُحظر تمامًا التنازل عن العين أو تأجيرها من الباطن أو استضافة أفراد إضافيين للمبيت دون الحصول على موافقة كتابية مسبقة من المؤجر.`,
  },
  {
    title: 'البند الخامس (قواعد الاستخدام والأنظمة)',
    body: c =>
      `يتعهد الطرف الثاني بالحفاظ على ${typeLabel(c.unit_type)} وكافة أثاثه وأجهزته بحالة جيدة، والالتزام بالقواعد والتعليمات العامة ` +
      `الخاصة بإدارة ${c.village_name ? villageLabel(c.village_name) : 'القرية'} وأمنها الداخلي، ومراعاة الهدوء وعدم إزعاج الجيران، ` +
      `وعدم القيام بأي أعمال تخالف النظام العام أو الآداب.`,
  },
  {
    title: c => `البند السادس (المعاينة والتسليم${hasInventory(c) ? ' وقائمة المنقولات' : ''})`,
    body: c =>
      hasInventory(c)
        ? `يقر الطرف الثاني بأنه قد عاين العين والمحتويات معاينة تامة نافية للجهالة وشهد بسلامة وصلاحية كافة الأثاث والأجهزة للاستخدام ` +
          `الشخصي وفقًا للقائمة المرفقة بالعقد (قائمة المنقولات والمحتويات)، ويتعهد بتسليم كافة المحتويات المدرجة بالقائمة بنفس الحالة ` +
          `عند انتهاء مدة الإيجار.`
        : `يقر الطرف الثاني بأنه قد عاين العين ومحتوياتها معاينة تامة نافية للجهالة وشهد بسلامة وصلاحية كافة الأثاث والأجهزة للاستخدام ` +
          `الشخصي، ويتعهد بتسليم كافة المحتويات بنفس الحالة التي تم استلامها عليها عند انتهاء مدة الإيجار.`,
  },
  {
    title: 'البند السابع (الفسخ والشرط الجزائي)',
    body: () =>
      `في حالة مخالفة أي بند من بنود هذا العقد، يحق للطرف الأول فسخ العقد فورًا وإلزام الطرف الثاني بإخلاء العين فورًا مع خصم قيمة ` +
      `التلفيات -إن وُجدت- من مبلغ التأمين وحفظ كافة حقوق الطرف الأول القانونية.`,
  },
  {
    title: c =>
      hasInventory(c)
        ? 'البند الثامن (قائمة المنقولات المرفقة والتعهد بالحفاظ عليها)'
        : 'البند الثامن (التعهد بالحفاظ على المحتويات)',
    body: c =>
      hasInventory(c)
        ? `تُعدّ قائمة المنقولات والأجهزة المرفقة بهذا العقد ملحقًا أصليًا وجزءًا لا يتجزأ منه، وتُوقّع من الطرفين كإقرار باستلام المحتويات ` +
          `بحالة جيدة وصالحة للاستخدام. ويتعهد الطرف الثاني بالحفاظ عليها، وردّها بنفس الحالة التي تم استلامها عليها عند انتهاء مدة الإيجار ` +
          `والإخلاء. وفي حالة تلف أو فقدان أي بند من المنقولات، يحق للطرف الأول (المؤجر) خصم قيمته من مبلغ التأمين أو مطالبة الطرف الثاني ` +
          `بتعويض قيمته كاملًا.` +
          `${c.inventory_value > 0 ? ` وتُقدَّر القيمة الإجمالية للمنقولات المذكورة بالقائمة بمبلغ وقدره ${money(c.inventory_value)}.` : ''}`
        : `يتعهد الطرف الثاني بالحفاظ على محتويات العين من أثاث وأجهزة ومفروشات، وردّها بنفس الحالة التي تم استلامها عليها عند انتهاء مدة ` +
          `الإيجار والإخلاء. وفي حالة تلف أو فقدان أي منها، يحق للطرف الأول (المؤجر) خصم قيمته من مبلغ التأمين أو مطالبة الطرف الثاني ` +
          `بتعويض قيمته كاملًا.`,
  },
];

const th = (label: string, width?: string) =>
  `<td style="border:1px solid #000;padding:6px 8px;background:#f2f2f2;font-weight:bold;text-align:right;${width ? `width:${width};` : ''}">${escapeHtml(label)}</td>`;

const td = (value: string, extra = '') =>
  `<td style="border:1px solid #000;padding:6px 8px;text-align:right;${extra}">${value || '—'}</td>`;

// بيانات طرف واحد في سطر: الاسم / الرقم القومي / الهاتف
const partyRow = (party: RentalContract['parties'][number], index: number) =>
  `<tr>${td(String(index + 1), 'width:32px;text-align:center;')}${td(escapeHtml(partyNameWithTitle(party)))}` +
  `${td(escapeHtml(party.national_id), 'width:190px;')}${td(escapeHtml(party.phone), 'width:140px;')}</tr>`;

// جدول بند من بنود قائمة المنقولات (بيتقسّم لو الصفوف كتير)
const inventoryTable = (
  section: ContractInventorySection,
  items: ContractInventorySection['items'],
  startIndex: number
) => `
  <table style="width:100%;border-collapse:collapse;font-size:12.5px;direction:rtl;table-layout:fixed;">
    <tr>
      ${th('م', '30px')}
      ${th(section.nameHeader, '22%')}
      ${th(section.specsHeader, '40%')}
      ${th(section.countHeader, '13%')}
      ${th(section.conditionHeader, '17%')}
    </tr>
    ${items
      .map(
        (item, idx) =>
          `<tr>${td(String(startIndex + idx + 1), 'text-align:center;')}${td(escapeHtml(item.name))}` +
          `${td(escapeHtml(item.specs))}${td(escapeHtml(item.count), 'text-align:center;')}${td(escapeHtml(item.condition))}</tr>`
      )
      .join('')}
  </table>`;

export const buildContractHtml = (contract: RentalContract): string => {
  const parties = contract.parties?.length ? contract.parties : [];
  const inventory = contract.inventory || [];
  const block = (inner: string, extra = '') =>
    `<section data-block="1" style="margin:0 0 14px;${extra}">${inner}</section>`;
  const breakBlock = (inner: string) =>
    `<section data-block="1" data-break="1" style="margin:0 0 14px;">${inner}</section>`;

  // ---------- توقيعات العقد الأساسي ----------
  const tenantsSignatureCell =
    `<div style="font-weight:bold;margin-bottom:10px;">الطرف الثاني (${tenantsLabel(parties.length)})</div>` +
    parties
      .map(
        (p, i) =>
          `<div style="margin-bottom:${i === parties.length - 1 ? '0' : '14'}px;">` +
          `<div style="margin-bottom:4px;">${parties.length > 1 ? `(${i + 1}) ` : ''}الاسم: ${escapeHtml(partyNameWithTitle(p))}</div>` +
          `<div>التوقيع: .....................</div></div>`
      )
      .join('');

  const signatures = `
    <section data-block="1" style="margin:0 0 14px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;table-layout:fixed;">
        <tr>
          <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;width:50%;">
            <div style="font-weight:bold;margin-bottom:10px;">الطرف الأول (المؤجر)</div>
            <div style="margin-bottom:6px;">الاسم: ${escapeHtml(contract.landlord?.name)}</div>
            <div style="margin-top:22px;">التوقيع: .....................</div>
          </td>
          <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;width:50%;">
            ${tenantsSignatureCell}
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;">
            <div style="font-weight:bold;margin-bottom:14px;">شاهد أول</div>
            <div style="margin-bottom:6px;">الاسم: .....................</div>
            <div style="margin-top:22px;">التوقيع: .....................</div>
          </td>
          <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;">
            <div style="font-weight:bold;margin-bottom:14px;">شاهد ثاني</div>
            <div style="margin-bottom:6px;">الاسم: .....................</div>
            <div style="margin-top:22px;">التوقيع: .....................</div>
          </td>
        </tr>
      </table>
    </section>`;

  // ---------- ملحق قائمة المنقولات ----------
  const unitForAnnex = `${typeLabel(contract.unit_type)} (${contract.unit_name || '—'})`;

  const annexHeader = breakBlock(
    `<div style="text-align:center;">
       <div style="font-size:20px;font-weight:bold;">ملحق العقد: محضر حصر وقائمة منقولات ${escapeHtml(unitForAnnex)}</div>
       <div style="font-size:13px;font-weight:bold;margin-top:4px;">
         ${escapeHtml(villageLabel(contract.village_name))}${contract.unit_phase ? ` - ${escapeHtml(contract.unit_phase)}` : ''} — وثيقة تسليم ومعاينة رسمية
       </div>
       <div style="border-top:2px solid #000;margin-top:10px;"></div>
       <div style="border-top:1px solid #000;margin-top:2px;"></div>
       <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:bold;margin-top:8px;direction:rtl;">
         <span>رقم العقد: ${escapeHtml(contract.number)}</span>
         <span>التاريخ: ${fmtDate(contract.contract_date)}</span>
       </div>
     </div>`
  );

  const inventoryBlocks = inventory
    .map(section => {
      const items = section.items || [];
      if (!items.length) return '';
      const chunks: ContractInventorySection['items'][] = [];
      for (let i = 0; i < items.length; i += INVENTORY_CHUNK_ROWS) {
        chunks.push(items.slice(i, i + INVENTORY_CHUNK_ROWS));
      }
      // عنوان البند مع أول جزء من الجدول، وباقي الأجزاء لوحدها
      return chunks
        .map((chunk, chunkIndex) =>
          block(
            `${
              chunkIndex === 0
                ? `<div style="font-weight:bold;font-size:14.5px;margin-bottom:6px;">${escapeHtml(section.title)}</div>`
                : ''
            }${inventoryTable(section, chunk, chunkIndex * INVENTORY_CHUNK_ROWS)}`
          )
        )
        .join('');
    })
    .join('');

  const inventoryTotalLine =
    contract.inventory_value > 0
      ? block(
          `<div style="font-weight:bold;">إجمالي قيمة المنقولات والأجهزة محل هذا المحضر: ${money(
            contract.inventory_value
          )}</div>`
        )
      : '';

  const annexDeclaration = block(
    `<div style="font-weight:bold;font-size:14.5px;margin-bottom:6px;">إقرار ومعاينة واستلام رسمية</div>
     <div style="text-align:justify;font-size:13px;">
       "أقر أنا الموقع أدناه بأني قد عاينت واستلمت جميع المنقولات والأجهزة الكهربائية والمفروشات الموضحة في الكشف أعلاه الخاصة بـ${escapeHtml(
         unitForAnnex
       )}، وقد وجدتها جميعًا بحالة جيدة وشغالة ومستوفية للمواصفات المذكورة، وأتعهد بالحفاظ عليها وتسليمها بنفس الحالة عند نهاية فترة الاستخدام أو بناءً على الطلب."
     </div>`
  );

  const annexSignatures = block(
    `<table style="width:100%;border-collapse:collapse;font-size:12.5px;direction:rtl;table-layout:fixed;">
       <tr>
         <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;width:34%;">
           <div style="font-weight:bold;margin-bottom:12px;">الطرف الأول (المسلّم/المؤجر)</div>
           <div style="margin-bottom:6px;">الاسم: ${escapeHtml(contract.landlord?.name)}</div>
           <div style="margin-bottom:6px;">التوقيع: .....................</div>
           <div>التاريخ: ${fmtDate(contract.contract_date)}</div>
         </td>
         <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;width:33%;">
           <div style="font-weight:bold;margin-bottom:12px;">الطرف الثاني (المستلم/المستأجر)</div>
           <div style="margin-bottom:6px;">الاسم: ${escapeHtml(parties[0] ? partyNameWithTitle(parties[0]) : '')}</div>
           <div style="margin-bottom:6px;">الرقم القومي: ${escapeHtml(parties[0]?.national_id || '')}</div>
           <div>التوقيع: .....................</div>
         </td>
         <td style="border:1px solid #000;padding:10px 12px;vertical-align:top;width:33%;">
           <div style="font-weight:bold;margin-bottom:12px;">الشاهد / المسؤول</div>
           <div style="margin-bottom:6px;">الاسم: .....................</div>
           <div style="margin-bottom:6px;">الصفة: .....................</div>
           <div>التوقيع: .....................</div>
         </td>
       </tr>
     </table>`
  );

  const notesBlock = contract.notes
    ? block(
        `<div style="font-weight:bold;font-size:14.5px;margin-bottom:2px;">ملاحظات</div>
         <div style="text-align:justify;">${escapeHtml(contract.notes)}</div>`
      )
    : '';

  return `
  <div style="direction:rtl;text-align:right;color:#000;background:#fff;font-size:13.5px;line-height:1.9;">

    ${block(
      `<div style="text-align:center;">
        <div style="font-size:28px;font-weight:bold;letter-spacing:1px;">${escapeHtml(contractTitle(contract.unit_type))}</div>
        <div style="font-size:14px;font-weight:bold;margin-top:4px;">${escapeHtml(villageLabel(contract.village_name))}${
          contract.unit_phase ? ` - ${escapeHtml(contract.unit_phase)}` : ''
        }${contract.unit_name ? ` (${escapeHtml(contract.unit_name)})` : ''}</div>
        <div style="border-top:2px solid #000;margin-top:10px;"></div>
        <div style="border-top:1px solid #000;margin-top:2px;"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-top:8px;direction:rtl;">
          <span>رقم العقد: ${escapeHtml(contract.number)}</span>
          <span>التاريخ: ${fmtDate(contract.contract_date)}</span>
        </div>
        <div style="font-size:13.5px;font-weight:bold;margin-top:8px;text-align:right;">
          إنه في يوم ${fmtWeekday(contract.contract_date)} الموافق ${fmtDate(contract.contract_date)}م، تم الاتفاق بين كل من:
        </div>
      </div>`,
      'margin-bottom:18px;'
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">أولًا: الطرف الأول (المؤجر)</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('الاسم', '150px')}${td(escapeHtml(contract.landlord?.name))}</tr>
         <tr>${th('الرقم القومي', '150px')}${td(escapeHtml(contract.landlord?.national_id))}</tr>
         <tr>${th('الجنسية', '150px')}${td(escapeHtml(contract.landlord?.nationality))}</tr>
         <tr>${th('رقم الهاتف', '150px')}${td(escapeHtml(contract.landlord?.phone))}</tr>
         <tr>${th('المقيم في', '150px')}${td(escapeHtml(contract.landlord?.address))}</tr>
       </table>`
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">ثانيًا: الطرف الثاني (${tenantsLabel(
        parties.length
      )})</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('م', '32px')}${th('الاسم')}${th('الرقم القومي', '190px')}${th('رقم الهاتف', '140px')}</tr>
         ${parties.map(partyRow).join('')}
       </table>`
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">بيانات الوحدة ومدة الإيجار</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('الوحدة', '150px')}${td(escapeHtml(contract.unit_name))}${th('النوع', '110px')}${td(
        escapeHtml(typeLabel(contract.unit_type))
      )}</tr>
         <tr>${th('القرية', '150px')}${td(escapeHtml(villageLabel(contract.village_name)))}${th('المرحلة', '110px')}${td(
        escapeHtml(contract.unit_phase)
      )}</tr>
         <tr>${th('مدة الإيجار', '150px')}${td(escapeHtml(contractDurationLabel(contract)))}${
        hasInventory(contract)
          ? `${th('عدد المنقولات', '110px')}${td(String(inventory.reduce((sum, s) => sum + (s.items?.length || 0), 0)))}`
          : `${th('تاريخ العقد', '110px')}${td(fmtDate(contract.contract_date))}`
      }</tr>
         <tr>${th('بداية الإيجار', '150px')}${td(fmtDate(contract.start_date))}${th('نهاية الإيجار', '110px')}${td(
        fmtDate(contract.end_date)
      )}</tr>
       </table>`
    )}

    ${CONTRACT_CLAUSES.map(clause =>
      block(
        `<div style="font-weight:bold;font-size:14.5px;margin-bottom:2px;">${escapeHtml(
          typeof clause.title === 'function' ? clause.title(contract) : clause.title
        )}</div>
         <div style="text-align:justify;">${clause.body(contract)}</div>`
      )
    ).join('')}

    ${notesBlock}

    ${block(
      `حُرر هذا العقد بتاريخ ${fmtDate(contract.contract_date)}، وتسلم كل طرف نسخة منه للعمل بها عند الحاجة.`
    )}

    ${signatures}

    ${
      hasInventory(contract)
        ? `${annexHeader}${inventoryBlocks}${inventoryTotalLine}${annexDeclaration}${annexSignatures}`
        : ''
    }
  </div>`;
};

/* ---------------- تقسيم المحتوى على صفحات A4 بدون قص أي بند ---------------- */

export interface ContractPage {
  y: number;
  h: number;
}

export interface ContractBlock {
  top: number;
  height: number;
  forceBreak?: boolean;
}

export const computeContractPages = (
  blocks: ContractBlock[],
  contentHeight: number
): ContractPage[] => {
  const pages: ContractPage[] = [];
  let pageIndex = 0;
  let pageStart = 0;
  const avail = () => (pageIndex === 0 ? FIRST_PAGE_AVAIL : NEXT_PAGE_AVAIL);

  const closePage = (endY: number) => {
    if (endY - pageStart > 1) pages.push({ y: pageStart, h: endY - pageStart });
    pageStart = endY;
    pageIndex += 1;
  };

  for (const b of blocks) {
    if (b.height <= 0) continue;
    const blockEnd = b.top + b.height;

    // بداية صفحة جديدة مفروضة (مثال: ملحق قائمة المنقولات)
    if (b.forceBreak && b.top > pageStart) closePage(b.top);

    if (blockEnd - pageStart <= avail()) continue;

    // ابدأ صفحة جديدة عند بداية البند نفسه — فلا يتقطع أي بند بين صفحتين
    if (b.top > pageStart) closePage(b.top);

    // بند أطول من صفحة كاملة: يُقسَّم على أكثر من صفحة
    while (blockEnd - pageStart > avail()) {
      closePage(pageStart + avail());
    }
  }

  if (contentHeight > pageStart) pages.push({ y: pageStart, h: contentHeight - pageStart });
  return pages.filter(p => p.h > 1);
};

const drawContinuationHeader = (ctx: CanvasRenderingContext2D, contractNumber: string) => {
  ctx.fillStyle = '#000';
  ctx.direction = 'rtl';
  ctx.font = `bold ${14 * SCALE}px Cairo, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('عقد إيجار (تابع)', (PAGE_W - MARGIN_X) * SCALE, 46 * SCALE);

  ctx.font = `${12 * SCALE}px Cairo, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`رقم العقد: ${contractNumber}`, MARGIN_X * SCALE, 46 * SCALE);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1 * SCALE;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X * SCALE, 58 * SCALE);
  ctx.lineTo((PAGE_W - MARGIN_X) * SCALE, 58 * SCALE);
  ctx.stroke();
};

const drawFooter = (ctx: CanvasRenderingContext2D, page: number, total: number) => {
  const y = PAGE_H - 46;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1 * SCALE;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X * SCALE, y * SCALE);
  ctx.lineTo((PAGE_W - MARGIN_X) * SCALE, y * SCALE);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = `${11.5 * SCALE}px Cairo, sans-serif`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText(`صفحة ${page} من ${total}`, (PAGE_W / 2) * SCALE, (y + 24) * SCALE);
};

// كل صفحة A4 جاهزة كصورة (أبيض وأسود) — منها بيتكوّن ملف الـ PDF
export const buildContractPageCanvases = async (contract: RentalContract): Promise<HTMLCanvasElement[]> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '0';
  container.style.width = `${CONTENT_W}px`;
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Cairo', sans-serif";
  container.style.direction = 'rtl';
  container.style.textAlign = 'right';
  container.innerHTML = buildContractHtml(contract);
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 600));

    const blocks: ContractBlock[] = Array.from(
      container.querySelectorAll('[data-block]') as NodeListOf<HTMLElement>
    ).map(el => ({
      top: el.offsetTop,
      height: el.offsetHeight,
      forceBreak: el.dataset.break === '1',
    }));
    const contentHeight = container.scrollHeight;
    const pages = computeContractPages(blocks, contentHeight);

    const canvas = await html2canvas(container, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: clonedDoc => {
        const style = clonedDoc.createElement('style');
        style.innerHTML = `* { font-family: 'Cairo', sans-serif !important; letter-spacing: 0px !important; }`;
        clonedDoc.head.appendChild(style);
      },
    });

    return pages.map((page, index) => {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = PAGE_W * SCALE;
      pageCanvas.height = PAGE_H * SCALE;
      const ctx = pageCanvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      const destY = index === 0 ? TOP_FIRST : TOP_NEXT;
      ctx.drawImage(
        canvas,
        0,
        Math.round(page.y * SCALE),
        canvas.width,
        Math.round(page.h * SCALE),
        MARGIN_X * SCALE,
        destY * SCALE,
        CONTENT_W * SCALE,
        Math.round(page.h * SCALE)
      );

      if (index > 0) drawContinuationHeader(ctx, String(contract.number || ''));
      drawFooter(ctx, index + 1, pages.length);

      return pageCanvas;
    });
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
  }
};

export const generateContractPdf = async (contract: RentalContract, fileName?: string) => {
  try {
    const pageCanvases = await buildContractPageCanvases(contract);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWmm = pdf.internal.pageSize.getWidth();
    const pageHmm = pdf.internal.pageSize.getHeight();

    pageCanvases.forEach((pageCanvas, index) => {
      if (index > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWmm, pageHmm);
    });

    const safeName = (contract.parties?.[0]?.name || 'Contract').replace(/[\\/:*?"<>|]/g, '').trim();
    pdf.save(fileName || `Rental_Contract_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Contract PDF generation failed:', error);
    alert('تعذر إنشاء ملف العقد، حاول مرة أخرى.');
  }
};
