
import React, { useMemo, useState } from 'react';
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

// Custom Event Component for richer, highly legible display
const CustomEvent = ({ event }: EventProps<any>) => {
  const b = event.allData;

  const StatusIcon = () => {
    switch (event.status) {
      case BookingStatus.CONFIRMED: return <CheckCircle size={15} strokeWidth={2.5} className="shrink-0 text-white" />;
      case BookingStatus.PENDING: return <Clock size={15} strokeWidth={2.5} className="shrink-0 text-slate-900" />;
      case BookingStatus.CANCELLED: return <XCircle size={15} strokeWidth={2.5} className="shrink-0 text-white" />;
      default: return null;
    }
  };

  return (
    <div
      className="flex items-center justify-between w-full h-full px-2 py-0.5 gap-2 overflow-hidden select-none"
      title={`${event.title} • ${event.desc} (${b?.start_date} ➔ ${b?.end_date})`}
    >
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <StatusIcon />
        <span className="font-black text-xs md:text-[13.5px] truncate tracking-tight drop-shadow-sm">
          {event.title}
        </span>
        <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/20 dark:bg-black/35 backdrop-blur-sm">
          {event.desc}
        </span>
      </div>
      {b?.start_date && b?.end_date && (
        <span className="text-[10px] font-bold opacity-85 shrink-0 hidden lg:inline-block bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded">
          {b.start_date.slice(5)} ➔ {b.end_date.slice(5)}
        </span>
      )}
    </div>
  );
};

// Availability segments for the displayed month: continuous day ranges marked available/unavailable
interface AvailabilitySegment {
  from: number; // day of month (1-based)
  to: number;
  available: boolean;
}

const computeAvailability = (bookings: Booking[], monthDate: Date): AvailabilitySegment[] => {
  const mStart = startOfMonth(monthDate);
  const mEnd = endOfMonth(monthDate);
  const daysInMonth = mEnd.getDate();
  const booked = new Array<boolean>(daysInMonth + 1).fill(false);

  bookings.forEach(b => {
    if (b.status === BookingStatus.CANCELLED) return;
    const s = new Date(`${b.start_date}T00:00:00`);
    const e = new Date(`${b.end_date}T00:00:00`);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    // Occupied nights run from check-in until the day before checkout (checkout day stays available)
    const lastNight = new Date(e);
    lastNight.setDate(lastNight.getDate() - 1);
    const from = Math.max(s.getTime(), mStart.getTime());
    const to = Math.min(lastNight.getTime(), mEnd.getTime());
    if (to < from) return;
    const fromDay = new Date(from).getDate();
    const toDay = new Date(to).getDate();
    for (let d = fromDay; d <= toDay; d++) booked[d] = true;
  });

  const segments: AvailabilitySegment[] = [];
  let cur: AvailabilitySegment | null = null;
  for (let d = 1; d <= daysInMonth; d++) {
    const available = !booked[d];
    if (cur && cur.available === available) {
      cur.to = d;
    } else {
      cur = { from: d, to: d, available };
      segments.push(cur);
    }
  }
  return segments;
};

// Custom Toolbar Component
const CustomToolbar = ({ onNavigate, onView, date, view }: ToolbarProps) => {
  const { t, isRTL, formatHeaderDate, language } = useApp();
  const navigate = useNavigate();

  // Use the new centralized date formatting
  const { dateLocale } = useApp();
  const label = format(date, 'MMMM yyyy', { locale: dateLocale });

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-[20px] border border-white/60 dark:border-white/5 shadow-sm backdrop-blur-sm">

      {/* Left: Navigation */}
      <div className="flex items-center gap-2 order-2 md:order-1 w-full md:w-auto justify-between md:justify-start bg-white/70 dark:bg-slate-700/50 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
        <button onClick={() => onNavigate('PREV')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow">
          {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <button onClick={() => onNavigate('TODAY')} className="px-4 py-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all">
          {t('today')}
        </button>
        <button onClick={() => onNavigate('NEXT')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow">
          {isRTL ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Center: Title */}
      <div className="text-center order-1 md:order-2">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white font-sans capitalize tracking-tight drop-shadow-sm">{label}</h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 order-3 w-full md:w-auto">
        <div className="flex flex-wrap justify-center bg-gray-100 dark:bg-slate-700/80 p-1 rounded-xl flex-1 md:flex-none">
          <button
            onClick={() => onView('month')}
            className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === 'month' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <CalendarIcon size={15} /> <span>Month</span>
          </button>
          <button
            onClick={() => onView('agenda')}
            className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === 'agenda' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <List size={15} /> <span>Agenda</span>
          </button>
          <button
            onClick={() => onView('availability' as any)}
            className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${view === ('availability' as any) ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <CalendarCheck size={15} /> <span>{language === 'ar' ? 'الأيام المتاحة' : 'Availability'}</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/bookings')}
          className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/30 active:scale-95"
          title={t('addBooking')}
        >
          <Plus size={20} strokeWidth={2.5} />
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

  // Availability segments (available/unavailable day ranges) for the currently displayed month
  const availability = useMemo(
    () => computeAvailability(
      state.bookings
        .filter(b => filterBookingIds.length === 0 || filterBookingIds.includes(b.id))
        .filter(b => filterUnitIds.length === 0 || filterUnitIds.includes(b.unit_id)),
      date
    ),
    [state.bookings, filterBookingIds, filterUnitIds, date]
  );

  const availableDays = availability.filter(s => s.available).reduce((sum, s) => sum + (s.to - s.from + 1), 0);
  const unavailableDays = availability.filter(s => !s.available).reduce((sum, s) => sum + (s.to - s.from + 1), 0);

  // Full panel for the "Availability" tab: vertical list of the month's day ranges
  const AvailabilityPanel = () => (
    <div className="w-full p-4 md:p-6 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-white/60 dark:border-white/5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-lg font-black text-gray-800 dark:text-white capitalize">
          {format(date, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {language === 'ar' ? `${availableDays} يوم متاح` : `${availableDays} days available`}
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {language === 'ar' ? `${unavailableDays} يوم غير متاح` : `${unavailableDays} days unavailable`}
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        {availability.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
              seg.available
                ? 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/60'
                : 'bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/70 dark:border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-9 h-9 flex items-center justify-center rounded-xl font-black text-sm ${seg.available ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30' : 'bg-rose-500 text-white shadow shadow-rose-500/30'}`}>
                {seg.available ? '✓' : '✕'}
              </span>
              <span className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
                {language === 'ar'
                  ? `من يوم ${seg.from} إلى يوم ${seg.to}`
                  : `Day ${seg.from} to day ${seg.to}`}
              </span>
            </div>
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black ${
              seg.available
                ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30'
                : 'bg-rose-500 text-white shadow shadow-rose-500/30'
            }`}>
              {seg.available ? (language === 'ar' ? 'متاح' : 'Available') : (language === 'ar' ? 'غير متاح' : 'Unavailable')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

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
    let className = 'shadow-md border-r-4 rtl:border-r-4 rtl:border-l-0 ltr:border-l-4 ltr:border-r-0 transition-all hover:brightness-105 cursor-pointer rounded-xl text-[13.5px] font-bold !p-0.5 ';

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

  const onNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const calendarCulture = dateSettings.language === 'match'
    ? (isRTL ? 'ar' : 'en-US')
    : (dateSettings.language === 'ar' ? 'ar' : 'en-US');

  return (
    <div className="w-full min-h-[calc(100vh-80px)] p-3 md:p-6 glass rounded-[32px] flex flex-col bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-white/5 relative shadow-soft">
      {/* Top Controls Row: Status Legend (ONLY in Month view) on the left/right + FilterPopover */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 z-10 px-2 lg:px-4">
        {/* Status Legend visible ONLY in Month View at the TOP */}
        {view === 'month' ? (
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm animate-pulse"></div>
              <span>{language === 'ar' ? 'مؤكد (Confirmed)' : 'Confirmed'}</span>
            </div>
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div>
              <span>{language === 'ar' ? 'غير مؤكد (Pending)' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></div>
              <span>{language === 'ar' ? 'ملغي (Cancelled)' : 'Cancelled'}</span>
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

      {/* Calendar Area with very large width and height */}
      <div className="w-full overflow-x-auto pb-4">
        <div className={`w-full ${view === 'month' ? 'min-w-[1150px] min-h-[1250px]' : 'min-h-[700px]'}`}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            rtl={calendarCulture === 'ar'}
            culture={calendarCulture}
            messages={messages}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent
            }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={onNavigate}
            length={35}
            eventPropGetter={eventPropGetter}
            onSelectEvent={handleSelectEvent}
            views={{ month: true, agenda: true, availability: AvailabilityPanel } as any}
            popup
            className="font-sans w-full h-full text-gray-700 dark:text-gray-200"
          />
        </div>
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
