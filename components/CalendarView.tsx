
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, ToolbarProps, View, EventProps } from 'react-big-calendar';
import { format, getDay, addDays, addMonths, endOfMonth, isValid, isWithinInterval } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { FilterPopover } from './FilterPopover';
import { MultiSelectBookings } from './MultiSelectBookings';
import { MultiSelectUnits } from './MultiSelectUnits';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, CalendarCheck, List, Clock, CheckCircle, XCircle, X, User, Phone, Home, DollarSign, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus } from '../types';

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // default to Sunday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Fallback parse since date-fns parse might be missing in some envs
const parse = (value: string, formatString: string, backup: Date, options?: any) => {
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return backup || new Date();
};

// Localizer setup
const locales = {
  'en-US': enUS,
  'ar': arSA,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom Event Component for richer, highly legible display — wraps long names downwards.
// The name is clamped to 2 lines so a day cell always fits exactly two bars, comfortably.
const CustomEvent = ({ event }: EventProps<any>) => {
  const b = event.allData;

  const StatusIcon = () => {
    switch (event.status) {
      case BookingStatus.CONFIRMED: return <CheckCircle size={12} strokeWidth={2.5} className="shrink-0 text-white mt-px" />;
      case BookingStatus.PENDING: return <Clock size={12} strokeWidth={2.5} className="shrink-0 text-slate-900 mt-px" />;
      case BookingStatus.CANCELLED: return <XCircle size={12} strokeWidth={2.5} className="shrink-0 text-white mt-px" />;
      default: return null;
    }
  };

  return (
    <div
      className="flex items-start justify-between w-full h-auto gap-1 select-none"
      title={`${event.title} • ${event.desc} (${b?.start_date} ➔ ${b?.end_date})`}
    >
      <div className="flex items-start gap-1 min-w-0 flex-1">
        <StatusIcon />
        {/* break-words + line-clamp: a long tenant name breaks to a 2nd line inside the same label */}
        <span className="font-bold text-xs leading-tight tracking-tight break-words whitespace-normal line-clamp-2">
          {event.title}
        </span>
      </div>
      {/* Unit badge stays small so the tenant name keeps the width */}
      <span className="shrink-0 max-w-[32%] truncate text-[9px] font-bold px-1 py-px rounded bg-black/20 dark:bg-black/35 self-start">
        {event.desc}
      </span>
    </div>
  );
};

// Availability segments for the displayed month: continuous day ranges marked available/unavailable
interface AvailabilitySegment {
  from: number; // day of month (1-based)
  to: number;
  available: boolean;
  bookingInfo?: string;
  unitName?: string;
}

interface UnitSchedule {
  unitId: string;
  unitName: string;
  segments: AvailabilitySegment[];
  availableDays: number;
  unavailableDays: number;
}

// Computes timeline where checkout days are open for checkin:
// e.g. Booking 3->5 results in: [1->3 Available], [3->5 Booked], [5->daysInMonth Available]
const computeUnitSchedule = (
  unitId: string,
  unitName: string,
  bookings: Booking[],
  monthDate: Date
): UnitSchedule => {
  const mStart = startOfMonth(monthDate);
  const mEnd = endOfMonth(monthDate);
  const daysInMonth = mEnd.getDate();

  // 1. Filter bookings for this unit that intersect the month
  const unitBookings = bookings
    .filter(b => (b.unit_id === unitId || !unitId || unitId === 'all') && b.status !== BookingStatus.CANCELLED)
    .map(b => {
      const s = new Date(`${b.start_date}T00:00:00`);
      const e = new Date(`${b.end_date}T00:00:00`);
      return { s, e, raw: b };
    })
    .filter(({ s, e }) => isValid(s) && isValid(e) && s <= mEnd && e >= mStart);

  interface BookingInterval {
    start: number;
    end: number;
    titles: string[];
  }

  const rawIntervals: BookingInterval[] = [];
  unitBookings.forEach(({ s, e, raw }) => {
    const startDay = s < mStart ? 1 : s.getDate();
    const endDay = e > mEnd ? daysInMonth : e.getDate();
    if (startDay <= endDay) {
      rawIntervals.push({
        start: startDay,
        end: endDay,
        titles: [raw.tenant_name]
      });
    }
  });

  // Sort by start day ascending, then end day ascending
  rawIntervals.sort((a, b) => a.start - b.start || a.end - b.end);

  // Merge contiguous or overlapping bookings (e.g. checkout Day 5 meets checkin Day 5)
  const mergedBooked: BookingInterval[] = [];
  for (const interval of rawIntervals) {
    if (mergedBooked.length === 0) {
      mergedBooked.push({ ...interval });
    } else {
      const last = mergedBooked[mergedBooked.length - 1];
      if (interval.start <= last.end) {
        last.end = Math.max(last.end, interval.end);
        last.titles.push(...interval.titles);
      } else {
        mergedBooked.push({ ...interval });
      }
    }
  }

  // 3. Build timeline: alternating Available and Booked intervals
  const segments: AvailabilitySegment[] = [];
  let currentDay = 1;

  for (const b of mergedBooked) {
    // Gap before this booking is AVAILABLE
    if (b.start > currentDay) {
      segments.push({
        from: currentDay,
        to: b.start,
        available: true,
        unitName
      });
    }
    // The booked period
    segments.push({
      from: b.start,
      to: b.end,
      available: false,
      bookingInfo: b.titles.join(' • '),
      unitName
    });
    currentDay = Math.max(currentDay, b.end);
  }

  // Gap after the last booking to the end of the month is AVAILABLE
  if (currentDay < daysInMonth) {
    segments.push({
      from: currentDay,
      to: daysInMonth,
      available: true,
      unitName
    });
  } else if (mergedBooked.length === 0) {
    // Whole month is available
    segments.push({
      from: 1,
      to: daysInMonth,
      available: true,
      unitName
    });
  }

  // Calculate nights
  let unavailableDays = 0;
  mergedBooked.forEach(b => {
    unavailableDays += Math.max(1, b.end - b.start);
  });
  unavailableDays = Math.min(daysInMonth, unavailableDays);
  const availableDays = Math.max(0, daysInMonth - unavailableDays);

  return {
    unitId,
    unitName,
    segments,
    availableDays,
    unavailableDays
  };
};

// Custom Toolbar Component - stationary at the top
interface CustomToolbarProps {
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: View) => void;
  date: Date;
  view: View;
}

const CustomToolbar = ({ onNavigate, onView, date, view }: CustomToolbarProps) => {
  const { t, isRTL, language, dateLocale } = useApp();
  const navigate = useNavigate();

  const label = format(date, 'MMMM yyyy', { locale: dateLocale });

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white/70 dark:bg-slate-800/60 p-3 rounded-2xl border border-white/60 dark:border-white/5 shadow-sm backdrop-blur-sm">

      {/* Left: Navigation */}
      <div className="flex items-center gap-1.5 order-2 md:order-1 w-full md:w-auto justify-between md:justify-start bg-white/80 dark:bg-slate-700/60 p-1 rounded-xl border border-gray-200/60 dark:border-gray-600/50">
        <button onClick={() => onNavigate('PREV')} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow" title={t('previous') || 'Previous'}>
          {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button onClick={() => onNavigate('TODAY')} className="px-3.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all">
          {t('today')}
        </button>
        <button onClick={() => onNavigate('NEXT')} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow" title={t('next') || 'Next'}>
          {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Center: Title */}
      <div className="text-center order-1 md:order-2">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white font-sans capitalize tracking-tight drop-shadow-sm">{label}</h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 order-3 w-full md:w-auto">
        <div className="flex flex-wrap justify-center bg-gray-100 dark:bg-slate-700/80 p-1 rounded-xl flex-1 md:flex-none">
          <button
            onClick={() => onView('month')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === 'month' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <CalendarIcon size={14} /> <span>{language === 'ar' ? 'شهر' : 'Month'}</span>
          </button>
          <button
            onClick={() => onView('agenda')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === 'agenda' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <List size={14} /> <span>{language === 'ar' ? 'الأجندة' : 'Agenda'}</span>
          </button>
          <button
            onClick={() => onView('availability' as any)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === ('availability' as any) ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <CalendarCheck size={14} /> <span>{language === 'ar' ? 'الأيام المتاحة' : 'Availability'}</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/bookings')}
          className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary-600/30 active:scale-95"
          title={t('addBooking')}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export const CalendarView = () => {
  const { t, state, isRTL, dateSettings, formatDate, language, dateLocale } = useApp();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(startOfMonth(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterUnitIds, setFilterUnitIds] = useState<string[]>([]);
  const [filterBookingIds, setFilterBookingIds] = useState<string[]>([]);
  const [mainBookingStart, setMainBookingStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [mainBookingEnd, setMainBookingEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const monthStart = startOfMonth(date);
  const nextMonthStart = startOfMonth(addMonths(date, 1));

  // Independent panes: the weekday row never scrolls, the week grid scrolls under it
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const monthCardRef = useRef<HTMLDivElement>(null);

  // Width of the grid's own vertical scrollbar (0 on overlay-scrollbar systems).
  // The weekday row is padded by exactly this much so its columns stay aligned with the grid.
  const [scrollGutter, setScrollGutter] = useState({ size: 0, side: 'right' as 'right' | 'left' });

  useEffect(() => {
    const read = () => {
      const pane = monthScrollRef.current;
      if (!pane) return;
      const rtlPane = getComputedStyle(pane).direction === 'rtl';
      setScrollGutter({
        size: pane.offsetWidth - pane.clientWidth,
        side: rtlPane ? 'left' : 'right'
      });
    };
    read();
    window.addEventListener('resize', read);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    if (observer && monthScrollRef.current) observer.observe(monthScrollRef.current);
    return () => {
      window.removeEventListener('resize', read);
      observer?.disconnect();
    };
  }, [view]);

  // Moving sideways over the grid: Shift + wheel, a trackpad swipe or a tilted wheel scrolls
  // the month card horizontally. Attached natively (non-passive) so preventDefault works and
  // the gesture is not handled twice.
  useEffect(() => {
    const pane = monthScrollRef.current;
    if (!pane) return;

    const onWheel = (e: WheelEvent) => {
      const card = monthCardRef.current;
      if (!card || card.scrollWidth <= card.clientWidth) return;

      const isHorizontal = e.shiftKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY);
      if (!isHorizontal) return;

      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      if (!dx) return;

      e.preventDefault();
      card.scrollLeft += dx;
    };

    pane.addEventListener('wheel', onWheel, { passive: false });
    return () => pane.removeEventListener('wheel', onWheel);
  }, [view]);

  // The 7 weekday columns of the visible grid (the localizer always starts the week on Sunday,
  // exactly like react-big-calendar does for this calendar)
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(startOfMonth(date)), i)),
    [date]
  );

  const targetUnits = useMemo(() => {
    if (filterUnitIds.length > 0) {
      return state.units.filter(u => filterUnitIds.includes(u.id));
    }
    return state.units.length > 0
      ? state.units
      : [{ id: 'default', name: language === 'ar' ? 'الوحدة' : 'Unit' } as Unit];
  }, [filterUnitIds, state.units, language]);

  const [selectedUnitScheduleId, setSelectedUnitScheduleId] = useState<string>('all');

  const unitSchedules = useMemo(() => {
    return targetUnits.map(u => computeUnitSchedule(u.id, u.name, state.bookings, date));
  }, [targetUnits, state.bookings, date]);

  const displayedSchedules = useMemo(() => {
    if (selectedUnitScheduleId === 'all' || targetUnits.length <= 1) {
      return unitSchedules;
    }
    return unitSchedules.filter(s => s.unitId === selectedUnitScheduleId);
  }, [unitSchedules, selectedUnitScheduleId, targetUnits.length]);

  const totalAvailableDays = unitSchedules.reduce((sum, s) => sum + s.availableDays, 0);
  const totalUnavailableDays = unitSchedules.reduce((sum, s) => sum + s.unavailableDays, 0);

  // Full panel for the "Availability" tab: timeline list of day ranges per unit
  const AvailabilityPanel = () => (
    <div className="w-full p-4 md:p-6 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-white/60 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div>
          <h3 className="text-xl font-black text-gray-800 dark:text-white capitalize">
            {language === 'ar' ? 'الأيام المتاحة' : 'Availability'} — {format(date, 'MMMM yyyy', { locale: dateLocale })}
          </h3>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'ar'
              ? 'يوم انتهاء الحجز متاح لبدء حجز جديد (تسليم واستلام في نفس اليوم)'
              : 'Checkout day is available for a new booking (same-day transition)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {language === 'ar' ? `${totalAvailableDays} يوم متاح` : `${totalAvailableDays} days available`}
          </span>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {language === 'ar' ? `${totalUnavailableDays} يوم محجوز` : `${totalUnavailableDays} days booked`}
          </span>
        </div>
      </div>

      {targetUnits.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-700/50">
          <button
            onClick={() => setSelectedUnitScheduleId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedUnitScheduleId === 'all'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            {language === 'ar' ? 'كل الوحدات' : 'All Units'}
          </button>
          {targetUnits.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUnitScheduleId(u.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedUnitScheduleId === u.id
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {displayedSchedules.map(sched => (
          <div key={sched.unitId} className="space-y-3">
            {targetUnits.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <h4 className="font-extrabold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Home size={16} className="text-primary-500" />
                  <span>{sched.unitName}</span>
                </h4>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {language === 'ar' ? `${sched.availableDays} متاح` : `${sched.availableDays} free`}
                  </span>
                  <span>•</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    {language === 'ar' ? `${sched.unavailableDays} محجوز` : `${sched.unavailableDays} booked`}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {sched.segments.map((seg, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                    seg.available
                      ? 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/60'
                      : 'bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/70 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 flex items-center justify-center rounded-xl font-black text-sm ${seg.available ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30' : 'bg-rose-500 text-white shadow shadow-rose-500/30'}`}>
                      {seg.available ? '✓' : '✕'}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
                        {seg.from === seg.to
                          ? (seg.available
                              ? (language === 'ar' ? `يوم ${seg.from} فاضي` : `Day ${seg.from} (Free)`)
                              : (language === 'ar' ? `يوم ${seg.from} محجوز` : `Day ${seg.from} (Booked)`))
                          : (language === 'ar'
                              ? `من يوم ${seg.from} إلى يوم ${seg.to}`
                              : `Day ${seg.from} to day ${seg.to}`)}
                      </span>
                      {seg.bookingInfo && (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {seg.bookingInfo}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-black ${
                    seg.available
                      ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30'
                      : 'bg-rose-500 text-white shadow shadow-rose-500/30'
                  }`}>
                    {seg.available
                      ? (seg.from === seg.to
                          ? (language === 'ar' ? 'فاضي' : 'Free')
                          : (language === 'ar' ? 'متاح' : 'Available'))
                      : (language === 'ar' ? 'محجوز' : 'Booked')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Filtered active bookings in the current month for the rich Agenda view
  const monthBookings = useMemo(() => {
    return state.bookings
      .filter(b => filterBookingIds.length === 0 || filterBookingIds.includes(b.id))
      .filter(b => filterUnitIds.length === 0 || filterUnitIds.includes(b.unit_id))
      .filter(b => {
        const s = new Date(`${b.start_date}T00:00:00`);
        const e = new Date(`${b.end_date}T00:00:00`);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
        return s < nextMonthStart && e >= monthStart;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [state.bookings, filterBookingIds, filterUnitIds, monthStart, nextMonthStart]);

  // Rich Agenda Panel: Never a blank white page, presents full booking cards with contacts and financials
  const AgendaPanel = () => {
    const totalRevenue = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalPaid = monthBookings.reduce((sum, b) => sum + (b.paid || 0), 0);

    return (
      <div className="w-full h-full overflow-y-auto p-4 md:p-6 bg-white/70 dark:bg-slate-800/50 rounded-2xl border border-white/60 dark:border-white/5 space-y-4">
        {/* Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-700/60">
          <div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white capitalize">
              {language === 'ar' ? 'أجندة الحجوزات' : 'Bookings Agenda'} — {format(date, 'MMMM yyyy', { locale: dateLocale })}
            </h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
              {language === 'ar' ? `إجمالي الحجوزات: ${monthBookings.length} حجز` : `Total Bookings: ${monthBookings.length}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {language === 'ar' ? `المحصل: ${totalPaid.toLocaleString()} ج.م` : `Collected: ${totalPaid.toLocaleString()}`}
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-700/60 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
              {language === 'ar' ? `الإجمالي: ${totalRevenue.toLocaleString()} ج.م` : `Total: ${totalRevenue.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Empty State */}
        {monthBookings.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center text-gray-400">
              <CalendarIcon size={32} />
            </div>
            <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">
              {language === 'ar' ? 'لا توجد أي حجوزات مسجلة في هذا الشهر' : 'No bookings recorded in this month'}
            </h4>
            <p className="text-sm text-gray-500 max-w-sm">
              {language === 'ar'
                ? 'يمكنك إضافة حجز جديد أو التنقل بين الأشهر باستخدام أزرار التحكم أعلاه'
                : 'You can add a new booking or navigate between months using the top controls'}
            </p>
            <button
              onClick={() => navigate('/bookings')}
              className="mt-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-transform active:scale-95 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>{t('addBooking')}</span>
            </button>
          </div>
        ) : (
          /* Bookings List Cards */
          <div className="space-y-3">
            {monthBookings.map(b => {
              const unit = state.units.find(u => u.id === b.unit_id);
              const remaining = (b.price || 0) - (b.paid || 0);

              const statusBadge = () => {
                switch (b.status) {
                  case BookingStatus.CONFIRMED:
                    return (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <CheckCircle size={14} strokeWidth={2.5} />
                        {language === 'ar' ? 'مؤكد' : 'Confirmed'}
                      </span>
                    );
                  case BookingStatus.PENDING:
                    return (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock size={14} strokeWidth={2.5} />
                        {language === 'ar' ? 'غير مؤكد' : 'Pending'}
                      </span>
                    );
                  case BookingStatus.CANCELLED:
                    return (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle size={14} strokeWidth={2.5} />
                        {language === 'ar' ? 'ملغي' : 'Cancelled'}
                      </span>
                    );
                  default:
                    return null;
                }
              };

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group min-h-[5.5rem] h-auto"
                >
                  {/* Left: Tenant & Unit info */}
                  <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-lg shrink-0 group-hover:scale-105 transition-transform mt-0.5 md:mt-0">
                      <User size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-base text-gray-900 dark:text-white break-words whitespace-normal leading-snug">
                          {b.tenant_name}
                        </h4>
                        {statusBadge()}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                          <Home size={14} className="text-primary-500" />
                          {unit?.name || 'Unit'}
                        </span>
                        <span>•</span>
                        <span className="font-semibold">
                          {language === 'ar'
                            ? `من ${formatDate(b.start_date)} إلى ${formatDate(b.end_date)}`
                            : `${formatDate(b.start_date)} to ${formatDate(b.end_date)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Financial & Actions */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100 dark:border-gray-700/60">
                    <div className="text-left rtl:text-right">
                      <div className="text-sm font-black text-gray-900 dark:text-white">
                        {b.price?.toLocaleString()} <span className="text-xs font-bold text-gray-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {language === 'ar' ? `المدفوع: ${b.paid?.toLocaleString() || 0}` : `Paid: ${b.paid?.toLocaleString() || 0}`}
                        {remaining > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 mr-1 ml-1 font-bold">
                            ({language === 'ar' ? `متبقي ${remaining.toLocaleString()}` : `Left ${remaining.toLocaleString()}`})
                          </span>
                        )}
                      </div>
                    </div>

                    {b.tenant_phone && (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <a
                          href={`tel:${b.tenant_phone}`}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title={language === 'ar' ? 'اتصال هاتفي' : 'Call'}
                        >
                          <Phone size={16} />
                        </a>
                        <a
                          href={`https://wa.me/${b.tenant_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // react-big-calendar requires static .title and .navigate on every registered view
  // (Calendar.js calls View.title on render; utils/move.js requires .navigate for PREV/NEXT).
  (AvailabilityPanel as any).title = () => '';
  (AvailabilityPanel as any).navigate = (d: Date, action: string) =>
    action === 'NEXT' ? addMonths(d, 1) : action === 'PREV' ? addMonths(d, -1) : d;

  const events = useMemo(() => {
    const list = state.bookings
      .filter(b => filterBookingIds.length === 0 || filterBookingIds.includes(b.id))
      .filter(b => filterUnitIds.length === 0 || filterUnitIds.includes(b.unit_id))
      .map(b => {
        // 1. Force parsing exactly at local 00:00:00 to avoid any UTC offset skew.
        const start = new Date(`${b.start_date}T00:00:00`);
        const end = new Date(`${b.end_date}T00:00:00`);

        // 2. Add precisely 1 calendar day to the END date so react-big-calendar renders over the checkout day
        end.setDate(end.getDate() + 1);

        // Clamp visual boundaries to the strict month limits.
        const clampedStart = start < monthStart ? monthStart : start;
        const clampedEnd = end > nextMonthStart ? nextMonthStart : end;

        return {
          id: b.id,
          title: b.tenant_name,
          desc: state.units.find(u => u.id === b.unit_id)?.name || 'Unit',
          start: clampedStart,
          end: clampedEnd,
          allDay: true,
          status: b.status,
          resource: b.unit_id,
          allData: b
        };
      })
      .filter(event => event.start < event.end); // Only keep events that functionally intersect the current target month

    // Explicitly sort events:
    // If two bookings share a transition day:
    // The one that started earlier (or ends today) is sorted first -> allocated to TOP LANE (Lane 0).
    // The one that starts today is sorted second -> allocated to BOTTOM LANE (Lane 1).
    list.sort((a, b) => {
      const diffStart = a.start.getTime() - b.start.getTime();
      if (diffStart !== 0) return diffStart;
      return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
    });

    return list;
  }, [state.bookings, state.units, filterBookingIds, filterUnitIds, monthStart, nextMonthStart]);

  const formats = useMemo(() => ({
    weekdayFormat: (d: Date) => format(d, 'EEEE', { locale: dateLocale }),
    monthHeaderFormat: (d: Date) => format(d, 'MMMM yyyy', { locale: dateLocale }),
  }), [dateLocale]);

  const messages = {
    allDay: 'All Day',
    previous: isRTL ? 'السابق' : 'Back',
    next: isRTL ? 'التالي' : 'Next',
    today: isRTL ? 'اليوم' : 'Today',
    month: isRTL ? 'شهر' : 'Month',
    week: isRTL ? 'أسبوع' : 'Week',
    day: isRTL ? 'يوم' : 'Day',
    agenda: isRTL ? 'أجندة' : 'Agenda',
    date: isRTL ? 'التاريخ' : 'Date',
    time: isRTL ? 'الوقت' : 'Time',
    event: isRTL ? 'حدث' : 'Event',
    noEventsInRange: 'No bookings in this range',
    showMore: (total: number) => `+${total} more`
  };

  const eventPropGetter = (event: any) => {
    let className = 'shadow-md border-r-4 rtl:border-r-4 rtl:border-l-0 ltr:border-l-4 ltr:border-r-0 transition-colors hover:brightness-105 cursor-pointer rounded-lg font-bold ';

    switch (event.status) {
      case BookingStatus.CONFIRMED:
        className += 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-900 text-white shadow-blue-500/20';
        break;
      case BookingStatus.PENDING:
        className += 'bg-gradient-to-r from-amber-400 to-amber-500 border-amber-600 text-slate-950 font-bold shadow-amber-500/20';
        break;
      case BookingStatus.CANCELLED:
        className += 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-800 text-white opacity-60 decoration-slice line-through shadow-rose-500/20';
        break;
      default:
        className += 'bg-slate-500 border-slate-700 text-white';
    }

    return { className };
  };

  const handleSelectEvent = (event: any) => {
    if (event.allData) {
      setSelectedBooking(event.allData);
    }
  };

  const navigate = useNavigate();

  // Scroll ONLY the calendar's own panes to today — never the page/other scroll containers,
  // which is what used to make the whole view jump around.
  const scrollToToday = () => {
    setTimeout(() => {
      const todayCell = (document.querySelector('.rbc-day-bg.rbc-today') || document.querySelector('.rbc-today')) as HTMLElement | null;
      if (!todayCell) return;

      const vPane = monthScrollRef.current;
      if (vPane) {
        const paneRect = vPane.getBoundingClientRect();
        const cellRect = todayCell.getBoundingClientRect();
        const target = vPane.scrollTop + (cellRect.top - paneRect.top) - (vPane.clientHeight - cellRect.height) / 2;
        vPane.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }

      const hPane = monthCardRef.current;
      if (hPane && hPane.scrollWidth > hPane.clientWidth) {
        const paneRect = hPane.getBoundingClientRect();
        const cellRect = todayCell.getBoundingClientRect();
        const target = hPane.scrollLeft + (cellRect.left - paneRect.left) - (hPane.clientWidth - cellRect.width) / 2;
        hPane.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      }

      todayCell.classList.add('today-pulse-highlight');
      setTimeout(() => {
        todayCell.classList.remove('today-pulse-highlight');
      }, 2500);
    }, 120);
  };

  useEffect(() => {
    if (view === 'month') {
      scrollToToday();
    }
  }, [view]);

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'TODAY') {
      setDate(new Date());
      if (view !== 'month') {
        setView('month');
      }
      scrollToToday();
    } else if (action === 'PREV') {
      setDate(d => addMonths(d, -1));
    } else if (action === 'NEXT') {
      setDate(d => addMonths(d, 1));
    }
  };

  const onNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const calendarCulture = dateSettings.language === 'match'
    ? (isRTL ? 'ar' : 'en-US')
    : (dateSettings.language === 'ar' ? 'ar' : 'en-US');

  return (
    <div className="w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-100px)] p-3 md:p-5 glass rounded-[32px] flex flex-col bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-white/5 relative shadow-soft overflow-hidden">
      {/* 1. FIXED STATIONARY TOP HEADER: Legend/Filter + CustomToolbar */}
      <div className="shrink-0 z-20 pb-2 border-b border-gray-200/50 dark:border-gray-700/50 mb-3">
        {/* Top Controls Row: Status Legend (ONLY in Month view) on one side + FilterPopover on the other */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2.5 mb-2.5 px-1">
          {/* Status Legend visible ONLY in Month View — compact segmented container, aligned with the grid */}
          {view === 'month' ? (
            <div className="shrink-0 flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 shadow-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/40">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>{language === 'ar' ? 'مؤكد' : 'Confirmed'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{language === 'ar' ? 'غير مؤكد' : 'Pending'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-900/30 border border-rose-200/60 dark:border-rose-800/40">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{language === 'ar' ? 'ملغي' : 'Cancelled'}</span>
              </div>
            </div>
          ) : <div />}

          <FilterPopover>
            {/* Unit Filter */}
            <div className="flex flex-col gap-1.5 w-72 pt-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('unit')}</label>
              <MultiSelectUnits
                units={state.units}
                selectedUnitIds={filterUnitIds}
                onChange={setFilterUnitIds}
              />
            </div>
            <div className="flex flex-col gap-1.5 w-72 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'البحث عن حجز' : 'Find Booking'}</label>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                  <CalendarIcon size={16} className="text-gray-400 shrink-0" />
                  <input type="date" className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full" value={mainBookingStart} onChange={e => setMainBookingStart(e.target.value)} title={language === 'ar' ? 'من تاريخ الحجز' : 'Booking from'} />
                  <span className="text-gray-400 font-bold shrink-0">-</span>
                  <input type="date" className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full" value={mainBookingEnd} onChange={e => setMainBookingEnd(e.target.value)} title={language === 'ar' ? 'إلى تاريخ الحجز' : 'Booking to'} />
                </div>
                <MultiSelectBookings
                  bookings={state.bookings.filter(b => {
                    let show = true;
                    if (mainBookingStart && mainBookingEnd) {
                      const d = new Date(b.start_date);
                      const s = new Date(mainBookingStart);
                      const e = new Date(mainBookingEnd);
                      if (isValid(d) && isValid(s) && isValid(e)) {
                        show = (filterUnitIds.length === 0 || filterUnitIds.includes(b.unit_id)) &&
                          (isWithinInterval(d, { start: s, end: e }) || d.getTime() === s.getTime() || d.getTime() === e.getTime());
                      }
                    }
                    return show && (filterUnitIds.length === 0 || filterUnitIds.includes(b.unit_id));
                  })}
                  selectedBookingIds={filterBookingIds}
                  onChange={setFilterBookingIds}
                />
              </div>
            </div>
          </FilterPopover>
        </div>

        {/* Stationary Custom Toolbar */}
        <CustomToolbar
          onNavigate={handleNavigate}
          onView={(v) => setView(v as View)}
          date={date}
          view={view}
        />
      </div>

      {/* 2. DEDICATED INDEPENDENT SCROLLABLE BODY AREA */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        {view === 'month' && (
          /* Horizontal pane (weekday row + grid move together sideways) holding a vertical pane.
             The weekday row sits OUTSIDE the vertical pane, so it is always stationary and can
             never slide into the date numbers while the month grid scrolls. */
          <div ref={monthCardRef} className="rbc-month-xscroll w-full h-full overflow-x-auto overflow-y-hidden rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-slate-800/40 shadow-inner">
            <div className="flex h-full w-full min-w-[1600px] max-w-[1900px] mx-auto flex-col">
              {/* Stationary weekday names — padded by the grid's scrollbar width so the
                  columns line up exactly with the week rows below */}
              <div
                dir={(isRTL || calendarCulture === 'ar') ? 'rtl' : 'ltr'}
                className="rbc-weekday-row shrink-0"
                style={scrollGutter.side === 'right'
                  ? { paddingRight: scrollGutter.size }
                  : { paddingLeft: scrollGutter.size }}
              >
                {weekDays.map((d, i) => (
                  <div key={i} className="rbc-weekday-cell">
                    {format(d, 'EEEE', { locale: dateLocale })}
                  </div>
                ))}
              </div>

              {/* Weeks grid — scrolls vertically on its own, under the fixed weekday row */}
              <div
                ref={monthScrollRef}
                className="rbc-month-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              >
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  rtl={calendarCulture === 'ar'}
                  culture={calendarCulture}
                  messages={messages}
                  formats={formats}
                  toolbar={false}
                  components={{
                    event: CustomEvent
                  }}
                  view="month"
                  date={date}
                  length={35}
                  eventPropGetter={eventPropGetter}
                  onSelectEvent={handleSelectEvent}
                  popup={false}
                  className="font-sans w-full text-gray-700 dark:text-gray-200"
                />
              </div>
            </div>
          </div>
        )}

        {view === 'agenda' && <AgendaPanel />}

        {view === ('availability' as any) && (
          <div className="w-full h-full overflow-y-auto">
            <AvailabilityPanel />
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl ring-1 ring-black/5">
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 relative overflow-hidden">
              <div className={`absolute top-0 p-4 ${isRTL ? 'left-0' : 'right-0'}`}>
                <button onClick={() => setSelectedBooking(null)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="relative z-10 text-white">
                <h3 className="font-extrabold text-2xl mb-1 drop-shadow-sm">{selectedBooking.tenant_name}</h3>
                <div className="flex items-center gap-2 text-blue-100 font-medium">
                  <Home size={16} />
                  <span className="text-sm">{state.units.find(u => u.id === selectedBooking.unit_id)?.name}</span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <span className="font-bold text-lg text-gray-800 dark:text-white tracking-wide flex items-center gap-1">
                  <span className="text-gray-400 text-base">+20</span>
                  {selectedBooking.phone}
                </span>
                <div className="flex gap-2">
                  <a
                    href={`tel:+20${selectedBooking.phone}`}
                    className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                    title="Call"
                  >
                    <Phone size={20} />
                  </a>
                  <a
                    href={`https://wa.me/20${selectedBooking.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                    title="WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </a>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Check In</span>
                  <span className="font-bold text-gray-800 dark:text-white text-sm">{formatDate(selectedBooking.start_date)}</span>
                </div>

                <div className="w-10 h-10 flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                  <CalendarIcon size={20} />
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Check Out</span>
                  <span className="font-bold text-gray-800 dark:text-white text-sm">{formatDate(selectedBooking.end_date)}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm flex overflow-hidden">
                <div className={`w-2 ${selectedBooking.payment_status === 'Paid' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div className="flex-1 p-4 flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {selectedBooking.total_rental_price.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Total</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold ${selectedBooking.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {selectedBooking.payment_status}
                  </div>
                </div>
                <div className="pr-4 flex items-center justify-center text-green-600 dark:text-green-500">
                  <DollarSign size={24} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 flex justify-center pb-6">
              <button className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${selectedBooking.status === 'Confirmed' ? 'bg-blue-600 shadow-blue-500/30' :
                selectedBooking.status === 'Pending' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'
                }`}>
                {selectedBooking.status === 'Confirmed' && <CheckCircle size={20} />}
                {selectedBooking.status === 'Pending' && <Clock size={20} />}
                {selectedBooking.status === 'Cancelled' && <XCircle size={20} />}
                {selectedBooking.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
