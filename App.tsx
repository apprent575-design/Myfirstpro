
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Bookings } from './components/Bookings';
import { CalendarView } from './components/CalendarView';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { Units } from './components/Units';
import { Settings } from './components/Settings';
import { FeaturesGuide } from './components/FeaturesGuide';
import { Auth } from './components/Auth';
import { AdminAccounts } from './components/AdminAccounts';
import { AdminSubscriptions } from './components/AdminSubscriptions';
import { AdminReports } from './components/AdminReports';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, isAdmin, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary-500" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading Sunlight...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      {!user ? (
        <Auth />
      ) : (
        <Layout>
          <Routes>
            {/* Common Routes */}
            <Route path="/settings" element={<Settings />} />

            {/* Admin Routes */}
            {isAdmin ? (
               <>
                 <Route path="/admin/dashboard" element={<Dashboard />} /> {/* Reuse Dashboard for overview for now */}
                 <Route path="/admin/accounts" element={<AdminAccounts />} />
                 <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                 <Route path="/admin/reports" element={<AdminReports />} />
                 <Route path="*" element={<Navigate to="/admin/subscriptions" replace />} />
               </>
            ) : (
               /* User Routes */
               <>
                 <Route path="/" element={<Dashboard />} />
                 <Route path="/bookings" element={<Bookings />} />
                 <Route path="/calendar" element={<CalendarView />} />
                 <Route path="/expenses" element={<Expenses />} />
                 <Route path="/reports" element={<Reports />} />
                 <Route path="/units" element={<Units />} />
                 <Route path="/features" element={<FeaturesGuide />} />
                 <Route path="*" element={<Navigate to="/" replace />} />
               </>
            )}
          </Routes>
        </Layout>
      )}
    </HashRouter>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
