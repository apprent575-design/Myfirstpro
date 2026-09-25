import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { RentalContract } from '../types';
import { contractDurationLabel } from './contractStore';

/* -------------------------------------------------------------------------
   عقد الإيجار — القالب الرسمي (أبيض وأسود)
   كل نصوص العقد موجودة هنا في مكان واحد: CONTRACT_CLAUSES + buildContractHtml.
   لو محتاج تغيّر صياغة أي بند أو تلتزم بنص عقد جاهز، غيّره من هنا فقط.
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

const money = (value?: number) =>
  `${(value || 0).toLocaleString('en-US')} جنيهًا مصريًا`;

const partyNameWithTitle = (party: { title: string; name: string }) =>
  `${party.title}/ ${party.name}`.trim();

const typeLabel = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'chalet': return 'شاليه';
    case 'villa': return 'فيلا';
    case 'palace': return 'قصر';
    default: return type || '—';
  }
};

// "صن لايت" و"قرية صن لايت" لازم يطلعوا بنفس الشكل بدون تكرار كلمة قرية
const villageLabel = (name?: string) => {
  const value = (name || '').trim();
  if (!value) return '';
  return value.includes('قرية') ? value : `قرية ${value}`;
};

// ---- نصوص بنود العقد (تعديل الصياغة يتم من هنا) ----
export const CONTRACT_CLAUSES: { title: string; body: (c: RentalContract) => string }[] = [
  {
    title: 'البند الأول — محل العقد',
    body: c =>
      `استأجر الطرف الثاني من الطرف الأول الوحدة الموضحة بياناتها بهذا العقد، وهي: ${c.unit_name || 'الوحدة'} ` +
      `(${typeLabel(c.unit_type)})${c.village_name ? ` — ${villageLabel(c.village_name)}` : ''} — وذلك للسكن والاستعمال الشخصي فقط، ` +
      `ولا يجوز استعمال الوحدة في غير ما خُصصت له، ولا تغيير نشاطها بدون موافقة كتابية من الطرف الأول.`,
  },
  {
    title: 'البند الثاني — مدة الإيجار',
    body: c =>
      `تبدأ مدة الإيجار من يوم ${fmtDate(c.start_date)} وتنتهي في يوم ${fmtDate(c.end_date)}، ` +
      `ومقدارها ${contractDurationLabel(c)}، ولا يجوز للطرف الثاني الاستمرار في شغل الوحدة بعد انتهاء هذه المدة ` +
      `إلا بموافقة كتابية من الطرف الأول.`,
  },
  {
    title: 'البند الثالث — القيمة الإيجارية',
    body: c =>
      `القيمة الإيجارية الإجمالية عن كامل مدة الإيجار مبلغ وقدره ${money(c.rent_amount)}، ` +
      `ويُسدد على النحو التالي: ${c.payment_terms || 'يُسدد كامل المبلغ عند التوقيع على هذا العقد.'}`,
  },
  {
    title: 'البند الرابع — مبلغ التأمين',
    body: c =>
      `سدد الطرف الثاني للطرف الأول مبلغ تأمين وقدره ${money(c.deposit_amount)}، ويُرد هذا المبلغ عند انتهاء مدة الإيجار ` +
      `وتسليم الوحدة بحالة جيدة، بعد خصم قيمة أي تلفيات أو مستحقات أو مخالفات تكون مستحقة على الطرف الثاني.`,
  },
  {
    title: 'البند الخامس — التزامات الطرف الثاني',
    body: () =>
      `يلتزم الطرف الثاني بما يلي: (١) المحافظة على الوحدة ومحتوياتها وعدم إحداث أي تعديلات أو تغييرات في البناء أو المرافق ` +
      `بدون موافقة كتابية من الطرف الأول. (٢) عدم التأجير من الباطن أو التنازل عن الإيجار للغير كليًا أو جزئيًا. ` +
      `(٣) الالتزام بلوائح وشروط القرية والقائمين على إدارتها. (٤) سداد قيمة استهلاك المرافق (الكهرباء والمياه وغيرها) ` +
      `ومقابل الخدمات المقررة عن مدة الإيجار. (٥) عدم استعمال الوحدة في أي نشاط مخالف للقانون أو للآداب العامة.`,
  },
  {
    title: 'البند السادس — التزامات الطرف الأول',
    body: () =>
      `يلتزم الطرف الأول بتسليم الوحدة للطرف الثاني في التاريخ المتفق عليه وبحالة جيدة صالحة للاستعمال، ` +
      `وبعدم التعرض له في الانتفاع بها خلال مدة الإيجار المتفق عليها، ` +
      `ويكون تسليم الوحدة في نهاية المدة بمجرد انتهائها.`,
  },
  {
    title: 'البند السابع — الفسخ والإنهاء',
    body: () =>
      `إذا أخل الطرف الثاني بأي من التزاماته الواردة في هذا العقد، كان للطرف الأول الحق في فسخ العقد فورًا واسترداد الوحدة ` +
      `دون حاجة إلى إنذار أو حكم قضائي، مع احتفاظه بحقه في التعويض عن الأضرار التي تلحق به من جراء هذا الإخلال.`,
  },
  {
    title: 'البند الثامن — أحكام عامة',
    body: () =>
      `يُعد التوقيع على هذا العقد إقرارًا من الطرفين بصحته وبترتيبه لآثاره القانونية، ولا يعتد بأي تعديل عليه إلا إذا كان ` +
      `مكتوبًا وموقّعًا من الطرفين. ويخضع هذا العقد لأحكام القانون المصري، وتختص المحاكم المصرية المختصة بنظر أي نزاع ينشأ ` +
      `عن تنفيذه أو تفسير أي بند من بنوده.`,
  },
  {
    title: 'البند التاسع — نسخ العقد',
    body: () => `حُرر هذا العقد من نسختين أصليتين بيد كل طرف نسخة للعمل بها عند الحاجة.`,
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

export const buildContractHtml = (contract: RentalContract): string => {
  const parties = contract.parties?.length ? contract.parties : [];
  const block = (inner: string, extra = '') =>
    `<section data-block="1" style="margin:0 0 14px;${extra}">${inner}</section>`;

  // خانة الطرف الثاني: كل المستأجرين داخل نفس الخانة (سطر توقيع لكل طرف)
  const tenantsSignatureCell =
    `<div style="font-weight:bold;margin-bottom:10px;">الطرف الثاني (المستأجر${parties.length > 1 ? 'ون' : ''})</div>` +
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

  return `
  <div style="direction:rtl;text-align:right;color:#000;background:#fff;font-size:13.5px;line-height:1.9;">

    ${block(
      `<div style="text-align:center;">
        <div style="font-size:30px;font-weight:bold;letter-spacing:1px;">عقد إيجار</div>
        <div style="font-size:14px;font-weight:bold;margin-top:4px;">وحدة سكنية${
          contract.unit_name ? ` — ${escapeHtml(contract.unit_name)}` : ''
        }${contract.village_name ? ` — ${escapeHtml(villageLabel(contract.village_name))}` : ''}</div>
        <div style="border-top:2px solid #000;margin-top:10px;"></div>
        <div style="border-top:1px solid #000;margin-top:2px;"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-top:8px;direction:rtl;">
          <span>رقم العقد: ${escapeHtml(contract.number)}</span>
          <span>التاريخ: ${fmtDate(contract.contract_date)}</span>
        </div>
      </div>`,
      'margin-bottom:18px;'
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">أولًا: الطرف الأول (المؤجر)</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('الاسم', '150px')}${td(escapeHtml(contract.landlord?.name))}</tr>
         <tr>${th('الرقم القومي', '150px')}${td(escapeHtml(contract.landlord?.national_id))}</tr>
         <tr>${th('رقم الهاتف', '150px')}${td(escapeHtml(contract.landlord?.phone))}</tr>
         <tr>${th('العنوان', '150px')}${td(escapeHtml(contract.landlord?.address))}</tr>
       </table>`
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">ثانيًا: الطرف الثاني (المستأجر${
        parties.length > 1 ? 'ون' : ''
      })</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('م', '32px')}${th('الاسم')}${th('الرقم القومي', '190px')}${th('رقم الهاتف', '140px')}</tr>
         ${parties.map(partyRow).join('')}
       </table>`
    )}

    ${block(
      `<div style="font-weight:bold;font-size:15px;margin-bottom:6px;">ثالثًا: بيانات الوحدة</div>
       <table style="width:100%;border-collapse:collapse;font-size:13px;direction:rtl;">
         <tr>${th('الوحدة', '150px')}${td(escapeHtml(contract.unit_name))}${th('النوع', '110px')}${td(escapeHtml(typeLabel(contract.unit_type)))}</tr>
         <tr>${th('القرية', '150px')}${td(escapeHtml(villageLabel(contract.village_name)))}${th('مدة الإيجار', '110px')}${td(
        escapeHtml(contractDurationLabel(contract))
      )}</tr>
         <tr>${th('بداية الإيجار', '150px')}${td(fmtDate(contract.start_date))}${th('نهاية الإيجار', '110px')}${td(
        fmtDate(contract.end_date)
      )}</tr>
       </table>`
    )}

    ${CONTRACT_CLAUSES.map(clause =>
      block(
        `<div style="font-weight:bold;font-size:14.5px;margin-bottom:2px;">${escapeHtml(clause.title)}</div>
         <div style="text-align:justify;">${clause.body(contract)}</div>`
      )
    ).join('')}

    ${contract.notes
      ? block(
          `<div style="font-weight:bold;font-size:14.5px;margin-bottom:2px;">ملاحظات</div>
           <div style="text-align:justify;">${escapeHtml(contract.notes)}</div>`
        )
      : ''}

    ${block(
      `حُرر هذا العقد بتاريخ ${fmtDate(contract.contract_date)}، وتسلم كل طرف نسخة منه للعمل بها عند الحاجة.`
    )}

    ${signatures}
  </div>`;
};

/* ---------------- تقسيم المحتوى على صفحات A4 بدون قص أي بند ---------------- */

export interface ContractPage {
  y: number;
  h: number;
}

export const computeContractPages = (
  blocks: { top: number; height: number }[],
  contentHeight: number
): ContractPage[] => {
  const pages: ContractPage[] = [];
  let pageIndex = 0;
  let pageStart = 0;
  const avail = () => (pageIndex === 0 ? FIRST_PAGE_AVAIL : NEXT_PAGE_AVAIL);

  for (const b of blocks) {
    if (b.height <= 0) continue;
    const blockEnd = b.top + b.height;
    if (blockEnd - pageStart <= avail()) continue;

    // ابدأ صفحة جديدة عند بداية البند نفسه — فلا يتقطع أي بند بين صفحتين
    if (b.top > pageStart) {
      pages.push({ y: pageStart, h: b.top - pageStart });
      pageStart = b.top;
      pageIndex += 1;
    }
    // بند أطول من صفحة كاملة: يُقسَّم على أكثر من صفحة
    while (blockEnd - pageStart > avail()) {
      const slice = avail();
      pages.push({ y: pageStart, h: slice });
      pageStart += slice;
      pageIndex += 1;
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

    const blocks = Array.from(container.querySelectorAll('[data-block]') as NodeListOf<HTMLElement>).map(el => ({
      top: el.offsetTop,
      height: el.offsetHeight,
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
