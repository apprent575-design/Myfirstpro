
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FilterPopover } from './FilterPopover';
import { Expense } from '../types';
import { Plus, Download, Calendar, Edit2, Trash2, Check, X, AlertTriangle, Loader2, ChevronsRight } from 'lucide-react';
import { format, isWithinInterval, isValid } from 'date-fns';
import { generateExpenseReport } from '../utils/pdfGenerator';

// Manual startOfMonth helpers
const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const endOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export const Expenses = () => {
  const { t, state, addExpense, updateExpense, deleteExpense, language, isRTL, formatDate } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete State
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters - Default to Current Month
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterBooking, setFilterBooking] = useState<string>('all');
  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterEnd, setFilterEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [mainBookingStart, setMainBookingStart] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [mainBookingEnd, setMainBookingEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addBookingStart, setAddBookingStart] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [addBookingEnd, setAddBookingEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [expenseItems, setExpenseItems] = useState([{ id: crypto.randomUUID(), title: '', category: 'Maintenance', amount: 0 }]);
  const [expenseMeta, setExpenseMeta] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    unit_id: state.units[0]?.id || '',
    booking_id: '' as string | undefined
  });

  const expenseCategories = [
    'Maintenance',
    'Electricity',
    'Water',
    'Internet',
    'Gas',
    'Cleaning Supplies',
    'Furniture',
    'Other'
  ];

  const filteredExpenses = state.expenses.filter(e => {
    const matchesUnit = filterUnit === 'all' || e.unit_id === filterUnit;
    const matchesBooking = filterBooking === 'all' || e.booking_id === filterBooking;
    let matchesDate = true;
    if (filterStart && filterEnd) {
      const d = new Date(e.date);
      const start = new Date(filterStart);
      const end = new Date(filterEnd);
      if (isValid(d) && isValid(start) && isValid(end)) {
        // Check inclusion (start <= date <= end)
        matchesDate = isWithinInterval(d, { start, end }) ||
          (d.getTime() === start.getTime()) ||
          (d.getTime() === end.getTime());
      }
    }
    return matchesUnit && matchesBooking && matchesDate;
  });

  const handleAllTime = () => {
    const dates: number[] = [];
    state.expenses.forEach(e => {
      if (e.date) dates.push(new Date(e.date).getTime());
    });
    // Fallback if no expenses exist
    if (dates.length === 0) dates.push(new Date().getTime());
    else dates.push(new Date().getTime()); // ensure today is included for "current" view

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    setFilterStart(format(new Date(minDate), 'yyyy-MM-dd'));
    setFilterEnd(format(new Date(maxDate), 'yyyy-MM-dd'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (editingId) {
        const item = expenseItems[0];
        await updateExpense({
          id: editingId,
          title: item.title,
          category: item.category,
          amount: item.amount,
          date: expenseMeta.date,
          unit_id: expenseMeta.unit_id,
          booking_id: expenseMeta.booking_id || undefined,
          created_at: state.expenses.find(ex => ex.id === editingId)?.created_at || new Date().toISOString()
        } as Expense);
      } else {
        const promises = expenseItems.map(item => addExpense({
          id: crypto.randomUUID(),
          title: item.title,
          category: item.category,
          amount: item.amount,
          date: expenseMeta.date,
          unit_id: expenseMeta.unit_id,
          booking_id: expenseMeta.booking_id || undefined,
          created_at: new Date().toISOString()
        } as Expense));
        await Promise.all(promises);
      }
      closeForm();
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to save expense. Please check your subscription.');
    }
  };

  const handleEdit = (expense: Expense) => {
    setErrorMsg(null);
    setEditingId(expense.id);
    setExpenseMeta({
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      unit_id: expense.unit_id,
      booking_id: expense.booking_id || ''
    });
    setExpenseItems([{
      id: crypto.randomUUID(),
      title: expense.title,
      amount: expense.amount,
      category: expense.category
    }]);
    setAddBookingStart(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
    setAddBookingEnd(format(new Date(), 'yyyy-MM-dd'));
    setShowAdd(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      setIsDeleting(true);
      try {
        await deleteExpense(expenseToDelete.id);
      } finally {
        setIsDeleting(false);
        setExpenseToDelete(null);
      }
    }
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setErrorMsg(null);
    setExpenseMeta({
      date: format(new Date(), 'yyyy-MM-dd'),
      unit_id: state.units[0]?.id || '',
      booking_id: ''
    });
    setExpenseItems([{ id: crypto.randomUUID(), title: '', category: 'Maintenance', amount: 0 }]);
  };

  // Shared Input Style
  const inputStyle = "w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:bg-slate-800 dark:border-gray-600 dark:text-white";

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('expenses')}</h2>

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

              {/* Booking Options */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'البحث عن حجز' : 'Find Booking'}</label>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Calendar size={16} className="text-gray-400 shrink-0" />
                    <input type="date" className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full" value={mainBookingStart} onChange={e => setMainBookingStart(e.target.value)} title={language === 'ar' ? 'من تاريخ الحجز' : 'Booking from'} />
                    <span className="text-gray-400 font-bold shrink-0">-</span>
                    <input type="date" className="bg-transparent outline-none text-[11px] font-bold text-gray-700 dark:text-gray-200 w-full" value={mainBookingEnd} onChange={e => setMainBookingEnd(e.target.value)} title={language === 'ar' ? 'إلى تاريخ الحجز' : 'Booking to'} />
                  </div>
                  <select
                    className="bg-gray-50 dark:bg-slate-700 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 w-full"
                    value={filterBooking}
                    onChange={(e) => setFilterBooking(e.target.value)}
                  >
                    <option value="all">{language === 'ar' ? 'كل الحجوزات' : 'All Bookings'}</option>
                    {state.bookings.filter(b => {
                      const d = new Date(b.start_date);
                      const s = new Date(mainBookingStart);
                      const e = new Date(mainBookingEnd);
                      if (isValid(d) && isValid(s) && isValid(e)) {
                        return (filterUnit === 'all' || b.unit_id === filterUnit) &&
                          (isWithinInterval(d, { start: s, end: e }) || d.getTime() === s.getTime() || d.getTime() === e.getTime());
                      }
                      return filterUnit === 'all' || b.unit_id === filterUnit;
                    }).map(b => (
                      <option key={b.id} value={b.id}>{b.tenant_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Filters */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'تاريخ المصروف' : 'Expense Date'}</label>
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

          <div className="flex gap-2">
            <button
              onClick={() => generateExpenseReport(state.expenses, state.units, state.bookings, language, t, filterStart, filterEnd, filterUnit, filterBooking)}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={18} />
              PDF
            </button>

            <button
              onClick={() => { closeForm(); setShowAdd(true); }}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
            >
              <Plus size={18} />
              {t('addExpense')}
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 border-2 border-primary-100 dark:border-primary-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg dark:text-white">{editingId ? 'Edit Expense' : t('addExpense')}</h3>
            <button type="button" onClick={closeForm} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><X size={18} /></button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 text-sm rounded-xl border border-red-100 dark:border-red-800/50 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('unit')}</label>
              <select className={inputStyle} value={expenseMeta.unit_id} onChange={e => setExpenseMeta({ ...expenseMeta, unit_id: e.target.value })}>
                {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'البحث عن حجوزات بالتواريخ' : 'Search Bookings (Dates)'}</label>
              <div className="flex items-center gap-2">
                <input type="date" className={`${inputStyle} px-2 py-2 flex-1 text-sm`} value={addBookingStart} onChange={e => setAddBookingStart(e.target.value)} />
                <span className="text-gray-400 font-bold">-</span>
                <input type="date" className={`${inputStyle} px-2 py-2 flex-1 text-sm`} value={addBookingEnd} onChange={e => setAddBookingEnd(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">{language === 'ar' ? 'الحجز التابع له' : 'Related Booking'}</label>
              <select
                className={inputStyle}
                value={expenseMeta.booking_id || ''}
                onChange={e => setExpenseMeta({ ...expenseMeta, booking_id: e.target.value === '' ? undefined : e.target.value })}
              >
                <option value="">-- {language === 'ar' ? 'بدون حجز مستأجر' : 'Without Booking'} --</option>
                {state.bookings.filter(b => {
                  const d = new Date(b.start_date);
                  const s = new Date(addBookingStart);
                  const e = new Date(addBookingEnd);
                  if (isValid(d) && isValid(s) && isValid(e)) {
                    return (b.unit_id === expenseMeta.unit_id) &&
                      (isWithinInterval(d, { start: s, end: e }) || d.getTime() === s.getTime() || d.getTime() === e.getTime());
                  }
                  return b.unit_id === expenseMeta.unit_id;
                }).map(b => (
                  <option key={b.id} value={b.id}>{b.tenant_name} ({format(new Date(b.start_date), 'dd/MM')})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('date')}</label>
              <input required type="date" className={inputStyle} value={expenseMeta.date} onChange={e => setExpenseMeta({ ...expenseMeta, date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            {expenseItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm relative">
                <div className="space-y-1 md:col-span-5">
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('title')}</label>
                  <input required type="text" className={`${inputStyle} border-gray-200`} value={item.title} onChange={e => {
                    const newItems = [...expenseItems];
                    newItems[index].title = e.target.value;
                    setExpenseItems(newItems);
                  }} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('category')}</label>
                  <select required className={`${inputStyle} border-gray-200`} value={item.category} onChange={e => {
                    const newItems = [...expenseItems];
                    newItems[index].category = e.target.value;
                    setExpenseItems(newItems);
                  }}>
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{t(cat.toLowerCase().replace(' ', '_') as any)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('amount')} ({t('currency')})</label>
                  <input required type="number" min="0" step="any" className={`${inputStyle} border-gray-200 font-bold`} value={item.amount || ''} onChange={e => {
                    const newItems = [...expenseItems];
                    newItems[index].amount = parseFloat(e.target.value) || 0;
                    setExpenseItems(newItems);
                  }} />
                </div>

                {!editingId && expenseItems.length > 1 && (
                  <div className="md:col-span-1 text-right flex justify-start md:justify-end">
                    <button type="button" onClick={() => setExpenseItems(expenseItems.filter((_, i) => i !== index))} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!editingId && (
            <button type="button" onClick={() => setExpenseItems([...expenseItems, { id: crypto.randomUUID(), title: '', category: 'Maintenance', amount: 0 }])} className="mt-4 flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all font-bold">
              <Plus size={20} className="mr-2" />
              {language === 'ar' ? 'إضافة مصروف آخر لنفس البيانات أعلاه' : 'Add another expense item'}
            </button>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="px-4 py-2 text-gray-500 font-bold">{t('cancel')}</button>
            <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg font-bold flex items-center gap-2">
              <Check size={18} />
              {t('save')}
            </button>
          </div>
        </form>
      )}

      {/* Added overflow-x-auto for mobile horizontal scrolling */}
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left dark:text-gray-300 whitespace-nowrap md:whitespace-normal">
          <thead className="bg-gray-100/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-4">{t('date')}</th>
              <th className="p-4">{t('unit')}</th>
              <th className="p-4">{language === 'ar' ? 'الحجز' : 'Booking'}</th>
              <th className="p-4">{t('title')}</th>
              <th className="p-4">{t('category')}</th>
              <th className="p-4 text-right">{t('amount')}</th>
              <th className="p-4 text-center w-24">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.map(expense => {
              const d = new Date(expense.date);
              return (
                <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 group">
                  <td className="p-4">{isValid(d) ? formatDate(d) : 'Invalid Date'}</td>
                  <td className="p-4">{state.units.find(u => u.id === expense.unit_id)?.name}</td>
                  <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                    {state.bookings.find(b => b.id === expense.booking_id)?.tenant_name || '-'}
                  </td>
                  <td className="p-4 font-medium">{expense.title}</td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">
                      {t(expense.category.toLowerCase().replace(' ', '_') as any) || expense.category}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-red-500">-{expense.amount} {t('currency')}</td>
                  {/* Removed opacity classes to make buttons always visible */}
                  <td className="p-4 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(expense)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr className="bg-gray-50 dark:bg-slate-800 font-bold">
              <td colSpan={5} className="p-4 text-right">{t('total')}</td>
              <td className="p-4 text-right text-red-600">
                -{filteredExpenses.reduce((sum, e) => sum + e.amount, 0)} {t('currency')}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 border border-red-100 dark:border-red-900/30">

            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full mb-6 ring-8 ring-red-50 dark:ring-red-900/10">
                {isDeleting ? <Loader2 size={36} className="animate-spin" /> : <AlertTriangle size={36} strokeWidth={2.5} />}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {language === 'ar' ? 'حذف المصروف؟' : 'Delete Expense?'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {language === 'ar' ? 'هل أنت متأكد من حذف' : 'Are you sure you want to remove'} <br />
                <span className="font-bold text-gray-800 dark:text-gray-200">{expenseToDelete.title}</span>؟
                <br />{language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
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
    </div>
  );
};
