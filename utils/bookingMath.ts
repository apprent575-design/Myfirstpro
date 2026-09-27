import { addMonths, addYears, differenceInCalendarDays, isValid } from 'date-fns';
import { Booking, FeeType, PeriodUnit } from '../types';

/* -------------------------------------------------------------------------
   حسابات الحجز المشتركة بين كل الصفحات والتقارير
   - النظام العادي: بالليلة (سعر الليلة × عدد الليالي)
   - النظام الجديد: بالشهر/السنة (سعر الشهر × عدد الشهور) — والشهر شهر على الكالندر
     ورسوم القرية في النظام ده **بتتسجّل بس** (تظهر في تقرير رسوم القرية)
     من غير أي تأثير على صافي الربح ولا على الإجماليات.
   ------------------------------------------------------------------------- */

export const isMonthlyBooking = (booking?: Booking | null) => booking?.rental_mode === 'monthly';

export const periodUnitOf = (booking?: Booking | null): PeriodUnit =>
  booking?.period_unit === 'years' ? 'years' : 'months';

export const periodCount = (booking?: Booking | null) =>
  Math.max(0, Number(booking?.period_count) || 0);

export const periodRate = (booking?: Booking | null) =>
  Math.max(0, Number(booking?.period_rate) || 0);

// نهاية الحجز في النظام الشهري: 1/8 + 3 شهور = 1/11 (شهر على الكالندر مش 30 يوم)
export const monthlyEndDate = (startIso: string, unit: PeriodUnit, count: number): string => {
  const start = new Date(`${startIso}T00:00:00`);
  if (!isValid(start) || !count) return '';
  const end = unit === 'years' ? addYears(start, count) : addMonths(start, count);
  return isValid(end) ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` : '';
};

// إجمالي الإيجار المسجّل في الحجز
export const bookingRentTotal = (booking: Booking): number =>
  isMonthlyBooking(booking)
    ? periodRate(booking) * periodCount(booking)
    : (booking.nightly_rate || 0) * (booking.nights || 0);

// رسوم القرية اللي بتظهر في تقرير رسوم القرية
// (في النظام الشهري المبلغ مكتوب مرة واحدة للمدة كلها)
export const bookingVillageFees = (booking: Booking): number =>
  isMonthlyBooking(booking)
    ? Number(booking.village_fee) || 0
    : (booking.village_fee || 0) * (booking.nights || 0);

// الرسوم اللي بتتخصم من صافي الربح — في النظام الشهري مفيش خصم خالص
export const bookingFeeDeduction = (booking: Booking): number => {
  if (isMonthlyBooking(booking)) return 0;
  if (booking.fee_type === FeeType.TENANT_PAYS) return 0;
  return (booking.village_fee || 0) * (booking.nights || 0);
};

// عدد الأيام الفعلي (للعرض في التقارير)
export const bookingDays = (booking: Booking): number => {
  if (isMonthlyBooking(booking)) {
    const start = new Date(`${booking.start_date}T00:00:00`);
    const end = new Date(`${booking.end_date}T00:00:00`);
    if (!isValid(start) || !isValid(end)) return 0;
    return Math.max(0, differenceInCalendarDays(end, start));
  }
  return booking.nights || 0;
};

// نص المدة: "ليالي" في النظام العادي، و"شهور/سنين" في النظام الجديد
export const bookingPeriodLabel = (booking: Booking, lang: 'ar' | 'en' = 'ar'): string => {
  if (isMonthlyBooking(booking)) {
    const count = periodCount(booking);
    const unit = periodUnitOf(booking);
    if (lang === 'en') return `${count} ${unit === 'years' ? (count === 1 ? 'year' : 'years') : (count === 1 ? 'month' : 'months')}`;
    if (unit === 'years') {
      return count === 1 ? 'سنة واحدة' : count === 2 ? 'سنتان' : count >= 3 && count <= 10 ? `${count} سنوات` : `${count} سنة`;
    }
    return count === 1 ? 'شهر واحد' : count === 2 ? 'شهران' : count >= 3 && count <= 10 ? `${count} شهور` : `${count} شهرًا`;
  }
  return lang === 'en' ? `${booking.nights || 0} nights` : `${booking.nights || 0} ليالي`;
};

// سعر الوحدة في النظام الجديد (سعر الشهر/السنة) — للعرض في التقارير
export const bookingUnitRateLabel = (booking: Booking, lang: 'ar' | 'en' = 'ar'): string => {
  if (!isMonthlyBooking(booking)) return lang === 'en' ? 'Nightly rate' : 'سعر الليلة';
  return periodUnitOf(booking) === 'years'
    ? lang === 'en' ? 'Yearly rate' : 'سعر السنة'
    : lang === 'en' ? 'Monthly rate' : 'سعر الشهر';
};
