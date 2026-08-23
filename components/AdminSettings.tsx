import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Clock, Mail, Key } from 'lucide-react';

export const AdminSettings = () => {
  const { state, updateSystemSettings, t, isRTL } = useApp();
  const { systemSettings } = state;
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    daily_email_time: '09:00',
    backup_frequency: 'weekly',
    backup_email: '',
    backup_time: '00:00',
    backup_start_date: ''
  });

  useEffect(() => {
    if (systemSettings) {
      setFormData({
        daily_email_time: systemSettings.daily_email_time || '09:00',
        backup_frequency: systemSettings.backup_frequency || 'weekly',
        backup_email: systemSettings.backup_email || '',
        backup_time: systemSettings.backup_time || '00:00',
        backup_start_date: systemSettings.backup_start_date || ''
      });
    }
  }, [systemSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await updateSystemSettings(formData);
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Error saving settings", err);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            System Settings
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure automated emails and system preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <form onSubmit={handleSubmit} className="glass p-6 rounded-3xl space-y-6">
          
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-primary-500" />
              Automated Daily Emails
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Set the time you want the system to check and send emails to clients whose bookings start or end today.
              (Note: The emails are sent automatically by the server in the background, you do not need to keep the dashboard open).
            </p>
            
            <div className="max-w-xs">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Daily Email Time (24h format)
              </label>
              <input
                type="time"
                required
                value={formData.daily_email_time}
                onChange={e => setFormData({ ...formData, daily_email_time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Save size={20} className="text-primary-500" />
              Database Backup Settings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Configure automatic database backups. Backups contain all data and will be sent to the specified email address.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={formData.backup_frequency}
                  onChange={e => setFormData({ ...formData, backup_frequency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-gray-700 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Backup Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={formData.backup_email}
                  onChange={e => setFormData({ ...formData, backup_email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Backup Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.backup_start_date}
                  onChange={e => setFormData({ ...formData, backup_start_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Backup Time (24h format)
                </label>
                <input
                  type="time"
                  required
                  value={formData.backup_time}
                  onChange={e => setFormData({ ...formData, backup_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {successMsg && <span className="text-green-500 font-medium animate-pulse">{successMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
};
