
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Moon, Sun, Globe, Shield, User, Check, AlertCircle, Loader2, CreditCard, Clock, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';

export const Settings = () => {
  const { t, theme, toggleTheme, language, setLanguage, updatePassword, updateProfile, user, hasValidSubscription, daysRemaining, isAdmin, dateSettings, setDateSettings, formatDate } = useApp();
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Partner Email State
  const [partnerEmail, setPartnerEmail] = useState(user?.partner_email || '');
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Subscription Info
  const sub = user?.subscription;
  // Use new Date instead of parseISO
  const endDate = sub ? addDays(new Date(sub.start_date), sub.duration_days) : null;
  const isPaused = sub?.status === 'paused';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword.length < 6) {
        setPassMessage({ type: 'error', text: language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' });
        return;
    }

    if (newPassword !== confirmPassword) {
        setPassMessage({ type: 'error', text: language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match' });
        return;
    }

    setIsChangingPass(true);
    try {
        await updatePassword(newPassword);
        setPassMessage({ type: 'success', text: language === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
    } catch (error: any) {
        setPassMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
        setIsChangingPass(false);
    }
  };

  const handlePartnerEmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerMessage(null);
    setIsSavingPartner(true);
    try {
        await updateProfile({ partner_email: partnerEmail });
        setPartnerMessage({ type: 'success', text: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
        setTimeout(() => setPartnerMessage(null), 3000);
    } catch (error: any) {
        setPartnerMessage({ type: 'error', text: error.message || 'Failed to update partner email' });
    } finally {
        setIsSavingPartner(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('settings')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your preferences and account security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:shadow-glow transition-all duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <User size={140} />
            </div>
            <div className="relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-lg shadow-primary-500/30 ring-4 ring-white dark:ring-slate-800">
                    {user?.full_name?.charAt(0) || 'U'}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{user?.full_name || 'Admin User'}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-mono bg-white/60 dark:bg-slate-800/60 w-fit px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                    {user?.email}
                </p>
                <div className="mt-8 flex gap-2">
                    {isAdmin ? (
                        <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                            Admin Access
                        </span>
                    ) : (
                        <span className="px-4 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                            User Account
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* Subscription Status Card (Visible for Non-Admins) */}
        {!isAdmin && (
            <div className="glass p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <CreditCard size={140} />
                </div>
                
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-2xl ${hasValidSubscription ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {hasValidSubscription ? <Check size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">{t('subscriptionStatus')}</h3>
                            <p className={`text-sm font-bold ${hasValidSubscription ? 'text-green-600' : 'text-red-500'}`}>
                                {isPaused ? t('paused') : hasValidSubscription ? t('active') : t('expired')}
                            </p>
                        </div>
                    </div>

                    {sub ? (
                        <div className="space-y-4">
                            <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    <Clock size={16} />
                                    <span>{t('daysRemaining')}</span>
                                </div>
                                <div className="text-3xl font-black text-gray-800 dark:text-white">
                                    {daysRemaining} <span className="text-sm font-medium text-gray-400">{t('days')}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${daysRemaining < 5 ? 'bg-red-500' : 'bg-primary-500'}`} 
                                        style={{ width: `${Math.min((daysRemaining / sub.duration_days) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs font-bold uppercase">{t('startDate')}</span>
                                    <span className="font-bold dark:text-gray-200">{sub.start_date}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-gray-400 text-xs font-bold uppercase">Ends On</span>
                                    <span className="font-bold dark:text-gray-200">{endDate ? format(endDate, 'yyyy-MM-dd') : '-'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center py-6">
                            <p className="text-gray-500 mb-4">You do not have an active subscription plan.</p>
                            <span className="inline-block px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Contact Admin</span>
                         </div>
                    )}
                </div>
            </div>
        )}

        {/* Appearance Card */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-center space-y-8">
             {/* Theme Toggle */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400 rounded-2xl shadow-sm">
                        {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-lg">{t('theme')}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{theme === 'dark' ? t('darkMode') : t('lightMode')}</p>
                    </div>
                </div>
                
                <button 
                  onClick={toggleTheme}
                  dir="ltr"
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className="sr-only">Use setting</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
             </div>

             <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>

             {/* Language Toggle */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-lg">{t('language')}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Interface language</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white transform scale-105' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        EN
                    </button>
                    <button 
                        onClick={() => setLanguage('ar')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'ar' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white transform scale-105' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        AR
                    </button>
                </div>
             </div>
        </div>

        {/* Date & Time Settings */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-center space-y-8">
             <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-400 rounded-2xl shadow-sm">
                     <Calendar size={24} />
                 </div>
                 <div>
                     <h4 className="font-bold text-gray-800 dark:text-white text-lg">{language === 'ar' ? 'عرض التاريخ' : 'Date Display'}</h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(new Date())}</p>
                 </div>
             </div>

             {/* Date Language */}
             <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{language === 'ar' ? 'لغة التاريخ' : 'Date Language'}</span>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    {['match', 'en', 'ar'].map((opt) => (
                        <button 
                            key={opt}
                            onClick={() => setDateSettings({...dateSettings, language: opt as any})}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${dateSettings.language === opt ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            {opt === 'match' ? (language === 'ar' ? 'تلقائي' : 'Auto') : opt.toUpperCase()}
                        </button>
                    ))}
                </div>
             </div>

             {/* Month Format */}
             <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{language === 'ar' ? 'تنسيق الأشهر' : 'Month Format'}</span>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button 
                        onClick={() => setDateSettings({...dateSettings, format: 'names'})}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${dateSettings.format === 'names' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {language === 'ar' ? 'أسماء' : 'Names'}
                    </button>
                    <button 
                        onClick={() => setDateSettings({...dateSettings, format: 'numbers'})}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${dateSettings.format === 'numbers' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {language === 'ar' ? 'أرقام' : 'Numbers'}
                    </button>
                </div>
             </div>
        </div>

        {/* Partner Settings */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-center space-y-6">
            <div className="flex items-start gap-4 mb-2">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                    <User size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{language === 'ar' ? 'إيميل الشريك' : 'Partner Email'}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{language === 'ar' ? 'سيتم إرسال نسخة من إشعارات الحجوزات إلى هذا البريد' : 'Booking notifications will be CC\'d to this email'}</p>
                </div>
            </div>

            <form onSubmit={handlePartnerEmailSave} className="space-y-4 relative z-10 w-full">
                <div className="space-y-2">
                    <input 
                        type="email" 
                        className="w-full p-4 rounded-2xl border bg-white/60 dark:bg-slate-900/60 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all backdrop-blur-sm"
                        placeholder="partner@example.com"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                    />
                </div>

                {partnerMessage && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${partnerMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {partnerMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                        {partnerMessage.text}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isSavingPartner}
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    {isSavingPartner ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
            </form>
        </div>

        {/* Security / Change Password - Full Width */}
        <div className="md:col-span-2 glass p-8 rounded-3xl border border-white/50 dark:border-white/10 relative overflow-hidden">
             {/* Decorative Blur */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

             <div className="flex items-start gap-4 mb-8">
                 <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl border border-red-100 dark:border-red-800/30">
                     <Shield size={28} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-gray-800 dark:text-white">Security & Password</h3>
                     <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ensure your account uses a strong, unique password.</p>
                 </div>
             </div>

             <form onSubmit={handlePasswordChange} className="max-w-xl relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                     <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 ml-1">New Password</label>
                         <input 
                            type="password" 
                            className="w-full p-4 rounded-2xl border bg-white/60 dark:bg-slate-900/60 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all backdrop-blur-sm"
                            placeholder="Min. 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                         />
                     </div>
                     <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 ml-1">Confirm Password</label>
                         <input 
                            type="password" 
                            className="w-full p-4 rounded-2xl border bg-white/60 dark:bg-slate-900/60 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all backdrop-blur-sm"
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                         />
                     </div>
                 </div>

                 {passMessage && (
                     <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-left-2 ${passMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                         {passMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                         {passMessage.text}
                     </div>
                 )}

                 <button 
                    type="submit" 
                    disabled={isChangingPass || !newPassword}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5"
                 >
                    {isChangingPass ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Update Password
                 </button>
             </form>
        </div>

      </div>
    </div>
  );
};
