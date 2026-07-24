
import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, DollarSign, TrendingUp, Users, Clock, CreditCard, Activity, AlertCircle, CheckCircle as CheckIcon, XCircle, PauseCircle, ChevronsRight } from 'lucide-react';
import { isValid, addDays, isAfter, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, gradient, trend, onClick }: any) => (
    <div onClick={onClick} className={`relative overflow-hidden rounded-3xl p-6 shadow-lg transition-all border border-white/20 ${gradient} ${onClick ? 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl' : 'hover:-translate-y-1 hover:shadow-xl'}`}>
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 rounded-full bg-black/5 blur-xl"></div>

        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-white/80 text-sm font-semibold tracking-wide uppercase mb-2">{title}</p>
                <h3 className="text-3xl font-extrabold text-white">{value}</h3>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner text-white">
                <Icon size={24} strokeWidth={2.5} />
            </div>
        </div>

        {/* Optional Trend Indicator */}
        {trend && (
            <div className="mt-4 flex items-center gap-1 text-white/90 text-sm font-medium bg-white/10 w-fit px-2 py-1 rounded-lg">
                <TrendingUp size={14} />
                <span>On track</span>
            </div>
        )}
    </div>
);

export const Dashboard = () => {
    const { t, state, user, isAdmin, isRTL, formatDate, formatHeaderDate, language } = useApp();
    const navigate = useNavigate();

    // Helper icon component for Admin dash
    const CheckCircle = ({ size, strokeWidth }: any) => <Activity size={size} strokeWidth={strokeWidth} />;

    // --- ADMIN LOGIC (Subscription Focused) ---
    if (isAdmin) {
        const allClients = state.allUsers.filter(u => u.role !== 'admin');

        const activeSubs = allClients.filter(u => {
            if (!u.subscription) return false;
            const end = addDays(new Date(u.subscription.start_date), u.subscription.duration_days);
            return isAfter(end, new Date()) && u.subscription.status !== 'paused';
        }).length;

        const expiredSubs = allClients.filter(u => {
            if (!u.subscription) return false;
            const end = addDays(new Date(u.subscription.start_date), u.subscription.duration_days);
            return !isAfter(end, new Date()) || u.subscription.status === 'paused';
        }).length;

        const totalRevenue = allClients.reduce((sum, u) => sum + (u.subscription?.price || 0), 0);

        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                            {t('adminDashboard')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                            Overview & Client Status
                        </p>
                    </div>
                    <div className="text-sm font-medium text-gray-400 bg-white/60 dark:bg-slate-800/60 px-5 py-2.5 rounded-2xl border border-white dark:border-gray-700 shadow-sm backdrop-blur-sm capitalize">
                        {formatHeaderDate(new Date())}
                    </div>
                </div>

                {/* Admin Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Clients"
                        value={allClients.length}
                        icon={Users}
                        gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                    />
                    <StatCard
                        title="Active Subscriptions"
                        value={activeSubs}
                        icon={CheckCircle}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        trend
                    />
                    <StatCard
                        title="Expired / Inactive"
                        value={expiredSubs + (allClients.length - activeSubs - expiredSubs)}
                        icon={AlertCircle}
                        gradient="bg-gradient-to-br from-orange-400 to-red-500"
                    />
                    <StatCard
                        title="Total Sub Revenue"
                        value={`${totalRevenue.toLocaleString()} EGP`}
                        icon={DollarSign}
                        gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
                    />
                </div>

                {/* Client Status List */}
                <div className="glass rounded-3xl overflow-hidden border border-white/50 dark:border-white/5 shadow-card">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/40 dark:bg-slate-800/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                <Users size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Client Status Summary</h3>
                        </div>
                        <button
                            onClick={() => navigate('/admin/subscriptions')}
                            className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors bg-primary-50 dark:bg-primary-900/10 px-4 py-2 rounded-xl"
                        >
                            Manage All
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="p-5">Client Name</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5">Subscription Info</th>
                                    <th className="p-5 text-right">Days Left</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {allClients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500 italic">No clients registered yet.</td>
                                    </tr>
                                )}
                                {allClients.map(client => {
                                    const sub = client.subscription;
                                    let status = 'No Sub';
                                    let statusColor = 'bg-gray-100 text-gray-500 border-gray-200';
                                    let daysLeft = 0;
                                    let expiryDate = '-';
                                    let StatusIcon = AlertCircle;

                                    if (sub) {
                                        const end = addDays(new Date(sub.start_date), sub.duration_days);
                                        expiryDate = formatDate(end);
                                        daysLeft = differenceInDays(end, new Date());

                                        if (sub.status === 'paused') {
                                            status = 'Paused';
                                            statusColor = 'bg-amber-50 text-amber-600 border-amber-200';
                                            StatusIcon = PauseCircle;
                                        } else if (daysLeft > 0) {
                                            status = 'Active';
                                            statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                            StatusIcon = CheckIcon;
                                        } else {
                                            status = 'Expired';
                                            statusColor = 'bg-red-50 text-red-600 border-red-200';
                                            StatusIcon = XCircle;
                                        }
                                    }

                                    return (
                                        <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-5">
                                                <div className="font-bold text-gray-800 dark:text-white">{client.full_name}</div>
                                                <div className="text-xs text-gray-500">{client.email}</div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                                    <StatusIcon size={14} />
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                {sub ? (
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-700 dark:text-gray-300">{sub.duration_days} Days Plan</div>
                                                        <div className="text-xs text-gray-400">Expires: {expiryDate}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">Not subscribed</span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right">
                                                {sub ? (
                                                    <span className={`font-mono font-bold text-lg ${daysLeft <= 5 ? 'text-red-500' : 'text-gray-700 dark:text-white'}`}>
                                                        {daysLeft > 0 ? daysLeft : 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- USER LOGIC (Rental Focused) ---

    const activeBookings = state.bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length;

    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);

    const netProfit = state.bookings
        .filter(b => b.status === 'Confirmed')
        .reduce((sum, b) => {
            const collectedRevenue = b.payment_status === 'Paid' ? (b.total_rental_price || 0) : (b.deposit_enabled ? (b.deposit_amount || 0) : 0);
            const hk = b.housekeeping_enabled ? (b.housekeeping_price || 0) : 0;
            const deductedFees = b.fee_type === 'TENANT_PAYS' ? 0 : ((b.village_fee || 0) * (b.nights || 0));
            return sum + (collectedRevenue - hk - deductedFees);
        }, 0) - totalExpenses;

    const rentals = state.bookings
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .slice(0, 10);

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                        {t('dashboard')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Welcome back, <span className="text-primary-600 dark:text-primary-400 font-bold">{user?.full_name}</span> 👋
                    </p>
                </div>
                <div className="text-sm font-medium text-gray-400 bg-white/60 dark:bg-slate-800/60 px-5 py-2.5 rounded-2xl border border-white dark:border-gray-700 shadow-sm backdrop-blur-sm capitalize">
                    {formatHeaderDate(new Date())}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={t('totalActiveBookings')}
                    value={activeBookings}
                    icon={Calendar}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    onClick={() => navigate('/bookings')}
                />
                <StatCard
                    title={t('netProfit')}
                    value={`${netProfit.toLocaleString()} ${t('currency')}`}
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
                    trend
                />
                <StatCard
                    title={t('totalExpenses')}
                    value={`${totalExpenses.toLocaleString()} ${t('currency')}`}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-rose-400 to-red-600"
                />
            </div>

            {/* Recent Activity Table */}
            <div className="glass rounded-3xl overflow-hidden shadow-card border border-white/50 dark:border-white/5 relative">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/40 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('rentalOverview')}</h3>
                    </div>

                    {/* Swipe hint for mobile */}
                    <div className="md:hidden flex items-center gap-1 text-[10px] text-gray-400 animate-pulse font-bold">
                        <span>{language === 'ar' ? 'اسحب للمزيد' : 'Swipe for more'}</span>
                        <ChevronsRight size={12} className={isRTL ? 'rotate-180' : ''} />
                    </div>

                    <button
                        onClick={() => navigate('/bookings')}
                        className="hidden md:block text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors bg-primary-50 dark:bg-primary-900/10 px-4 py-2 rounded-xl"
                    >
                        View All
                    </button>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                            <tr>
                                <th className="p-5 text-xs font-extrabold uppercase text-gray-400 tracking-wider">{t('unit')}</th>
                                <th className="p-5 text-xs font-extrabold uppercase text-gray-400 tracking-wider">{t('tenant')}</th>
                                <th className="p-5 text-xs font-extrabold uppercase text-gray-400 tracking-wider">{t('dates')}</th>
                                <th className="p-5 text-xs font-extrabold uppercase text-gray-400 tracking-wider text-center">{t('status')}</th>
                                <th className="p-5 text-xs font-extrabold uppercase text-gray-400 tracking-wider text-right">{t('grandTotal')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {rentals.length === 0 && (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">No recent activity found.</td></tr>
                            )}
                            {rentals.map((rental) => {
                                const unitName = state.units.find(u => u.id === rental.unit_id)?.name || 'Unknown Unit';
                                return (
                                    <tr key={rental.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group">
                                        <td className="p-5 font-bold text-gray-700 dark:text-gray-200 flex items-center gap-3">
                                            <div className="w-2 h-8 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-y-0 group-hover:scale-y-100"></div>
                                            {unitName}
                                        </td>
                                        <td className="p-5 font-medium text-gray-600 dark:text-gray-400">{rental.tenant_name}</td>
                                        <td className="p-5 text-sm text-gray-500">
                                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 w-fit px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 dir-ltr">
                                                <span>{formatDate(rental.start_date)}</span>
                                                <span className="text-gray-300 mx-1">{isRTL ? '←' : '→'}</span>
                                                <span>{formatDate(rental.end_date)}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${rental.payment_status === 'Paid'
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                                : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${rental.payment_status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                {t(rental.payment_status.toLowerCase() as any)}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-gray-800 dark:text-white text-lg">
                                            {rental.total_rental_price.toLocaleString()} <span className="text-xs text-gray-400 font-sans">{t('currency')}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
