
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FilterPopover } from './FilterPopover';
import { Booking, BookingStatus, PaymentStatus, FeeType } from '../types';
import { Plus, Edit2, Trash2, FileText, CheckCircle, Clock, XCircle, MessageCircle, Calendar, ThumbsUp, ThumbsDown, AlertTriangle, Loader2, Home, ChevronsRight, Phone } from 'lucide-react';
import { format, addDays, isWithinInterval, isValid } from 'date-fns';
import { generateReceipt } from '../utils/pdfGenerator';

const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const Bookings = () => {
  const { t, state, addBooking, updateBooking, deleteBooking, language, isRTL, formatDate } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI State
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterEnd, setFilterEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterUnit, setFilterUnit] = useState<string>('all'); // New Unit Filter

  // Form State
  const [formData, setFormData] = useState<Partial<Booking>>({
    tenant_name: '',
    phone: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    nights: 1,
    unit_id: state.units[0]?.id || '',
    nightly_rate: 0,
    village_fee: 0,
    housekeeping_enabled: false,
    housekeeping_price: 0,
    deposit_enabled: false,
    deposit_amount: 0,
    security_deposit_enabled: false,
    security_deposit: 0,
    paid_amount: 0,
    status: BookingStatus.PENDING,
    payment_status: PaymentStatus.UNPAID,
    fee_type: FeeType.EXCLUSIVE,
    notes: '',
    tenant_rating_good: true, // Default to 'Welcome Again'
  });

  // Helper for yyyy-MM-dd parsing to local midnight
  const parseDate = (str: string) => {
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(str);
  };

  const handleAllTime = () => {
    const dates: number[] = [];
    state.bookings.forEach(b => {
      if (b.start_date) dates.push(new Date(b.start_date).getTime());
      if (b.end_date) dates.push(new Date(b.end_date).getTime());
    });
    // Fallback if no bookings exist
    if (dates.length === 0) dates.push(new Date().getTime());
    else dates.push(new Date().getTime()); // ensure today is covered

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    setFilterStart(format(new Date(minDate), 'yyyy-MM-dd'));
    setFilterEnd(format(new Date(maxDate), 'yyyy-MM-dd'));
  };

  // Auto Calculations
  useEffect(() => {
    if (formData.start_date && formData.nights) {
      // Use parseDate helper to avoid timezone issues with yyyy-MM-dd
      const parsedDate = parseDate(formData.start_date);

      // Prevent invalid date operations
      if (!isValid(parsedDate)) return;

      const end = addDays(parsedDate, Number(formData.nights));

      // Calculate Grand Total (Tenant Pays)
      const base = Number(formData.nightly_rate || 0);
      const fee = Number(formData.village_fee || 0);
      const nights = Number(formData.nights || 0);
      const housekeeping = formData.housekeeping_enabled ? Number(formData.housekeeping_price || 0) : 0;

      let total = 0;
      if (formData.fee_type === FeeType.EXCLUSIVE) {
        total = ((base + fee) * nights) + housekeeping;
      } else {
        total = (base * nights) + housekeeping;
      }

      setFormData(prev => ({
        ...prev,
        end_date: isValid(end) ? format(end, 'yyyy-MM-dd') : prev.end_date,
        total_rental_price: total
      }));
    }
  }, [formData.start_date, formData.nights, formData.nightly_rate, formData.village_fee, formData.fee_type, formData.housekeeping_enabled, formData.housekeeping_price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous errors

    // Construct payload
    const bookingPayload = {
      ...formData,
      id: editingId || crypto.randomUUID(),
      // Preserve original creation date if editing, otherwise new date
      created_at: editingId
        ? (state.bookings.find(b => b.id === editingId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
    } as Booking;

    try {
      if (editingId) {
        await updateBooking(bookingPayload);
      } else {
        await addBooking(bookingPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to save booking:", error);
      // SET THE ERROR MESSAGE TO DISPLAY IN UI
      setFormError(error.message || "Failed to save booking. Please try again.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormError(null);
    setFormData({
      tenant_name: '',
      phone: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      nights: 1,
      unit_id: state.units[0]?.id || '',
      nightly_rate: 0,
      village_fee: 0,
      housekeeping_enabled: false,
      housekeeping_price: 0,
      deposit_enabled: false,
      deposit_amount: 0,
      security_deposit_enabled: false,
      security_deposit: 0,
      check_in_time: '11:00',
      check_out_time: '09:00',
      paid_amount: 0,
      status: BookingStatus.PENDING,
      payment_status: PaymentStatus.UNPAID,
      fee_type: FeeType.EXCLUSIVE,
      notes: '',
      tenant_rating_good: true,
      handler_enabled: false,
      handler_name: '',
      handler_phone: ''
    });
  };

  const handleEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setFormError(null);
    let startDate = format(new Date(), 'yyyy-MM-dd');
    let endDate = format(new Date(), 'yyyy-MM-dd');

    try {
      if (booking.start_date && isValid(new Date(booking.start_date))) {
        startDate = format(new Date(booking.start_date), 'yyyy-MM-dd');
      }
      if (booking.end_date && isValid(new Date(booking.end_date))) {
        endDate = format(new Date(booking.end_date), 'yyyy-MM-dd');
      }
    } catch (e) {
      console.error("Invalid date in booking", e);
    }

    setFormData({
      ...booking,
      start_date: startDate,
      end_date: endDate,
      check_in_time: booking.check_in_time || '11:00',
      check_out_time: booking.check_out_time || '09:00',
      handler_enabled: booking.handler_enabled || false,
      handler_name: booking.handler_name || '',
      handler_phone: booking.handler_phone || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (booking: Booking) => {
    setBookingToDelete(booking);
  };

  const confirmDelete = async () => {
    if (bookingToDelete) {
      setIsDeleting(true);
      try {
        await deleteBooking(bookingToDelete.id);
      } finally {
        setIsDeleting(false);
        setBookingToDelete(null);
      }
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED: return <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle size={14} /> {t('confirmed')}</span>;
      case BookingStatus.PENDING: return <span className="flex items-center gap-1 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full text-xs font-bold"><Clock size={14} /> {t('pending')}</span>;
      case BookingStatus.CANCELLED: return <span className="flex items-center gap-1 text-red-600 bg-red-100 px-3 py-1 rounded-full text-xs font-bold"><XCircle size={14} /> {t('cancelled')}</span>;
    }
  };

  // Filter Bookings
  const filteredBookings = state.bookings.filter(b => {
    // 1. Unit Filter
    if (filterUnit !== 'all' && b.unit_id !== filterUnit) return false;

    // 2. Date Filter
    if (!filterStart || !filterEnd) return true;
    const bookingDate = new Date(b.start_date);
    if (!isValid(bookingDate)) return false;
    const start = new Date(filterStart);
    const end = new Date(filterEnd);
    if (!isValid(start) || !isValid(end)) return true; // Ignore filter if dates invalid
    return isWithinInterval(bookingDate, { start, end });
  }).sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('bookings')}</h2>
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center w-full md:w-auto">
          {/* Unified Filters Popover */}
          <div className="h-full">
            <FilterPopover>
              {/* Unit Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">{t('unit')}</label>
                <select
                  className="bg-gray-50 dark:bg-slate-700 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 w-full"
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                >
                  <option value="all">{t('allUnits')}</option>
                  {state.units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'التاريخ' : 'Date Range'}</label>
                  <button
                    onClick={handleAllTime}
                    className="px-2 py-1 text-[10px] font-bold bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded transition-colors"
                  >
                    {t('allTime')}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Calendar size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="date"
                    className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full"
                    value={filterStart}
                    onChange={(e) => setFilterStart(e.target.value)}
                    title="Start Date"
                  />
                  <span className="text-gray-400 font-bold shrink-0">-</span>
                  <input
                    type="date"
                    className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full"
                    value={filterEnd}
                    onChange={(e) => setFilterEnd(e.target.value)}
                    title="End Date"
                  />
                </div>
              </div>
            </FilterPopover>
          </div>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/30 transition-all font-bold w-full md:w-auto justify-center"
          >
            <Plus size={20} />
            {t('addBooking')}
          </button>
        </div>
      </div>

      {/* Grid Cards View */}
      <div className="flex flex-col md:flex-row md:flex-wrap gap-6 text-right" dir="rtl">
        {filteredBookings.map((booking) => {
          const unit = state.units.find(u => u.id === booking.unit_id);
          const dailyTotal = booking.fee_type === FeeType.EXCLUSIVE ? ((booking.nightly_rate || 0) + (booking.village_fee || 0)) : (booking.nightly_rate || 0);

          return (
            <div key={booking.id} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full md:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] glass p-6 rounded-2xl relative border-l-[6px] border-primary-500 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800/80 text-left" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{booking.tenant_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{unit?.name}</span>
                    <span>•</span>
                    <span>{booking.nights} {t('nights')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(booking.status)}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${booking.payment_status === PaymentStatus.PAID ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {booking.payment_status === PaymentStatus.PAID ? t('paid') : t('unpaid')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm mb-6 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{t('dates')}</span>
                    <span className="font-medium dark:text-gray-200">
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{t('nightlyRate')}</span>
                    <span className="font-medium dark:text-gray-200">{booking.fee_type === FeeType.INCLUSIVE ? (booking.nightly_rate || 0) - (booking.village_fee || 0) : (booking.nightly_rate || 0)} {t('currency')}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{t('dailyTotal')} (+Fees)</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">{dailyTotal} {t('currency')}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{t('grandTotal')}</span>
                    <span className="font-bold text-primary-600 text-lg">{booking.total_rental_price} {t('currency')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-gray-400 text-[11px] mb-1">{isRTL ? 'صافي الربح' : 'Net Profit'}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{(booking.total_rental_price || 0) - (booking.housekeeping_enabled ? booking.housekeeping_price || 0 : 0) - (booking.fee_type === FeeType.TENANT_PAYS ? 0 : ((booking.nights || 0) * (booking.village_fee || 0)))} {t('currency')}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-[11px] mb-1">{isRTL ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {booking.payment_status === PaymentStatus.PAID
                        ? (booking.total_rental_price || 0)
                        : (booking.deposit_enabled ? (booking.deposit_amount || 0) : 0)} {t('currency')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-[11px] mb-1">{isRTL ? 'المتبقي' : 'Remaining'}</span>
                    <span className="font-bold text-red-500 dark:text-red-400">
                      {booking.payment_status === PaymentStatus.PAID
                        ? 0
                        : Math.max(0, (booking.total_rental_price || 0) - (booking.deposit_enabled ? (booking.deposit_amount || 0) : 0))} {t('currency')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Preview */}
              {booking.notes && (
                <div className="mb-4 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                  "{booking.notes.length > 50 ? booking.notes.substring(0, 50) + '...' : booking.notes}"
                </div>
              )}

              {/* CARD FOOTER - Wrapped to prevent overflow */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:+20${booking.phone}`}
                    className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                    title="Call"
                  >
                    <Phone size={18} />
                  </a>
                  <a
                    href={`https://wa.me/20${booking.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-bold bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                  {booking.tenant_rating_good !== undefined && (
                    <span className={`p-2 rounded-lg ${booking.tenant_rating_good ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`} title={booking.tenant_rating_good ? t('welcomeAgain') : t('notWelcome')}>
                      {booking.tenant_rating_good ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => generateReceipt(booking, unit?.name || '', language, t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Receipt"><FileText size={18} /></button>
                  <button onClick={() => handleEdit(booking)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit"><Edit2 size={18} /></button>
                  <button onClick={() => handleDeleteClick(booking)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl animate-in fade-in zoom-in duration-200 border border-red-100 dark:border-red-900/30">

            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full mb-6 ring-8 ring-red-50 dark:ring-red-900/10">
                {isDeleting ? <Loader2 size={36} className="animate-spin" /> : <AlertTriangle size={36} strokeWidth={2.5} />}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {language === 'ar' ? 'حذف الحجز؟' : 'Delete Booking?'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {language === 'ar' ? 'هل أنت متأكد من حذف الحجز الخاص بـ' : 'Are you sure you want to remove the booking for'} <br />
                <span className="font-bold text-gray-800 dark:text-gray-200">{bookingToDelete.tenant_name}</span>؟
                <br />{language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setBookingToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 p-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (
                    <>
                      <Trash2 size={18} />
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
            <h3 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">
              {editingId ? t('editBooking') : t('addBooking')}
            </h3>

            {/* ERROR DISPLAY BANNER */}
            {formError && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-200">Action Failed</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tenant Info */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('tenant')} Name</label>
                  <input
                    required
                    type="text"
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={formData.tenant_name}
                    onChange={e => setFormData({ ...formData, tenant_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Phone (WhatsApp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 z-10 text-gray-500 font-bold select-none pointer-events-none">+20</span>
                    <input
                      required
                      type="tel"
                      className="w-full p-4 pl-12 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      placeholder="1XXXXXXXXX"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                </div>
              </div>

              {/* Status & Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('status')}</label>
                  <select
                    className="w-full p-3 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                  >
                    {Object.values(BookingStatus).map(s => (
                      <option key={s} value={s}>{t(s.toLowerCase() as any)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('paymentStatus')}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_status: PaymentStatus.PAID })}
                      className={`flex-1 p-3 rounded-lg font-bold border-2 transition-all ${formData.payment_status === PaymentStatus.PAID ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-500'}`}
                    >
                      {t('paid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_status: PaymentStatus.UNPAID })}
                      className={`flex-1 p-3 rounded-lg font-bold border-2 transition-all ${formData.payment_status === PaymentStatus.UNPAID ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-500'}`}
                    >
                      {t('unpaid')}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Tenant Rating (Evaluation)</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tenant_rating_good: true })}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-bold border-2 transition-all ${formData.tenant_rating_good ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-400'}`}
                    >
                      <ThumbsUp size={18} /> {t('welcomeAgain')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tenant_rating_good: false })}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-bold border-2 transition-all ${!formData.tenant_rating_good ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-400'}`}
                    >
                      <ThumbsDown size={18} /> {t('notWelcome')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Select */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('unit')}</label>
                  <select
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.unit_id}
                    onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                  >
                    {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                {/* Nights */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('nights')}</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.nights}
                    onChange={e => setFormData({ ...formData, nights: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Check In Banner */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-700 dark:text-primary-300 flex justify-between items-center font-medium border border-primary-100 dark:border-primary-900/30">
                  <div>
                    <div className="text-xs opacity-80">Check In Date</div>
                    <input
                      type="date"
                      className="bg-transparent font-bold text-lg outline-none cursor-pointer w-full"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col relative w-32 border border-primary-200/50 dark:border-primary-900/50 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 shrink-0">
                    <span className="text-[10px] absolute top-1.5 left-2 font-bold text-gray-400">Time</span>
                    <input
                      type="time"
                      className="w-full h-full pt-5 pb-2 px-2 bg-transparent text-sm font-bold focus:ring-inset focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                      value={formData.check_in_time || '11:00'}
                      onChange={e => setFormData({ ...formData, check_in_time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Check Out Banner */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-300 flex justify-between items-center font-medium border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <div className="text-xs opacity-80">Check Out Date</div>
                    <div className="font-bold text-lg">{formData.end_date}</div>
                  </div>
                  <div className="flex flex-col relative w-32 border border-blue-200/50 dark:border-blue-900/50 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 shrink-0">
                    <span className="text-[10px] absolute top-1.5 left-2 font-bold text-gray-400">Time</span>
                    <input
                      type="time"
                      className="w-full h-full pt-5 pb-2 px-2 bg-transparent text-sm font-bold focus:ring-inset focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                      value={formData.check_out_time || '09:00'}
                      onChange={e => setFormData({ ...formData, check_out_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Fee Mode (Natively inject before Financials) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">نظام رسوم القرية (Village Fees Mode)</label>
                <div className="flex flex-col xl:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fee_type: FeeType.EXCLUSIVE })}
                    className={`flex-1 p-3 rounded-lg font-bold border-2 transition-all ${formData.fee_type === FeeType.EXCLUSIVE || !formData.fee_type ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-500 hover:bg-gray-50'}`}
                  >
                    غير شامل الرسوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fee_type: FeeType.INCLUSIVE })}
                    className={`flex-1 p-3 rounded-lg font-bold border-2 transition-all ${formData.fee_type === FeeType.INCLUSIVE ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-500 hover:bg-gray-50'}`}
                  >
                    شامل الرسوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fee_type: FeeType.TENANT_PAYS })}
                    className={`flex-1 p-3 rounded-lg font-bold border-2 transition-all ${formData.fee_type === FeeType.TENANT_PAYS ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-transparent bg-white dark:bg-slate-700 text-gray-500 hover:bg-gray-50'}`}
                  >
                    الرسوم على المستأجر
                  </button>
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('nightlyRate')}</label>
                  <input
                    type="number"
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.nightly_rate}
                    onChange={e => setFormData({ ...formData, nightly_rate: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('villageFee')} <span className="text-xs font-normal text-gray-500">(Optional)</span></label>
                  <input
                    type="number"
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.village_fee}
                    onChange={e => setFormData({ ...formData, village_fee: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                  <span className="font-bold dark:text-gray-300">{language === 'ar' ? 'خدمة التنظيف' : 'Housekeeping'}</span>
                  <input
                    type="checkbox"
                    className="w-6 h-6 rounded text-primary-500 focus:ring-primary-500"
                    checked={formData.housekeeping_enabled}
                    onChange={e => setFormData({ ...formData, housekeeping_enabled: e.target.checked })}
                  />
                </div>
                {formData.housekeeping_enabled && (
                  <input
                    type="number"
                    placeholder="Housekeeping Price"
                    className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2"
                    value={formData.housekeeping_price || ''}
                    onChange={e => setFormData({ ...formData, housekeeping_price: parseFloat(e.target.value) })}
                  />
                )}

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 mt-2">
                  <span className="font-bold dark:text-gray-300">{language === 'ar' ? 'مسؤول تسليم المفتاح (مستلم/مسلم)' : 'Key Handler'}</span>
                  <input
                    type="checkbox"
                    className="w-6 h-6 rounded text-primary-500 focus:ring-primary-500"
                    checked={formData.handler_enabled || false}
                    onChange={e => setFormData({ ...formData, handler_enabled: e.target.checked })}
                  />
                </div>
                {formData.handler_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'اسم المستلم / المسلم' : 'Handler Name'}
                      className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                      value={formData.handler_name || ''}
                      onChange={e => setFormData({ ...formData, handler_name: e.target.value })}
                    />
                    <input
                      type="tel"
                      placeholder={language === 'ar' ? 'رقم الموبايل' : 'Handler Phone'}
                      className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-left"
                      dir="ltr"
                      value={formData.handler_phone || ''}
                      onChange={e => setFormData({ ...formData, handler_phone: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">الديبوزت (Advance Deposit)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.deposit_amount || ''}
                      onChange={e => setFormData({
                        ...formData,
                        deposit_amount: parseFloat(e.target.value) || 0,
                        deposit_enabled: parseFloat(e.target.value) > 0
                      })}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">تأمين مسترد (Security Deposit)</label>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
                        checked={formData.security_deposit_enabled}
                        onChange={e => setFormData({ ...formData, security_deposit_enabled: e.target.checked })}
                      />
                    </div>
                    {formData.security_deposit_enabled && (
                      <input
                        type="number"
                        placeholder="Security Deposit Amount"
                        className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none animate-in fade-in"
                        value={formData.security_deposit || ''}
                        onChange={e => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-6 rounded-2xl bg-gray-900 text-white flex flex-col gap-4 shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-sm">{isRTL ? 'الإجمالي (يدفعه المستأجر)' : 'Grand Total (Tenant Pays)'}</span>
                    <span className="text-xs text-gray-500">{isRTL ? 'شامل رسوم القرية والتنظيف' : 'Includes Fees & Housekeeping'}</span>
                  </div>
                  <span className="text-3xl font-bold text-primary-400">
                    {formData.total_rental_price} {t('currency')}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-2 p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <span className="font-bold text-gray-300">{language === 'ar' ? 'ربح اليوم' : 'Daily Profit'}</span>
                  <span className="font-bold text-xl text-green-400">
                    {formData.fee_type === FeeType.INCLUSIVE ? (formData.nightly_rate || 0) - (formData.village_fee || 0) : (formData.nightly_rate || 0)} {t('currency')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 pt-4 border-t border-gray-700/50">
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{isRTL ? 'صافي الربح' : 'Net Profit'}</span>
                    <span className="font-medium text-green-400">{(formData.total_rental_price || 0) - (formData.housekeeping_enabled ? formData.housekeeping_price || 0 : 0) - (formData.fee_type === FeeType.TENANT_PAYS ? 0 : ((formData.nights || 0) * (formData.village_fee || 0)))} {t('currency')}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{isRTL ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                    <span className="font-medium text-blue-400">
                      {formData.payment_status === PaymentStatus.PAID
                        ? (formData.total_rental_price || 0)
                        : (formData.deposit_enabled ? (formData.deposit_amount || 0) : 0)} {t('currency')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs mb-1">{isRTL ? 'المتبقي' : 'Remaining'}</span>
                    <span className="font-bold text-orange-400">
                      {formData.payment_status === PaymentStatus.PAID
                        ? 0
                        : Math.max(0, (formData.total_rental_price || 0) - (formData.deposit_enabled ? (formData.deposit_amount || 0) : 0))} {t('currency')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Field */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('notes')}</label>
                <textarea
                  className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none"
                  placeholder="Any specific requests or details about the tenant..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormError(null); }}
                  className="flex-1 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 p-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/30 transition-all"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
