import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Subscription, User } from '../types';
import { addDays, format, differenceInDays, isValid } from 'date-fns';
import { Search, Calendar, Trash2, Edit2, Download, PauseCircle, PlayCircle, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { generateSubscriptionReceipt } from '../utils/pdfGenerator';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const AdminSubscriptions = () => {
    const { state, t, addSubscription, updateSubscription, deleteSubscription, language } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Delete Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        duration: 30,
        price: 0,
        status: 'active' as 'active' | 'paused' | 'expired'
    });

    const filteredUsers = state.allUsers.filter(u =>
        u.role !== 'admin' &&
        (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Open Modal for Renew/Edit
    const openEditModal = (user: User) => {
        setSelectedUser(user);
        const sub = user.subscription;
        if (sub) {
            setFormData({
                id: sub.id,
                startDate: sub.start_date,
                duration: sub.duration_days,
                price: sub.price,
                status: sub.status as any
            });
        } else {
            setFormData({
                id: generateId(),
                startDate: format(new Date(), 'yyyy-MM-dd'),
                duration: 30,
                price: 0,
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsLoading(true);

        try {
            const payload: Subscription = {
                id: formData.id,
                user_id: selectedUser.id,
                start_date: formData.startDate,
                duration_days: Number(formData.duration),
                price: Number(formData.price),
                status: formData.status
            };

            // Determine if update or add based on if user already had sub
            if (selectedUser.subscription) {
                await updateSubscription(payload);
            } else {
                await addSubscription(payload);
            }
            setIsModalOpen(false);
        } catch (err) {
            alert('Error saving subscription');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePause = async (user: User) => {
        if (!user.subscription) return;
        const newStatus = user.subscription.status === 'paused' ? 'active' : 'paused';
        await updateSubscription({ ...user.subscription, status: newStatus });
    };

    const handleDeleteClick = (subId: string) => {
        setDeleteId(subId);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteSubscription(deleteId);
            setDeleteId(null);
        } catch (error) {
            alert('Failed to delete subscription');
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate End Date for Modal display
    const getEndDate = () => {
        if (!formData.startDate) return '-';
        try {
            const start = new Date(formData.startDate);
            if (!isValid(start)) return '-';
            return format(addDays(start, Number(formData.duration)), 'yyyy-MM-dd');
        } catch { return '-'; }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('subscriptions')}</h2>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={language === 'ar' ? 'بحث عن مستخدم...' : "Search users..."}
                        className="w-full pl-10 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 ring-primary-500 outline-none transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredUsers.map(user => {
                    const sub = user.subscription;
                    let status = 'Not Subscribed';
                    let daysLeft = 0;
                    let progress = 0;
                    let endDateStr = '-';
                    let statusColor = 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300';

                    if (sub) {
                        const start = new Date(sub.start_date);
                        const end = addDays(start, sub.duration_days);
                        endDateStr = format(end, 'yyyy-MM-dd');
                        daysLeft = differenceInDays(end, new Date());
                        if (daysLeft < 0) daysLeft = 0;

                        const totalDays = sub.duration_days;
                        progress = totalDays > 0 ? (daysLeft / totalDays) * 100 : 0;

                        if (sub.status === 'paused') {
                            status = 'Paused';
                            statusColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
                        } else if (daysLeft > 0) {
                            status = 'Active';
                            statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
                        } else {
                            status = 'Expired';
                            statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
                        }
                    }

                    return (
                        <div key={user.id} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 relative border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[280px] group">

                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusColor}`}>
                                    {sub?.status === 'paused' ? <PauseCircle size={14} /> : daysLeft > 0 && sub ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    {language === 'ar' ? (status === 'Active' ? 'نشط' : status === 'Paused' ? 'موقوف' : status === 'Expired' ? 'منتهي' : 'غير مشترك') : status}
                                </span>
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                                    {user.full_name?.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            {/* User Info */}
                            <div className="text-right mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">{user.full_name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user.email}</p>
                            </div>

                            {/* Progress Section */}
                            <div className="mb-6 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2 font-bold">
                                    <span>{daysLeft} {t('daysRemaining')}</span>
                                    <span className="text-gray-400 dark:text-gray-500">{t('days')}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-3 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    <span>Start: {sub ? sub.start_date : '-'}</span>
                                    <span className="text-primary-600 dark:text-primary-400">{sub?.price || 0} EGP</span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-2 mt-auto">
                                {sub && (
                                    <>
                                        <button
                                            onClick={() => handleDeleteClick(sub.id)}
                                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => generateSubscriptionReceipt(user, sub, language, t)}
                                            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                                            title="Receipt"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={() => togglePause(user)}
                                            className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 flex items-center justify-center transition-colors"
                                            title={sub.status === 'paused' ? 'Resume' : 'Pause'}
                                        >
                                            {sub.status === 'paused' ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => openEditModal(user)}
                                    className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/20"
                                >
                                    <Edit2 size={16} />
                                    {t(sub ? 'update' : 'addSubscription')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{language === 'ar' ? 'حذف الاشتراك؟' : 'Delete Subscription?'}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                {language === 'ar'
                                    ? 'هل أنت متأكد من رغبتك في حذف هذا الاشتراك؟ لا يمكن التراجع عن هذا الإجراء.'
                                    : 'Are you sure you want to remove this subscription? This action cannot be undone.'}
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 p-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Renew Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[28px] p-8 border border-gray-100 dark:border-slate-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <h3 className="text-3xl font-black text-gray-800 dark:text-white text-right mb-1">{language === 'ar' ? 'تعديل الاشتراك' : 'Edit Subscription'}</h3>
                        <p className="text-gray-500 text-right mb-8 text-sm font-medium">for <span className="text-primary-600 dark:text-primary-400 font-bold">{selectedUser.full_name}</span></p>

                        <form onSubmit={handleSave} className="space-y-6">

                            <div className="space-y-2">
                                <label className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase block text-right tracking-wider">{t('startDate')}</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-bold outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 text-right pr-4"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase block text-right tracking-wider">{t('subscriptionPrice')}</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-bold outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 text-center"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase block text-right tracking-wider">{t('durationDays')}</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-bold outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 text-center"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex justify-between items-center text-blue-700 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-900/50">
                                <span>{getEndDate()}</span>
                                <span className="text-blue-400 dark:text-blue-500/70 text-sm uppercase tracking-widest">Ends On</span>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-4 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-primary-600/30"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : t('save')}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};