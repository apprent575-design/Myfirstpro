
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export const Auth = () => {
  const { login, signup, t, language } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, fullName);
        setSuccessMsg(language === 'ar'
          ? "تم إنشاء الحساب بنجاح! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب."
          : "Registration successful! Please check your email to confirm your account.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-slate-900 font-sans">

      {/* Animated Mesh Gradients Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] bg-pink-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="glass p-10 md:p-12 rounded-[3rem] w-full max-w-[460px] shadow-2xl border border-white/60 dark:border-white/10 z-10 backdrop-blur-2xl relative animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary-500 to-brand-accent rounded-[2rem] mx-auto mb-6 shadow-2xl shadow-primary-500/40 flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-500">
            <span className="text-4xl">🔑</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">Bookings</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
            {isLogin ? (language === 'ar' ? 'أهلاً بك، مدير الإيجارات' : 'Welcome back, Rental Manager') : (language === 'ar' ? 'انضم إلى النظام' : 'Join the System')}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 rounded-2xl flex items-start gap-3 text-sm border border-red-100 dark:border-red-800/50 animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 rounded-2xl flex items-start gap-3 text-sm border border-green-100 dark:border-green-800/50 animate-fade-in">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 ml-1 tracking-wider">{t('fullName')}</label>
              <input
                type="text"
                required={!isLogin}
                className="w-full p-4 rounded-2xl border-2 border-transparent bg-gray-50/80 dark:bg-slate-800/80 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 ml-1 tracking-wider">{t('email')}</label>
            <input
              type="email"
              required
              className="w-full p-4 rounded-2xl border-2 border-transparent bg-gray-50/80 dark:bg-slate-800/80 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 ml-1 tracking-wider">{t('password')}</label>
            <input
              type="password"
              required
              className="w-full p-4 rounded-2xl border-2 border-transparent bg-gray-50/80 dark:bg-slate-800/80 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 font-bold tracking-widest"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-3 mt-8"
          >
            {loading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <>
                {isLogin ? t('signIn') : t('signUp')}
                <ArrowRight size={22} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
            className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {isLogin ? t('noAccount') : t('haveAccount')} <span className="text-primary-600 dark:text-primary-400 underline decoration-2 underline-offset-4">{isLogin ? t('signUp') : t('signIn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
