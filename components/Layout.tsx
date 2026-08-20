
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  DollarSign,
  PieChart,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  Sun,
  Moon,
  Users,
  CreditCard,
  FileText,
  HelpCircle
} from 'lucide-react';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { t, theme, toggleTheme, language, setLanguage, logout, isRTL, isAdmin, user } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reordered Navigation: Dashboard -> Units -> Bookings -> Calendar...
  const userNavItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/units', icon: Home, label: t('units') },
    { path: '/bookings', icon: BookOpen, label: t('bookings') },
    { path: '/calendar', icon: Calendar, label: t('calendar') },
    { path: '/expenses', icon: DollarSign, label: t('expenses') },
    { path: '/reports', icon: PieChart, label: t('reports') },
    { path: '/features', icon: HelpCircle, label: t('featuresGuide') },
    { path: '/settings', icon: Settings, label: t('settings') },
  ];

  const adminNavItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: t('adminDashboard') },
    { path: '/admin/accounts', icon: Users, label: t('accounts') },
    { path: '/admin/subscriptions', icon: CreditCard, label: t('subscriptions') },
    { path: '/admin/reports', icon: FileText, label: t('reports') },
    { path: '/admin/settings', icon: Settings, label: t('systemSettings') || 'System Settings' },
    { path: '/settings', icon: Settings, label: t('settings') },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-72 glass z-30 transition-transform duration-300 ease-in-out border-r border-white/40 dark:border-white/5
        ${isRTL ? 'right-0 border-l border-r-0' : 'left-0'}
        ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        md:translate-x-0
        flex flex-col shadow-2xl md:shadow-none
      `}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-blue-600 dark:text-white tracking-tight drop-shadow-sm">
              Bookings
            </h1>
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase ml-0.5">
              {isAdmin ? 'Super Admin' : 'Rental Manager'}
            </span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:text-gray-800 transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group
                  ${isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 translate-x-1'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-primary-600 dark:hover:text-primary-400'}
                `}
              >
                <item.icon
                  size={20}
                  className={`
                        ${isRTL ? 'ml-3' : 'mr-3'} 
                        transition-transform duration-300 
                        ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                    `}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`font-semibold tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full bg-white ml-auto ${isRTL ? 'mr-auto ml-0' : 'ml-auto'}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="p-4 rounded-3xl bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/5 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 bg-gray-100/50 dark:bg-slate-900/50 p-1 rounded-xl w-full">
                <button
                  onClick={toggleTheme}
                  className="flex-1 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 transition-all shadow-sm flex justify-center"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="w-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                <button
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="flex-1 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold text-xs transition-all shadow-sm"
                >
                  {language === 'en' ? 'AR' : 'EN'}
                </button>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl transition-all font-semibold text-sm group"
            >
              <LogOut size={18} className={`${isRTL ? 'ml-2' : 'mr-2'} group-hover:-translate-x-1 transition-transform`} />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden glass sticky top-0 z-10 p-4 flex items-center justify-between shadow-sm">
          <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <Menu size={24} />
          </button>
          <span className="font-extrabold text-blue-600 dark:text-white">Bookings</span>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
