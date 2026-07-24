
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UnitType, Unit } from '../types';
import { Plus, Home, Edit2, Trash2, Check, AlertTriangle, Loader2 } from 'lucide-react';

export const Units = () => {
  const { t, state, addUnit, updateUnit, deleteUnit, language } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<UnitType>(UnitType.CHALET);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setErrorMsg(null);

    try {
      if (editingId) {
        const existing = state.units.find(u => u.id === editingId);
        if (existing) {
          await updateUnit({ ...existing, name, type });
          setEditingId(null);
        }
      } else {
        await addUnit({
          id: crypto.randomUUID(),
          name,
          type,
          created_at: new Date().toISOString()
        });
      }
      setName('');
    } catch (error: any) {
      setErrorMsg(error.message || "Error saving unit");
    }
  };

  const startEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setName(unit.name);
    setType(unit.type);
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setType(UnitType.CHALET);
    setErrorMsg(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, unit: Unit) => {
    e.preventDefault();
    e.stopPropagation();
    setUnitToDelete(unit);
  };

  const confirmDelete = async () => {
    if (unitToDelete) {
      setIsDeleting(true);
      try {
        await deleteUnit(unitToDelete.id);
      } finally {
        setIsDeleting(false);
        setUnitToDelete(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-800 dark:text-white text-right">{t('units')}</h2>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Units List (Left Side - Grow) */}
        <div className="flex-1 order-2 lg:order-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.units.length === 0 && (
              <div className="col-span-2 text-center p-12 text-gray-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                No units found.
              </div>
            )}
            {state.units.map(unit => (
              <div key={unit.id} className="bg-white dark:bg-slate-800 p-6 rounded-[20px] shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 transition-all">

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleDeleteClick(e, unit)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => startEdit(unit)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                    <Edit2 size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">{unit.name}</h4>
                    <p className="text-sm text-gray-400 font-medium">{t(unit.type.toLowerCase() as any)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center">
                    <Home size={22} strokeWidth={2.5} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Add Form (Right Side - Fixed Width) */}
        <div className="w-full lg:w-[350px] order-1 lg:order-2 h-fit">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white text-right">
              {editingId ? t('editUnit') : t('addUnit')}
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 text-sm rounded-xl border border-red-100 dark:border-red-800/50 flex items-start gap-2 justify-end text-right">
                <span>{errorMsg}</span>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 text-right">{t('unitName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                  placeholder="e.g. Sunset Villa 101"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 text-right">{t('unitType')}</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as UnitType)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                >
                  {Object.values(UnitType).map(typeVal => (
                    <option key={typeVal} value={typeVal}>{t(typeVal.toLowerCase() as any)}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {editingId ? <Check size={20} /> : <Plus size={20} />}
                  {editingId ? t('save') : t('addUnit')}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="w-full mt-2 text-gray-400 text-sm font-bold hover:text-gray-600">Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {unitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800">
            <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              {language === 'ar' ? 'حذف الوحدة؟' : 'Delete Unit?'}
            </h3>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              {language === 'ar' ? `سيتم حذف ${unitToDelete.name} نهائياً.` : `This will permanently remove ${unitToDelete.name}.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUnitToDelete(null)} disabled={isDeleting} className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300">{t('cancel')}</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 p-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600">
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
