
import React, { useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, ToolbarProps, View, EventProps } from 'react-big-calendar';
import { format, getDay, addDays, addMonths } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List, Clock, CheckCircle, XCircle, X, User, Phone, Home, DollarSign, MessageCircle } from 'lucide-react';
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

// Custom Event Component for richer display
const CustomEvent = ({ event }: EventProps<any>) => {
  const StatusIcon = () => {
    switch (event.status) {
      case BookingStatus.CONFIRMED: return <CheckCircle size={13} strokeWidth={2.5} />;
      case BookingStatus.PENDING: return <Clock size={13} strokeWidth={2.5} />;
      case BookingStatus.CANCELLED: return <XCircle size={13} strokeWidth={2.5} />;
      default: return null;
    }
  };

  return (
    <div className="flex items-center h-full w-full px-0.5 gap-1 overflow-hidden" title={`${event.title} • ${event.desc}`}>
      <span className="shrink-0 opacity-90"><StatusIcon /></span>
      <span className="font-bold text-[11px] truncate leading-none">{event.title} • {event.desc}</span>
    </div>
  );
};

// Custom Toolbar Component
const CustomToolbar = ({ onNavigate, onView, date, view }: ToolbarProps) => {
  const { t, isRTL, formatHeaderDate } = useApp();
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
        <div className="flex bg-gray-100 dark:bg-slate-700/80 p-1 rounded-xl flex-1 md:flex-none">
          <button
            onClick={() => onView('month')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${view === 'month' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <CalendarIcon size={16} /> <span>Month</span>
          </button>
          <button
            onClick={() => onView('agenda')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${view === 'agenda' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            <List size={16} /> <span>Agenda</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/bookings')}
          className="bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/30 active:scale-95"
          title={t('addBooking')}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export const CalendarView = () => {
  const { state, isRTL, dateSettings, formatDate, language } = useApp();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(startOfMonth(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const monthStart = startOfMonth(date);
  const nextMonthStart = startOfMonth(addMonths(date, 1));

  const events = state.bookings
    .map(b => {
      // 1. Force parsing exactly at local 00:00:00 to avoid any UTC offset skew.
      const start = new Date(`${b.start_date}T00:00:00`);
      const end = new Date(`${b.end_date}T00:00:00`);

      // 2. Add precisely 1 calendar day to the END date.
      // Since react-big-calendar treats allDay end dates as EXCLUSIVE,
      // stopping exactly at 00:00:00 on the day AFTER checkout forces it to draw precisely 
      // over the checkout day (allowing visual collision stacking) without spilling into an extra day.
      end.setDate(end.getDate() + 1);

      // Clamp visual boundaries to the strict month limits.
      // E.g. If it started in June, cap the start visual bounds tightly at July 1st.
      // This prevents the visual bar from bleeding across the out-of-range calendar gaps in Month Views.
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
    // Rely on react-big-calendar's own internal height definitions to prevent graphic slicing/clipping.
    let className = 'shadow-sm border-l-4 transition-all hover:brightness-95 cursor-pointer rounded-r-md text-[11.5px] font-medium !p-0.5 ';

    switch (event.status) {
      case BookingStatus.CONFIRMED:
        // Use standard blue-600 to match request
        className += 'bg-blue-600 border-blue-800 text-white';
        break;
      case BookingStatus.PENDING:
        className += 'bg-amber-400 border-amber-600 text-slate-900 font-bold';
        break;
      case BookingStatus.CANCELLED:
        className += 'bg-rose-500 border-rose-700 text-white opacity-60 decoration-slice line-through';
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
    <div className="h-[calc(100vh-80px)] lg:h-[calc(100vh-100px)] p-4 md:p-6 glass rounded-[32px] flex flex-col overflow-y-auto bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-white/5 relative shadow-soft">
      <div className="min-h-[1050px] shrink-0 w-full mb-4">
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
          views={['month', 'agenda']}
          popup
          className="font-sans h-full text-gray-700 dark:text-gray-200"
        />
      </div>

      {/* Enhanced Legend Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-center items-center gap-6 text-xs font-bold">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
          <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm"></div>
          {language === 'ar' ? 'مؤكد (Confirmed)' : 'Confirmed'}
        </div>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
          <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></div>
          {language === 'ar' ? 'غير مؤكد (Pending)' : 'Pending'}
        </div>
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full">
          <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div>
          {language === 'ar' ? 'ملغي (Cancelled)' : 'Cancelled'}
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
