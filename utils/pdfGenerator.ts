import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Booking, Unit, Expense, Language, BookingStatus, FeeType, User, Subscription } from '../types';
import { format, addDays, isAfter, differenceInDays, isWithinInterval } from 'date-fns';

// Helper functions to replace date-fns imports that might be missing in specific environments
const parseISO = (dateStr: string) => new Date(dateStr);
const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};
const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const generatePdfFromHtml = async (htmlContent: string, fileName: string, isRTL: boolean) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = isRTL ? '0' : '-10000px';
    container.style.width = '1200px';
    container.style.minHeight = '1600px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = "'Cairo', sans-serif";
    container.style.direction = isRTL ? 'rtl' : 'ltr';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 800));
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            onclone: (clonedDoc) => {
                const style = clonedDoc.createElement('style');
                style.innerHTML = `* { font-family: 'Cairo', sans-serif !important; letter-spacing: 0px !important; }`;
                clonedDoc.head.appendChild(style);
                const div = clonedDoc.body.querySelector('div');
                if (div) div.style.direction = isRTL ? 'rtl' : 'ltr';
            }
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

        // Direct download
        pdf.save(fileName);

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Could not generate PDF.");
    } finally {
        if (document.body.contains(container)) document.body.removeChild(container);
    }
};

// --- Helper for Filters ---
const filterBookings = (bookings: Booking[], start?: string, end?: string, unitId?: string, bookingId?: string) => {
    return bookings.filter(b => {
        const isBookingMatch = !bookingId || bookingId === 'all' || b.id === bookingId;
        const isUnitMatch = !unitId || unitId === 'all' || b.unit_id === unitId;
        let isDateMatch = true;
        if (start && end) {
            const bStart = parseISO(b.start_date);
            const rangeStart = startOfDay(parseISO(start));
            const rangeEnd = endOfDay(parseISO(end));
            // Check if booking overlaps with range
            isDateMatch = isWithinInterval(bStart, { start: rangeStart, end: rangeEnd }) ||
                (isAfter(bStart, rangeStart) && !isAfter(bStart, rangeEnd));
        }
        return isBookingMatch && isUnitMatch && isDateMatch;
    });
};

const getReportPeriodLabel = (start: string, end: string, t: any) => {
    if (!start || !end) return t('allTime') || 'All Time';
    return `${start} -> ${end}`;
};

export const generateReceipt = async (booking: Booking, unitName: string, lang: Language, t: any) => {
    const isRTL = lang === 'ar';

    // Define Labels based on Language
    const labels = isRTL ? {
        title: 'إيصال / فاتورة',
        id: 'رقم المرجع',
        date: 'التاريخ',
        tenantInfo: 'بيانات المستأجر',
        name: 'الاسم',
        phone: 'الهاتف',
        bookingDetails: 'تفاصيل الحجز',
        unit: 'الوحدة',
        duration: 'المدة',
        nights: 'ليال',
        checkIn: 'الدخول',
        checkOut: 'الخروج',
        itemDesc: 'الصنف / الوصف',
        rate: 'السعر (يومي)',
        qty: 'العدد',
        total: 'الإجمالي',
        baseRent: 'الإقامة (الإيجار الأساسي)',
        baseRentDesc: 'إيجار الوحدة بدون رسوم إضافية',
        villageFees: 'رسوم القرية',
        villageFeesDesc: 'رسوم البوابة/القرية الإلزامية اليومية',
        housekeeping: 'خدمة التنظيف',
        housekeepingDesc: 'رسوم خدمة التنظيف والترتيب',
        totalRentalPrice: 'الإجمالي (شامل الرسوم)',
        paidAmount: 'المبلغ المدفوع',
        remainingAmount: 'المبلغ المتبقي',
        securityDepositRefundable: 'تأمين مسترد',
        securityDepositDesc: 'مبلغ تأمين مسترد عند المغادرة',
        currency: 'ج.م',
        advanceDeposit: 'عربون (ديبوزت)',
        notes: 'ملاحظات',
        status: 'حالة الحجز',
        payment: 'حالة الدفع',
        footer: 'شكراً لاختياركم قرية صن لايت.'
    } : {
        title: 'RECEIPT / INVOICE',
        id: 'ID',
        date: 'Date',
        tenantInfo: 'Tenant Information',
        name: 'Name',
        phone: 'Phone',
        bookingDetails: 'Booking Details',
        unit: 'Unit',
        duration: 'Duration',
        nights: 'Nights',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        itemDesc: 'Item / Description',
        rate: 'Rate (Daily)',
        qty: 'Qty',
        total: 'Total',
        baseRent: 'Accommodation (Base Rent)',
        baseRentDesc: 'Unit rental without fees',
        villageFees: 'Village Fees',
        villageFeesDesc: 'Daily mandatory gate/village fees',
        housekeeping: 'Housekeeping',
        housekeepingDesc: 'Cleaning service fee',
        totalRentalPrice: 'Total (Incl. Fees)',
        paidAmount: 'Paid Amount',
        remainingAmount: 'Remaining Amount',
        securityDepositRefundable: 'Security Deposit',
        securityDepositDesc: 'Refundable amount upon checkout',
        currency: 'EGP',
        advanceDeposit: 'Advance Deposit',
        notes: 'Notes',
        status: 'Booking Status',
        payment: 'Payment',
        footer: 'Thank you for choosing Sunlight Village.'
    };

    const format12Hour = (time24?: string) => {
        if (!time24) return '';
        try {
            const [h, m] = time24.split(':');
            const d = new Date();
            d.setHours(parseInt(h), parseInt(m), 0);
            return format(d, 'h:mm a');
        } catch {
            return time24;
        }
    };

    // Calculations
    const baseTotal = booking.nightly_rate * booking.nights;
    const villageFeesTotal = (booking.village_fee || 0) * booking.nights;
    const housekeeping = booking.housekeeping_enabled ? (booking.housekeeping_price || 0) : 0;
    const subtotal = baseTotal + villageFeesTotal + housekeeping;
    const advanceDeposit = booking.deposit_enabled ? (booking.deposit_amount || 0) : 0;
    const paidAmount = booking.payment_status === 'Paid' ? booking.total_rental_price : advanceDeposit;
    const remainingAmount = booking.payment_status === 'Paid' ? 0 : Math.max(0, booking.total_rental_price - advanceDeposit);

    // Translation helpers for statuses
    const statusTrans = t(booking.status.toLowerCase());
    const paymentTrans = t(booking.payment_status.toLowerCase());

    const html = `
    <div style="font-family: 'Cairo', sans-serif; padding: 50px; color: #1f2937; max-width: 900px; margin: 0 auto; background: white; direction: ${isRTL ? 'rtl' : 'ltr'};">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0ea5e9; padding-bottom: 25px; margin-bottom: 35px;">
        <div style="display: flex; flex-direction: column;">
           <h1 style="color: #0284c7; font-size: 36px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sunlight Village</h1>
           <p style="color: #000000; font-size: 14px; margin: 5px 0; font-weight: 600;">Premium Property Management</p>
        </div>
        <div style="text-align: ${isRTL ? 'left' : 'right'};">
           <div style="background: #f0f9ff; color: #0369a1; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 20px; display: inline-block; margin-bottom: 10px;">
             ${labels.title}
           </div>
           <p style="color: #000000; font-size: 13px; margin: 2px 0;"><strong>${labels.id}:</strong> #${booking.id.slice(0, 8).toUpperCase()}</p>
           <p style="color: #000000; font-size: 13px; margin: 2px 0;"><strong>${labels.date}:</strong> ${format(new Date(), 'yyyy-MM-dd')}</p>
        </div>
      </div>

      <!-- Info Grid -->
      <div style="display: flex; gap: 40px; margin-bottom: 40px;">
        <div style="flex: 1; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 14px; text-transform: uppercase; color: #000000; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin: 0 0 15px 0; font-weight: 800;">
                ${labels.tenantInfo}
            </h3>
            <div style="font-size: 15px;">
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.name}:</span> 
                    <span style="font-weight:bold; color: #111827;">${booking.tenant_name}</span>
                </p>
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.phone}:</span> 
                    <span style="font-weight:bold; color: #111827;">${booking.phone}</span>
                </p>
            </div>
        </div>
        <div style="flex: 1; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 14px; text-transform: uppercase; color: #000000; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin: 0 0 15px 0; font-weight: 800;">
                ${labels.bookingDetails}
            </h3>
            <div style="font-size: 15px;">
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.unit}:</span> 
                    <span style="font-weight:bold; color: #0369a1;">${unitName}</span>
                </p>
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.duration}:</span> 
                    <span style="font-weight:bold; color: #111827;">${booking.nights} ${labels.nights}</span>
                </p>
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.checkIn}:</span> 
                    <span style="color: #111827;">${format(new Date(booking.start_date), 'yyyy-MM-dd')} ${booking.check_in_time ? `<strong style="margin-${isRTL ? 'right' : 'left'}: 5px; color:#0369a1;">${format12Hour(booking.check_in_time)}</strong>` : ''}</span>
                </p>
                <p style="margin: 8px 0; display:flex; justify-content:space-between;">
                    <span style="color:#000000; font-weight: 600;">${labels.checkOut}:</span> 
                    <span style="color: #111827;">${format(new Date(booking.end_date), 'yyyy-MM-dd')} ${booking.check_out_time ? `<strong style="margin-${isRTL ? 'right' : 'left'}: 5px; color:#0369a1;">${format12Hour(booking.check_out_time)}</strong>` : ''}</span>
                </p>
            </div>
        </div>
      </div>

      <!-- Financial Table -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <thead style="background-color: #f1f1f1;">
            <tr>
                <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 16px; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 12px;">${labels.itemDesc}</th>
                <th style="text-align: center; padding: 16px; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 12px;">${labels.rate}</th>
                <th style="text-align: center; padding: 16px; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 12px;">${labels.qty}</th>
                <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 16px; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 12px;">${labels.total}</th>
            </tr>
        </thead>
        <tbody style="font-size: 14px;">
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9;">
                    <strong style="color: #000000;">${labels.baseRent}</strong>
                    <div style="font-size: 11px; color: #000000; margin-top: 2px; font-weight: 600;">${labels.baseRentDesc}</div>
                </td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">${booking.nightly_rate.toLocaleString()}</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">${booking.nights}</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600; color: #000000;">${baseTotal.toLocaleString()}</td>
            </tr>
            ${booking.village_fee > 0 ? `
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9;">
                    <strong style="color: #000000;">
                       ${labels.villageFees} 
                       <span style="font-size: 11px; margin-${isRTL ? 'right' : 'left'}: 5px; opacity: 0.8;">
                           ${(!booking.fee_type || booking.fee_type === 'EXCLUSIVE') ? '' : (booking.fee_type === 'INCLUSIVE' ? (isRTL ? '(شاملة في الإيجار)' : '(Included)') : (isRTL ? '(تدفع على البوابة)' : '(Paid at Gate)'))}
                       </span>
                    </strong>
                    <div style="font-size: 11px; color: #000000; margin-top: 2px; font-weight: 600;">${labels.villageFeesDesc}</div>
                </td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">${booking.village_fee.toLocaleString()}</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">${booking.nights}</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600; color: #000000;">
                   ${(!booking.fee_type || booking.fee_type === 'EXCLUSIVE') ? villageFeesTotal.toLocaleString() : (booking.fee_type === 'INCLUSIVE' ? (isRTL ? 'مشمول' : 'Included') : (isRTL ? 'غير مُضاف' : 'External'))}
                </td>
            </tr>` : ''}
            ${housekeeping > 0 ? `
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9;">
                    <strong style="color: #000000;">${labels.housekeeping}</strong>
                    <div style="font-size: 11px; color: #000000; margin-top: 2px; font-weight: 600;">${labels.housekeepingDesc}</div>
                </td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">-</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; border-${isRTL ? 'left' : 'right'}: 1px solid #f1f5f9; color: #000000;">1</td>
                <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600; color: #000000;">${housekeeping.toLocaleString()}</td>
            </tr>` : ''}
        </tbody>
        <tfoot style="background-color: #f8fafc;">
            <tr>
                <td colspan="3" style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; color: #000000; text-transform: uppercase; font-size: 14px;">${labels.totalRentalPrice}</td>
                <td style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; font-size: 18px; color: #1e293b;">${booking.total_rental_price.toLocaleString()} ${labels.currency}</td>
            </tr>
            <tr style="background-color: #f1f5f9;">
                <td colspan="3" style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 14px;">${labels.advanceDeposit}</td>
                <td style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; font-size: 18px; color: #475569;">${advanceDeposit.toLocaleString()} ${labels.currency}</td>
            </tr>
            ${booking.security_deposit_enabled && booking.security_deposit ? `
            <tr style="background-color: #fef9c3;">
                <td colspan="3" style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; color: #a16207; text-transform: uppercase; font-size: 14px;">
                    ${labels.securityDepositRefundable}
                    <div style="font-size: 10px; font-weight: normal; margin-top: 2px;">${labels.securityDepositDesc}</div>
                </td>
                <td style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; font-size: 18px; color: #a16207;">${booking.security_deposit.toLocaleString()} ${labels.currency}</td>
            </tr>` : ''}
            <tr style="background-color: #e0f2fe;">
                <td colspan="3" style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; color: #0369a1; text-transform: uppercase; font-size: 14px;">${labels.paidAmount}</td>
                <td style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; font-size: 18px; color: #0369a1;">${paidAmount.toLocaleString()} ${labels.currency}</td>
            </tr>
            <tr style="background-color: #fee2e2;">
                <td colspan="3" style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; color: #b91c1c; text-transform: uppercase; font-size: 14px;">${labels.remainingAmount}</td>
                <td style="padding: 16px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 800; font-size: 18px; color: #b91c1c;">${remainingAmount.toLocaleString()} ${labels.currency}</td>
            </tr>
        </tfoot>
      </table>

      ${booking.handler_enabled && booking.handler_name ? `
      <div style="background: #fdf8f6; border: 2px dashed #fed7aa; color: #92400e; padding: 25px 20px; border-radius: 16px; margin-top: 25px; text-align: center;">
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">
             يرجى التواصل مع ممثل المالك <strong style="color: #b45309; font-size: 20px; margin: 0 5px;">${booking.handler_name}</strong> 
          </div>
          <div style="font-size: 14px; font-weight: 600;">
             المسئول عن إجراءات الاستلام والتسليم للوحدة
          </div>
          ${booking.handler_phone ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fde68a;">
             <span style="font-size: 15px; font-weight: bold; color: #78350f;">رقم الهاتف :</span>
             <strong style="color: #ea580c; font-size: 20px; margin: 0 10px;" dir="ltr">${booking.handler_phone}</strong>
          </div>
          ` : ''}
      </div>
      ` : ''}

      <!-- Footer Status -->
      <div style="display: flex; gap: 20px; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          
          <div style="flex: 1;">
            ${booking.notes ? `
                <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #000000; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">${labels.notes}</h4>
                <p style="margin: 0; font-size: 13px; color: #000000; font-style: italic; background: #f1f5f9; padding: 10px; border-radius: 8px;">${booking.notes}</p>
            ` : ''}
          </div>

          <div style="display: flex; gap: 15px;">
              <div style="text-align: center;">
                 <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">${labels.status}</div>
                 <div style="color: ${booking.status === 'Confirmed' ? '#166534' : '#b45309'}; font-weight: 900; font-size: 15px;">
                    ${statusTrans}
                 </div>
              </div>
              <div style="text-align: center;">
                 <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">${labels.payment}</div>
                 <div style="color: ${booking.payment_status === 'Paid' ? '#166534' : '#b91c1c'}; font-weight: 900; font-size: 15px;">
                    ${paymentTrans}
                 </div>
              </div>
          </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #000000; font-weight: 600;">
        ${labels.footer}
      </div>

    </div>`;

    await generatePdfFromHtml(html, `Receipt_${booking.tenant_name}.pdf`, isRTL);
};

export const generateOccupancyReport = async (
    units: Unit[],
    bookings: Booking[],
    expenses: Expense[],
    lang: Language,
    t: any,
    filterStart?: string,
    filterEnd?: string,
    filterUnitId?: string,
    filterBookingId?: string
) => {
    const isRTL = lang === 'ar';
    const reportDate = format(new Date(), 'dd MMMM yyyy');
    const periodLabel = getReportPeriodLabel(filterStart || '', filterEnd || '', t);

    // Apply Filters
    const filteredBookings = filterBookings(bookings, filterStart, filterEnd, filterUnitId, filterBookingId);
    // Filter Units based on bookings or selection
    const displayedUnits = units.filter(u => {
        if (filterUnitId && filterUnitId !== 'all') return u.id === filterUnitId;
        return true;
    });

    const labels = isRTL ? {
        title: 'تقرير الإشغال التفصيلي',
        subtitle: 'بيان تفصيلي للإيجارات والرسوم والهاوس كيبنج',
        generated: 'تاريخ التقرير',
        reportPeriod: 'فترة التقرير',
        unit: 'الوحدة',
        tenant: 'المستأجر',
        phone: 'الهاتف',
        dates: 'التواريخ',
        nights: 'ليالي',
        baseRent: 'سعر الليلة',
        baseRentDesc: '(النظام)',
        totalRent: 'سعر الإيجار',
        totalRentDesc: '(الإجمالي)',
        villageFees: 'رسوم قرية',
        housekeeping: 'تنظيف',
        expenses: 'مصروفات',
        netProfit: 'صافي الربح',
        securityDeposit: 'تأمين (مسترد)',
        grandTotal: 'إجمالي كلي',
        remaining: 'المبلغ المتبقي',
        status: 'الحالة',
        payment: 'الدفع',
        unitTotal: 'ملخص الوحدة',
        footer: 'تقرير الإشغال - نظام صن لايت'
    } : {
        title: 'Detailed Occupancy Report',
        subtitle: 'Detailed breakdown of rent, fees, and housekeeping',
        generated: 'Report Date',
        reportPeriod: 'Report Period',
        unit: 'Unit',
        tenant: 'Tenant',
        phone: 'Phone',
        dates: 'Dates',
        nights: 'Nights',
        baseRent: 'Rate',
        baseRentDesc: '(System)',
        totalRent: 'Total Rent',
        totalRentDesc: '(Duration)',
        villageFees: 'Village Fees',
        housekeeping: 'Housekeeping',
        expenses: 'Expenses',
        netProfit: 'Net Profit',
        securityDeposit: 'Security',
        grandTotal: 'Grand Total',
        remaining: 'Remaining',
        status: 'Status',
        payment: 'Payment',
        unitTotal: 'Unit Summary',
        footer: 'Occupancy Report - Sunlight System'
    };

    let contentHtml = '';

    displayedUnits.forEach(u => {
        const unitBookings = filteredBookings
            .filter(b => b.unit_id === u.id)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        if (unitBookings.length === 0) return;

        // Unit Totals
        let unitBase = 0;
        let unitTotalRent = 0;
        let unitFees = 0;
        let unitHK = 0;
        let unitExpenses = 0;
        let unitNetProfit = 0;
        let unitGrand = 0;
        let unitRemaining = 0;
        let unitSecDep = 0;

        const bookingRows = unitBookings.map(b => {
            // Calculations per booking
            const baseRent = b.nightly_rate;
            const totalRent = b.nightly_rate * b.nights;
            const fees = (b.village_fee || 0) * b.nights;
            const deductedFees = b.fee_type === 'TENANT_PAYS' ? 0 : fees;
            const hk = b.housekeeping_enabled ? (b.housekeeping_price || 0) : 0;
            const secDep = b.security_deposit_enabled ? (b.security_deposit || 0) : 0;
            const grand = b.total_rental_price;
            const remaining = b.payment_status === 'Paid' ? 0 : Math.max(0, grand - (b.deposit_enabled ? (b.deposit_amount || 0) : 0));

            const bookingExpenses = expenses.filter(e => e.booking_id === b.id).reduce((sum, e) => sum + e.amount, 0);
            const netProfit = (grand - remaining) - hk - deductedFees - bookingExpenses;

            if (b.status !== BookingStatus.CANCELLED) {
                unitBase += baseRent;
                unitTotalRent += totalRent;
                unitFees += fees;
                unitHK += hk;
                unitExpenses += bookingExpenses;
                unitNetProfit += netProfit;
                unitGrand += grand;
                unitRemaining += remaining;
                unitSecDep += secDep;
            }

            const statusColor = b.status === BookingStatus.CONFIRMED ? '#166534' : '#854d0e';
            const statusBg = b.status === BookingStatus.CONFIRMED ? '#dcfce7' : '#fef9c3';
            const payStatusBg = b.payment_status === 'Paid' ? '#dcfce7' : '#fee2e2';
            const payStatusColor = b.payment_status === 'Paid' ? '#166534' : '#991b1b';
            const sysTrans = b.fee_type === 'INCLUSIVE' ? (isRTL ? 'شامل الرسوم' : 'Inclusive') : (b.fee_type === 'TENANT_PAYS' ? (isRTL ? 'على المستأجر' : 'Tenant Pays') : (isRTL ? 'غير شامل' : 'Exclusive'));

            return `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${b.tenant_name}</td>
                <td style="padding: 10px; color: #475569; font-size: 11px;">${b.phone}</td>
                <td style="padding: 10px; color: #334155; font-size: 11px;">${format(new Date(b.start_date), 'yyyy-MM-dd')}<br/>${format(new Date(b.end_date), 'yyyy-MM-dd')}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; color: #0f172a;">${b.nights}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 600; color: #0284c7;">
                    ${baseRent.toLocaleString()}
                    <div style="font-size: 8px; font-weight: normal; color: #64748b; margin-top: 2px;">${sysTrans}</div>
                </td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #334155;">${totalRent.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; color: #64748b;">${fees.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; color: #d97706;">${hk.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #a16207;">${secDep.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; color: #ef4444;">${bookingExpenses.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #0f172a; background-color: #f8fafc;">${grand.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #dc2626;">${remaining.toLocaleString()}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #22c55e;">${netProfit.toLocaleString()}</td>
                <td style="padding: 10px; text-align: center;">
                   <span style="font-size: 10px; padding: 2px 8px; border-radius: 12px; background: ${payStatusBg}; color: ${payStatusColor}; font-weight: bold;">
                     ${t(b.payment_status.toLowerCase())}
                   </span>
                </td>
                <td style="padding: 10px; text-align: center;">
                   <span style="font-size: 10px; padding: 2px 8px; border-radius: 12px; background: ${statusBg}; color: ${statusColor}; font-weight: bold;">
                     ${t(b.status.toLowerCase())}
                   </span>
                </td>
            </tr>
        `}).join('');

        const summaryRow = `
            <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: bold;">
                <td colspan="4" style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #334155;">${labels.unitTotal}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #0284c7;">-</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #334155; font-weight: bold;">${unitTotalRent.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #64748b;">${unitFees.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #d97706;">${unitHK.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #a16207;">${unitSecDep.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #ef4444;">${unitExpenses.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #0f172a; background-color: #e2e8f0;">${unitGrand.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #dc2626;">${unitRemaining.toLocaleString()}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #22c55e;">${unitNetProfit.toLocaleString()}</td>
                <td></td>
                <td></td>
            </tr>
        `;

        contentHtml += `
            <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; page-break-inside: avoid;">
                <div style="background: #e0f2fe; padding: 12px 20px; border-bottom: 1px solid #bae6fd; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #0369a1; font-size: 16px; font-weight: 800;">${u.name}</h3>
                    <span style="font-size: 12px; color: #0284c7; background: #fff; padding: 2px 8px; font-weight: bold; border-radius: 4px;">${unitBookings.length} Bookings</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #ffffff; border-bottom: 2px solid #f1f5f9; color: #475569;">
                        <tr>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 12%;">${labels.tenant}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 7%;">${labels.phone}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 9%;">${labels.dates}</th>
                            <th style="text-align: center; padding: 10px; width: 4%; font-weight: 800; color: #000;">${labels.nights}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 7%;">${labels.baseRent}<br/><span style="font-size:9px; font-weight:normal;">${labels.baseRentDesc}</span></th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 7%;">${labels.totalRent}<br/><span style="font-size:9px; font-weight:normal;">${labels.totalRentDesc}</span></th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 6%;">${labels.villageFees}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 5%;">${labels.housekeeping}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 6%; color: #a16207;">${labels.securityDeposit}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 6%;">${labels.expenses}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 7%; background-color: #f8fafc;">${labels.grandTotal}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 6%; color: #dc2626;">${labels.remaining}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 7%;">${labels.netProfit}</th>
                            <th style="text-align: center; padding: 10px; width: 8%;">${labels.payment}</th>
                            <th style="text-align: center; padding: 10px; width: 9%;">${labels.status}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookingRows}
                        ${summaryRow}
                    </tbody>
                </table>
            </div>
        `;
    });

    const html = `
    <div style="font-family: 'Cairo', sans-serif; padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #0284c7; padding-bottom: 20px;">
            <h1 style="color: #0369a1; font-size: 32px; font-weight: 800; margin: 0;">${labels.title}</h1>
            <p style="margin: 5px 0; color: #64748b; font-size: 14px; font-weight: 600;">${labels.subtitle}</p>
            <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">${labels.generated}: ${reportDate}</p>
            ${filterStart && filterEnd ? `<p style="margin: 5px 0; color: #0f172a; font-size: 13px; font-weight: bold; background: #f0f9ff; display: inline-block; px: 10px; border-radius: 5px;">${labels.reportPeriod}: ${periodLabel}</p>` : ''}
        </div>

        ${contentHtml || `<p style="text-align:center; padding: 20px; font-weight:bold;">No bookings found for selected criteria.</p>`}

        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600;">
            ${labels.footer}
        </div>
    </div>
    `;

    await generatePdfFromHtml(html, `Detailed_Occupancy_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`, isRTL);
};

export const generateVillageFeesReport = async (
    units: Unit[],
    bookings: Booking[],
    lang: Language,
    t: any,
    filterStart?: string,
    filterEnd?: string,
    filterUnitId?: string,
    filterBookingId?: string
) => {
    const isRTL = lang === 'ar';
    const reportDate = format(new Date(), 'dd MMMM yyyy');
    const periodLabel = getReportPeriodLabel(filterStart || '', filterEnd || '', t);

    // Apply Filters
    const filteredBookings = filterBookings(bookings, filterStart, filterEnd, filterUnitId, filterBookingId);
    const displayedUnits = units.filter(u => {
        if (filterUnitId && filterUnitId !== 'all') return u.id === filterUnitId;
        return true;
    });

    const labels = isRTL ? {
        title: 'تقرير رسوم القرية (البوابات)',
        subtitle: 'بيان تفصيلي للرسوم حسب الوحدة',
        generated: 'تاريخ التقرير',
        reportPeriod: 'فترة التقرير',
        unit: 'الوحدة',
        tenant: 'المستأجر',
        dates: 'التواريخ',
        nights: 'عدد الأيام',
        dailyFee: 'سعر اليوم',
        totalFee: 'إجمالي الرسوم',
        unitTotal: 'إجمالي الوحدة',
        grandTotal: 'الإجمالي العام',
        totalDays: 'إجمالي الأيام',
        footer: 'تقرير الرسوم - نظام صن لايت'
    } : {
        title: 'Village Fees Report',
        subtitle: 'Detailed fees breakdown by unit',
        generated: 'Report Date',
        reportPeriod: 'Report Period',
        unit: 'Unit',
        tenant: 'Tenant',
        dates: 'Dates',
        nights: 'Days',
        dailyFee: 'Daily Rate',
        totalFee: 'Total Fees',
        unitTotal: 'Unit Total',
        grandTotal: 'Grand Total',
        totalDays: 'Total Days',
        footer: 'Fees Report - Sunlight System'
    };

    let contentHtml = '';
    let grandTotalFees = 0;
    let grandTotalDays = 0;

    displayedUnits.forEach(u => {
        const unitBookings = filteredBookings
            .filter(b => b.unit_id === u.id && b.status !== BookingStatus.CANCELLED)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        if (unitBookings.length === 0) return;

        let unitTotalFees = 0;
        let unitTotalDays = 0;

        const rows = unitBookings.map(b => {
            const fees = (b.village_fee || 0) * b.nights;
            unitTotalFees += fees;
            unitTotalDays += b.nights;

            return `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${b.tenant_name}</td>
                <td style="padding: 10px; color: #334155; font-size: 11px;">${format(new Date(b.start_date), 'yyyy-MM-dd')} / ${format(new Date(b.end_date), 'yyyy-MM-dd')}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; color: #000;">${b.nights}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; color: #475569;">${b.village_fee || 0}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #d97706;">${fees.toLocaleString()}</td>
            </tr>
            `;
        }).join('');

        grandTotalFees += unitTotalFees;
        grandTotalDays += unitTotalDays;

        const summaryRow = `
            <tr style="background-color: #fff7ed; border-top: 2px solid #fed7aa; font-weight: bold;">
                <td colspan="2" style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #9a3412;">${labels.unitTotal}</td>
                <td style="padding: 12px; text-align: center; color: #9a3412;">${unitTotalDays}</td>
                <td></td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #c2410c;">${unitTotalFees.toLocaleString()}</td>
            </tr>
        `;

        contentHtml += `
            <div style="margin-bottom: 30px; border: 1px solid #fed7aa; border-radius: 12px; overflow: hidden; page-break-inside: avoid;">
                <div style="background: #ffedd5; padding: 12px 20px; border-bottom: 1px solid #fed7aa;">
                    <h3 style="margin: 0; color: #c2410c; font-size: 16px; font-weight: 800;">${u.name}</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #ffffff; border-bottom: 2px solid #f1f5f9; color: #475569;">
                        <tr>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 25%;">${labels.tenant}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 25%;">${labels.dates}</th>
                            <th style="text-align: center; padding: 10px; width: 15%; font-weight: 800; color: #000;">${labels.nights}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 15%;">${labels.dailyFee}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 20%;">${labels.totalFee}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        ${summaryRow}
                    </tbody>
                </table>
            </div>
        `;
    });

    const html = `
    <div style="font-family: 'Cairo', sans-serif; padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #f97316; padding-bottom: 20px;">
            <h1 style="color: #c2410c; font-size: 32px; font-weight: 800; margin: 0;">${labels.title}</h1>
            <p style="margin: 5px 0; color: #64748b; font-size: 14px; font-weight: 600;">${labels.subtitle}</p>
            <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">${labels.generated}: ${reportDate}</p>
            ${filterStart && filterEnd ? `<p style="margin: 5px 0; color: #0f172a; font-size: 13px; font-weight: bold; background: #fff7ed; display: inline-block; padding: 4px 10px; border-radius: 5px; border: 1px solid #fed7aa;">${labels.reportPeriod}: ${periodLabel}</p>` : ''}
        </div>

        ${contentHtml || `<p style="text-align:center; padding: 20px; font-weight:bold;">No bookings found.</p>`}

        ${contentHtml ? `
        <div style="margin-top: 20px; background: #fff7ed; border: 2px solid #f97316; border-radius: 12px; padding: 20px; page-break-inside: avoid;">
            <h3 style="margin: 0 0 10px 0; color: #c2410c; text-align: center;">${labels.grandTotal}</h3>
            <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                    <div style="font-size: 12px; color: #9a3412; font-weight: bold; text-transform: uppercase;">${labels.totalDays}</div>
                    <div style="font-size: 24px; font-weight: 800; color: #ea580c;">${grandTotalDays}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: #9a3412; font-weight: bold; text-transform: uppercase;">${labels.totalFee}</div>
                    <div style="font-size: 24px; font-weight: 800; color: #ea580c;">${grandTotalFees.toLocaleString()}</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600;">
            ${labels.footer}
        </div>
    </div>
    `;

    await generatePdfFromHtml(html, `Village_Fees_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`, isRTL);
};

export const generateSubscriptionReceipt = async (user: User, subscription: Subscription, lang: Language, t: any) => {
    const isRTL = lang === 'ar';
    const startDate = parseISO(subscription.start_date);
    const endDate = addDays(startDate, subscription.duration_days);

    const labels = isRTL ? {
        title: 'إيصال اشتراك',
        date: 'التاريخ',
        clientInfo: 'بيانات العميل',
        name: 'الاسم',
        email: 'البريد',
        subDetails: 'تفاصيل الاشتراك',
        duration: 'المدة',
        days: 'أيام',
        start: 'تاريخ البدء',
        end: 'تاريخ الانتهاء',
        amount: 'المبلغ المدفوع',
        currency: 'ج.م',
        status: 'الحالة',
        footer: 'شكراً لاستخدامكم نظام صن لايت.'
    } : {
        title: 'Subscription Receipt',
        date: 'Date',
        clientInfo: 'Client Information',
        name: 'Name',
        email: 'Email',
        subDetails: 'Subscription Details',
        duration: 'Duration',
        days: 'Days',
        start: 'Start Date',
        end: 'End Date',
        amount: 'Amount Paid',
        currency: 'EGP',
        status: 'Status',
        footer: 'Thank you for using Sunlight System.'
    };

    const html = `
    <div style="font-family: 'Cairo', sans-serif; padding: 50px; color: #1f2937; max-width: 900px; margin: 0 auto; background: white; direction: ${isRTL ? 'rtl' : 'ltr'};">
        <div style="text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 40px;">
             <h1 style="color: #0284c7; font-size: 32px; font-weight: 800;">Sunlight System</h1>
             <div style="font-size: 18px; color: #64748b; margin-top: 5px; font-weight: bold;">${labels.title}</div>
             <p style="margin-top: 5px; color: #94a3b8; font-size: 12px;">${labels.date}: ${format(new Date(), 'yyyy-MM-dd')}</p>
        </div>

        <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">${labels.clientInfo}</h3>
                    <p style="margin: 5px 0; color: #334155;"><strong>${labels.name}:</strong> ${user.full_name}</p>
                    <p style="margin: 5px 0; color: #334155;"><strong>${labels.email}:</strong> ${user.email}</p>
                </div>
                 <div style="text-align: ${isRTL ? 'left' : 'right'};">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">${labels.subDetails}</h3>
                    <p style="margin: 5px 0; color: #334155;"><strong>${labels.duration}:</strong> ${subscription.duration_days} ${labels.days}</p>
                    <p style="margin: 5px 0; color: #334155;"><strong>${labels.status}:</strong> ${subscription.status}</p>
                </div>
            </div>
             <div style="display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
                <div>
                     <p style="margin: 5px 0; color: #475569; font-size: 12px;">${labels.start}</p>
                     <p style="font-weight: bold; color: #0f172a;">${format(startDate, 'yyyy-MM-dd')}</p>
                </div>
                 <div style="text-align: ${isRTL ? 'left' : 'right'};">
                     <p style="margin: 5px 0; color: #475569; font-size: 12px;">${labels.end}</p>
                     <p style="font-weight: bold; color: #0f172a;">${format(endDate, 'yyyy-MM-dd')}</p>
                </div>
            </div>
        </div>

        <div style="background: #0f172a; color: white; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; font-size: 16px;">${labels.amount}</span>
            <span style="font-weight: 800; font-size: 24px;">${subscription.price.toLocaleString()} ${labels.currency}</span>
        </div>

        <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;">
             ${labels.footer}
        </div>
    </div>
    `;

    await generatePdfFromHtml(html, `Subscription_${user.full_name}.pdf`, isRTL);
};

export const generateExpenseReport = async (
    expenses: Expense[],
    units: Unit[],
    bookings: Booking[],
    lang: Language,
    t: any,
    filterStart?: string,
    filterEnd?: string,
    filterUnitId?: string,
    filterBookingId?: string
) => {
    const isRTL = lang === 'ar';
    const reportDate = format(new Date(), 'dd MMMM yyyy');
    const periodLabel = getReportPeriodLabel(filterStart || '', filterEnd || '', t);

    // Apply Filters to Expenses
    const filteredExpenses = expenses.filter(e => {
        const matchesUnit = !filterUnitId || filterUnitId === 'all' || e.unit_id === filterUnitId;
        const matchesBooking = !filterBookingId || filterBookingId === 'all' || e.booking_id === filterBookingId;
        let matchesDate = true;
        if (filterStart && filterEnd) {
            const eDate = parseISO(e.date);
            const rangeStart = startOfDay(parseISO(filterStart));
            const rangeEnd = endOfDay(parseISO(filterEnd));
            matchesDate = isWithinInterval(eDate, { start: rangeStart, end: rangeEnd });
        }
        return matchesUnit && matchesBooking && matchesDate;
    });

    // Filter Units (only units that have expenses or all if specific filter applied)
    const displayedUnits = units.filter(u => {
        if (filterUnitId && filterUnitId !== 'all') return u.id === filterUnitId;
        // Optionally show all units even if no expenses, or just ones with expenses. 
        // For 'all', let's show only units with expenses to keep report clean, or show all. 
        // Let's show units that have matching expenses to avoid empty blocks.
        return filteredExpenses.some(e => e.unit_id === u.id);
    });

    const labels = isRTL ? {
        title: 'تقرير المصروفات التفصيلي',
        generated: 'تاريخ التقرير',
        reportPeriod: 'فترة التقرير',
        unit: 'الوحدة',
        date: 'التاريخ',
        booking: 'الحجز',
        titleCol: 'العنوان',
        category: 'الفئة',
        amount: 'المبلغ',
        unitTotal: 'إجمالي الوحدة',
        grandTotal: 'إجمالي المصروفات الكلي',
        currency: 'ج.م',
        footer: 'تقرير المصروفات - نظام صن لايت'
    } : {
        title: 'Detailed Expenses Report',
        generated: 'Report Date',
        reportPeriod: 'Report Period',
        unit: 'Unit',
        date: 'Date',
        booking: 'Booking',
        titleCol: 'Title',
        category: 'Category',
        amount: 'Amount',
        unitTotal: 'Unit Total',
        grandTotal: 'Grand Total',
        currency: 'EGP',
        footer: 'Expenses Report - Sunlight System'
    };

    let contentHtml = '';
    let grandTotalAmount = 0;

    displayedUnits.forEach(u => {
        const unitExpenses = filteredExpenses
            .filter(e => e.unit_id === u.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (unitExpenses.length === 0) return;

        const unitTotal = unitExpenses.reduce((sum, e) => sum + e.amount, 0);
        grandTotalAmount += unitTotal;

        const rows = unitExpenses.map(e => `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${e.title}</td>
                <td style="padding: 10px; font-weight: bold; color: #0284c7;">${bookings.find(b => b.id === e.booking_id)?.tenant_name || '-'}</td>
                <td style="padding: 10px; color: #475569; font-size: 11px;">
                    <span style="background: #f1f5f9; padding: 2px 6px; rounded: 4px;">
                      ${t(e.category.toLowerCase().replace(' ', '_') as any) || e.category}
                    </span>
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11px;">${format(new Date(e.date), 'yyyy-MM-dd')}</td>
                <td style="padding: 10px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #dc2626;">${e.amount.toLocaleString()}</td>
            </tr>
        `).join('');

        const summaryRow = `
            <tr style="background-color: #fef2f2; border-top: 2px solid #fecaca; font-weight: bold;">
                <td colspan="4" style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #991b1b;">${labels.unitTotal}</td>
                <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #dc2626;">${unitTotal.toLocaleString()}</td>
            </tr>
        `;

        contentHtml += `
            <div style="margin-bottom: 30px; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden; page-break-inside: avoid;">
                <div style="background: #fee2e2; padding: 12px 20px; border-bottom: 1px solid #fecaca;">
                    <h3 style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 800;">${u.name}</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #ffffff; border-bottom: 2px solid #f1f5f9; color: #475569;">
                        <tr>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 30%;">${labels.titleCol}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 20%;">${labels.booking}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 15%;">${labels.category}</th>
                            <th style="text-align: ${isRTL ? 'right' : 'left'}; padding: 10px; width: 15%;">${labels.date}</th>
                            <th style="text-align: ${isRTL ? 'left' : 'right'}; padding: 10px; width: 20%;">${labels.amount}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        ${summaryRow}
                    </tbody>
                </table>
            </div>
        `;
    });

    const html = `
      <div style="font-family: 'Cairo', sans-serif; padding: 40px; color: #1f2937; direction: ${isRTL ? 'rtl' : 'ltr'};">
         <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
             <h1 style="color: #b91c1c; font-size: 32px; font-weight: 800; margin: 0;">${labels.title}</h1>
             <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">${labels.generated}: ${reportDate}</p>
             ${filterStart && filterEnd ? `<p style="margin: 5px 0; color: #7f1d1d; font-size: 13px; font-weight: bold; background: #fef2f2; display: inline-block; padding: 4px 10px; border-radius: 5px; border: 1px solid #fecaca;">${labels.reportPeriod}: ${periodLabel}</p>` : ''}
         </div>

         ${contentHtml || `<p style="text-align:center; padding: 20px; font-weight:bold;">No expenses found.</p>`}

         ${contentHtml ? `
            <div style="margin-top: 20px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 20px; page-break-inside: avoid;">
                <h3 style="margin: 0 0 10px 0; color: #b91c1c; text-align: center;">${labels.grandTotal}</h3>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: #dc2626;">${grandTotalAmount.toLocaleString()} <span style="font-size: 16px;">${labels.currency}</span></div>
                </div>
            </div>
         ` : ''}

         <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600;">
            ${labels.footer}
         </div>
      </div>
     `;

    await generatePdfFromHtml(html, `Detailed_Expenses_Report.pdf`, isRTL);
};

export const generateFinancialReport = async (
    units: Unit[],
    bookings: Booking[],
    expenses: Expense[],
    lang: Language,
    t: any,
    filterStart?: string,
    filterEnd?: string,
    filterUnitId?: string,
    filterBookingId?: string
) => {
    const isRTL = lang === 'ar';
    const reportDate = format(new Date(), 'dd MMMM yyyy');
    const periodLabel = getReportPeriodLabel(filterStart || '', filterEnd || '', t);

    // Apply Filters
    const filteredBookings = filterBookings(bookings, filterStart, filterEnd, filterUnitId, filterBookingId);

    // Filter Expenses
    const filteredExpenses = expenses.filter(e => {
        const isUnitMatch = !filterUnitId || filterUnitId === 'all' || e.unit_id === filterUnitId;
        const isBookingMatch = !filterBookingId || filterBookingId === 'all' || e.booking_id === filterBookingId;
        let isDateMatch = true;
        if (filterStart && filterEnd) {
            const eDate = parseISO(e.date);
            const rangeStart = startOfDay(parseISO(filterStart));
            const rangeEnd = endOfDay(parseISO(filterEnd));
            isDateMatch = isWithinInterval(eDate, { start: rangeStart, end: rangeEnd });
        }
        return isUnitMatch && isBookingMatch && isDateMatch;
    });

    const displayedUnits = units.filter(u => {
        if (filterUnitId && filterUnitId !== 'all') return u.id === filterUnitId;
        return true;
    });

    // Global Calculations based on filtered data
    const totalRevenue = filteredBookings
        .filter(b => b.status === BookingStatus.CONFIRMED)
        .reduce((sum, b) => sum + (b.payment_status === 'Paid' ? b.total_rental_price : (b.deposit_enabled ? b.deposit_amount : 0)), 0);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const labels = isRTL ? {
        title: 'الملخص المالي',
        subtitle: 'تحليل الإيرادات والمصروفات وصافي الربح',
        generated: 'تاريخ التقرير',
        reportPeriod: 'فترة التقرير',
        summary: 'ملخص عام',
        revenue: 'إجمالي الإيرادات',
        expenses: 'إجمالي المصروفات',
        netProfit: 'صافي الربح',
        details: 'تفاصيل حسب الوحدة',
        unit: 'الوحدة',
        bookings: 'حجوزات',
        unitRev: 'إيراد',
        unitExp: 'مصروفات',
        unitNet: 'صافي',
        currency: 'ج.م',
        footer: 'الملخص المالي - نظام صن لايت'
    } : {
        title: 'Financial Summary Report',
        subtitle: 'Analysis of Revenue, Expenses, and Net Profit',
        generated: 'Report Date',
        reportPeriod: 'Report Period',
        summary: 'Executive Summary',
        revenue: 'Total Revenue',
        expenses: 'Total Expenses',
        netProfit: 'Net Profit',
        details: 'Details by Unit',
        unit: 'Unit',
        bookings: 'Bookings',
        unitRev: 'Revenue',
        unitExp: 'Expenses',
        unitNet: 'Net',
        currency: 'EGP',
        footer: 'Financial Report - Sunlight System'
    };

    const unitRows = displayedUnits.map(u => {
        const uBookings = filteredBookings.filter(b => b.unit_id === u.id && b.status === BookingStatus.CONFIRMED);
        const uRev = uBookings.reduce((sum, b) => sum + (b.payment_status === 'Paid' ? b.total_rental_price : (b.deposit_enabled ? b.deposit_amount : 0)), 0);

        const uExpenses = filteredExpenses.filter(e => e.unit_id === u.id);
        const uExpTotal = uExpenses.reduce((sum, e) => sum + e.amount, 0);

        const uNet = uRev - uExpTotal;
        const netColor = uNet >= 0 ? '#166534' : '#dc2626'; // Green for positive, Red for negative
        const netBg = uNet >= 0 ? '#dcfce7' : '#fee2e2';

        return `
         <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
            <td style="padding: 12px; font-weight: bold; color: #1e293b;">${u.name}</td>
            <td style="padding: 12px; text-align: center; color: #475569; font-weight: bold;">${uBookings.length}</td>
            <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #0284c7;">${uRev.toLocaleString()}</td>
            <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: bold; color: #d97706;">${uExpTotal.toLocaleString()}</td>
            <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'};">
                <span style="font-weight: bold; color: ${netColor}; background: ${netBg}; padding: 4px 10px; border-radius: 6px; display: inline-block; min-width: 80px; text-align: center;">
                    ${uNet.toLocaleString()}
                </span>
            </td>
         </tr>
        `;
    }).join('');

    const html = `
    <div style="font-family: 'Cairo', sans-serif; padding: 40px; color: #1f2937; direction: ${isRTL ? 'rtl' : 'ltr'};">
         
         <!-- Header -->
         <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #0284c7; padding-bottom: 20px;">
             <h1 style="color: #0369a1; font-size: 32px; font-weight: 800; margin: 0;">${labels.title}</h1>
             <p style="margin: 5px 0; color: #64748b; font-size: 14px; font-weight: 600;">${labels.subtitle}</p>
             <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">${labels.generated}: ${reportDate}</p>
             ${filterStart && filterEnd ? `<p style="margin: 5px 0; color: #0f172a; font-size: 13px; font-weight: bold; background: #f0f9ff; display: inline-block; padding: 4px 10px; border-radius: 5px; border: 1px solid #bae6fd;">${labels.reportPeriod}: ${periodLabel}</p>` : ''}
         </div>

         <!-- Summary Cards -->
         <div style="display: flex; gap: 20px; justify-content: space-between; margin-bottom: 40px;">
            <div style="flex: 1; background: #f0f9ff; padding: 20px; border-radius: 12px; border: 1px solid #bae6fd; text-align: center;">
                <div style="font-size: 12px; color: #0369a1; font-weight: bold; text-transform: uppercase;">${labels.revenue}</div>
                <div style="font-size: 24px; font-weight: 800; color: #0284c7; margin-top: 5px;">${totalRevenue.toLocaleString()} <span style="font-size: 14px;">${labels.currency}</span></div>
            </div>
             <div style="flex: 1; background: #fff7ed; padding: 20px; border-radius: 12px; border: 1px solid #fed7aa; text-align: center;">
                <div style="font-size: 12px; color: #c2410c; font-weight: bold; text-transform: uppercase;">${labels.expenses}</div>
                <div style="font-size: 24px; font-weight: 800; color: #ea580c; margin-top: 5px;">${totalExpenses.toLocaleString()} <span style="font-size: 14px;">${labels.currency}</span></div>
            </div>
             <div style="flex: 1; background: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #bbf7d0; text-align: center;">
                <div style="font-size: 12px; color: #15803d; font-weight: bold; text-transform: uppercase;">${labels.netProfit}</div>
                <div style="font-size: 24px; font-weight: 800; color: #16a34a; margin-top: 5px;">${netProfit.toLocaleString()} <span style="font-size: 14px;">${labels.currency}</span></div>
            </div>
         </div>

         <!-- Detailed Table -->
         <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">
             <div style="background: #f1f5f9; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; color: #334155; font-size: 16px; font-weight: 800;">${labels.details}</h3>
             </div>
             <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead style="background: #ffffff; color: #475569; border-bottom: 2px solid #e2e8f0;">
                    <tr>
                        <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; width: 25%; font-weight: 800;">${labels.unit}</th>
                        <th style="padding: 12px; text-align: center; width: 10%; font-weight: 800;">${labels.bookings}</th>
                        <th style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; width: 20%; font-weight: 800;">${labels.unitRev}</th>
                        <th style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; width: 20%; font-weight: 800;">${labels.unitExp}</th>
                        <th style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; width: 25%; background-color: #f8fafc; font-weight: 800;">${labels.unitNet}</th>
                    </tr>
                </thead>
                <tbody>
                    ${unitRows}
                </tbody>
             </table>
         </div>

         <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600;">
            ${labels.footer}
         </div>
    </div>
    `;

    await generatePdfFromHtml(html, `Financial_Report.pdf`, isRTL);
};

export const generateAdminReport = async (users: User[], lang: Language, t: any) => {
    // Existing Admin Report logic...
    // (Keeping existing implementation for brevity as it was not requested to change)
    const isRTL = lang === 'ar';
    const usersList = users.filter(u => u.role !== 'admin');

    const labels = isRTL ? {
        title: 'تقرير المشتركين',
        client: 'العميل',
        email: 'البريد',
        subStatus: 'حالة الاشتراك',
        expiry: 'تاريخ الانتهاء',
        daysLeft: 'أيام متبقية',
        revenue: 'قيمة الاشتراك',
        totalRevenue: 'إجمالي الإيرادات',
        currency: 'ج.م'
    } : {
        title: 'Subscribers Report',
        client: 'Client',
        email: 'Email',
        subStatus: 'Sub Status',
        expiry: 'Expiry Date',
        daysLeft: 'Days Left',
        revenue: 'Sub Price',
        totalRevenue: 'Total Revenue',
        currency: 'EGP'
    };

    let totalRev = 0;

    const rows = usersList.map(u => {
        let status = 'No Sub';
        let expiry = '-';
        let days = 0;
        let price = 0;
        let statusColor = '#94a3b8';

        if (u.subscription) {
            const end = addDays(parseISO(u.subscription.start_date), u.subscription.duration_days);
            expiry = format(end, 'yyyy-MM-dd');
            days = differenceInDays(end, new Date());
            price = u.subscription.price;
            totalRev += price;

            if (u.subscription.status === 'paused') {
                status = 'Paused';
                statusColor = '#d97706';
            } else if (days > 0) {
                status = 'Active';
                statusColor = '#16a34a';
            } else {
                status = 'Expired';
                statusColor = '#dc2626';
            }
        }

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px;">
                <div style="font-weight: bold; color: #0f172a;">${u.full_name}</div>
                <div style="font-size: 11px; color: #64748b;">${u.email}</div>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="color: ${statusColor}; font-weight: bold; font-size: 12px;">${status}</span>
            </td>
            <td style="padding: 12px;">${expiry}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold;">${days > 0 ? days : 0}</td>
            <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'};">${price.toLocaleString()}</td>
        </tr>
        `;
    }).join('');

    const html = `
     <div style="font-family: 'Cairo', sans-serif; padding: 40px; color: #1f2937; direction: ${isRTL ? 'rtl' : 'ltr'};">
         <h1 style="color: #4338ca; font-size: 28px; font-weight: 800; margin-bottom: 5px;">${labels.title}</h1>
         <p style="color: #64748b; margin-bottom: 30px;">${format(new Date(), 'yyyy-MM-dd')}</p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead style="background: #e0e7ff; color: #3730a3;">
                <tr>
                    <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'};">${labels.client}</th>
                    <th style="padding: 12px; text-align: center;">${labels.subStatus}</th>
                    <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'};">${labels.expiry}</th>
                    <th style="padding: 12px; text-align: center;">${labels.daysLeft}</th>
                    <th style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'};">${labels.revenue}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <tr style="background: #f5f3ff; font-weight: bold;">
                    <td colspan="4" style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; text-transform: uppercase;">${labels.totalRevenue}</td>
                    <td style="padding: 12px; text-align: ${isRTL ? 'left' : 'right'}; color: #4338ca; font-size: 14px;">${totalRev.toLocaleString()} ${labels.currency}</td>
                </tr>
            </tbody>
         </table>
    </div>
    `;

    await generatePdfFromHtml(html, `Admin_Report.pdf`, isRTL);
};
