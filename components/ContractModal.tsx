import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking, ContractDurationMode, ContractInventoryItem, ContractParty, PartyGender, PartyTitle, RentalContract, Unit } from '../types';
import {
  buildContractDefaults,
  contractDurationLabel,
  contractEndDate,
  contractsForTenant,
  createParty,
  newId,
  titleForGender,
  titlesForGender,
} from '../utils/contractStore';
import { createInventoryItem, createInventorySection } from '../utils/contractInventory';
import { generateContractPdf } from '../utils/contractGenerator';
import { NumberInput } from './NumberInput';
import {
  FileSignature,
  Download,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
  FileDown,
  Loader2,
  AlertTriangle,
  Users,
  ClipboardList,
} from 'lucide-react';

interface ContractModalProps {
  booking: Booking;
  unit?: Unit;
  onClose: () => void;
}

const inputClass =
  'w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500/40';

const labelClass = 'block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1';

const SectionTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-2 mt-6 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
    {icon}
    <h4 className="text-sm font-black text-gray-800 dark:text-white">{children}</h4>
  </div>
);

export const ContractModal = ({ booking, unit, onClose }: ContractModalProps) => {
  const { language, isRTL, user, t, state, isAdmin, addContract, updateContract, deleteContract } = useApp();
  const isAr = language === 'ar';

  // كل عقود نفس المستأجر — من قاعدة البيانات (public.contracts) + النسخة المحلية
  const tenantContracts = useMemo(
    () =>
      contractsForTenant(
        (state.contracts || []).filter(c => isAdmin || !c.user_id || c.user_id === user?.id),
        { id: booking.id, name: booking.tenant_name, phone: booking.phone }
      ),
    [state.contracts, booking.id, booking.tenant_name, booking.phone, isAdmin, user?.id]
  );

  const [mode, setMode] = useState<'list' | 'form'>('form');
  const [draft, setDraft] = useState<RentalContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'export' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // عند فتح الكارت: لو المستأجر ده ليه عقود محفوظة تظهر القايمة، وإلا يفتح فورم عقد جديد
  useEffect(() => {
    setMode(tenantContracts.length > 0 ? 'list' : 'form');
    setDraft(tenantContracts.length > 0 ? null : buildContractDefaults(booking, unit, user, tenantContracts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, user?.id]);

  const startNewContract = () => {
    setDraft(buildContractDefaults(booking, unit, user, tenantContracts));
    setError(null);
    setNotice(null);
    setMode('form');
  };

  const patch = (updates: Partial<RentalContract>) =>
    setDraft(prev => (prev ? { ...prev, ...updates } : prev));

  const patchLandlord = (updates: Partial<RentalContract['landlord']>) =>
    setDraft(prev => (prev ? { ...prev, landlord: { ...prev.landlord, ...updates } } : prev));

  const patchParty = (id: string, updates: Partial<ContractParty>) =>
    setDraft(prev =>
      prev ? { ...prev, parties: prev.parties.map(p => (p.id === id ? { ...p, ...updates } : p)) } : prev
    );

  const setPartyGender = (id: string, gender: PartyGender) =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            parties: prev.parties.map(p =>
              p.id === id ? { ...p, gender, title: titleForGender(gender, p.title) } : p
            ),
          }
        : prev
    );

  const addParty = () =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            parties: [
              ...prev.parties,
              createParty({
                gender: 'male',
                title: 'السيد',
                name: '',
                national_id: '',
                phone: '',
              }),
            ],
          }
        : prev
    );

  const removeParty = (id: string) =>
    setDraft(prev =>
      prev && prev.parties.length > 1
        ? { ...prev, parties: prev.parties.filter(p => p.id !== id) }
        : prev
    );

  // ---------- قائمة المنقولات (ملحق العقد) ----------
  const patchSection = (sectionId: string, updates: Partial<RentalContract['inventory'][number]>) =>
    setDraft(prev =>
      prev
        ? { ...prev, inventory: prev.inventory.map(s => (s.id === sectionId ? { ...s, ...updates } : s)) }
        : prev
    );

  const addSection = () =>
    setDraft(prev =>
      prev
        ? { ...prev, inventory: [...prev.inventory, createInventorySection({ title: 'بند جديد' }, [createInventoryItem()])] }
        : prev
    );

  const removeSection = (sectionId: string) =>
    setDraft(prev => (prev ? { ...prev, inventory: prev.inventory.filter(s => s.id !== sectionId) } : prev));

  const patchItem = (sectionId: string, itemId: string, updates: Partial<ContractInventoryItem>) =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            inventory: prev.inventory.map(s =>
              s.id === sectionId ? { ...s, items: s.items.map(i => (i.id === itemId ? { ...i, ...updates } : i)) } : s
            ),
          }
        : prev
    );

  const addItem = (sectionId: string) =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            inventory: prev.inventory.map(s =>
              s.id === sectionId ? { ...s, items: [...s.items, createInventoryItem()] } : s
            ),
          }
        : prev
    );

  const removeItem = (sectionId: string, itemId: string) =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            inventory: prev.inventory.map(s =>
              s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
            ),
          }
        : prev
    );

  // نهاية المدة بتتحسب أوتوماتيك: تاريخ البداية + المدة المختارة (أيام / شهور / سنوات)
  const computedEndDate = useMemo(
    () => (draft ? contractEndDate(draft.start_date, draft.duration_mode, draft.duration_value) : ''),
    [draft?.start_date, draft?.duration_mode, draft?.duration_value]
  );

  const durationLabel = useMemo(() => (draft ? contractDurationLabel(draft) : ''), [
    draft?.start_date,
    draft?.duration_mode,
    draft?.duration_value,
  ]);

  const validate = (c: RentalContract): string | null => {
    if (!c.parties.length) return isAr ? 'لازم طرف مستأجر واحد على الأقل.' : 'At least one tenant is required.';
    if (c.parties.some(p => !p.name.trim())) return isAr ? 'اكتب اسم كل طرف من المستأجرين.' : 'Enter every tenant name.';
    if (c.parties.some(p => p.national_id && !/^\d{14}$/.test(p.national_id)))
      return isAr ? 'الرقم القومي لازم يكون 14 رقمًا.' : 'National ID must be 14 digits.';
    if (!c.start_date) return isAr ? 'حدد تاريخ بداية الإيجار.' : 'Set the rental start date.';
    if (!c.duration_value || c.duration_value < 1)
      return isAr ? 'اكتب مدة الإيجار (عدد أيام أو شهور أو سنوات).' : 'Enter the rental duration (days / months / years).';
    if (!computedEndDate) return isAr ? 'المدة غير صحيحة، راجع تاريخ البداية والعدد.' : 'Invalid duration, check the start date and the number.';
    if (c.rent_amount < 0 || c.deposit_amount < 0) return isAr ? 'المبالغ لازم تكون أرقامًا موجبة.' : 'Amounts must be positive numbers.';
    return null;
  };

  const handleSave = async (exportAfter: boolean) => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(exportAfter ? 'export' : 'save');

    const toSave: RentalContract = { ...draft, end_date: computedEndDate };
    const alreadySaved = tenantContracts.some(c => c.id === toSave.id);

    try {
      if (alreadySaved) await updateContract(toSave);
      else await addContract(toSave);
    } catch (e) {
      console.error('Contract sync failed:', e);
      // العقد اتحفظ على الجهاز — بس السحابة محتاجة الجدول يتعمل مرة واحدة
      setNotice(
        isAr
          ? 'اتحفظ العقد على الجهاز ✅ لكن المزامنة مع قاعدة البيانات فشلت. شغّل ملف contracts_table.sql في Supabase مرة واحدة وبعدها هيظهر من أي جهاز.'
          : 'Saved on this device ✅ but the database sync failed. Run contracts_table.sql in Supabase once, then it appears on every device.'
      );
    }

    setDraft(toSave);
    if (exportAfter) await generateContractPdf(toSave);
    setBusy(null);
    setMode('list');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContract(id);
    } catch (e) {
      console.error('Contract delete failed:', e);
    }
    setConfirmDeleteId(null);

    const remaining = tenantContracts.filter(c => c.id !== id);
    if (remaining.length === 0) {
      setDraft(buildContractDefaults(booking, unit, user, remaining));
      setError(null);
      setNotice(null);
      setMode('form');
    }
  };

  const handleEditSaved = (contract: RentalContract) => {
    setDraft({ ...contract, parties: contract.parties.map(p => ({ ...p, id: p.id || newId() })) });
    setError(null);
    setNotice(null);
    setMode('form');
  };

  const partyTitles = (gender: PartyGender): PartyTitle[] => titlesForGender(gender);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center">
              <FileSignature size={20} />
            </span>
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white">
                {isAr ? 'عقد إيجار' : 'Rental Contract'}
              </h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {booking.tenant_name} — {unit?.name || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {notice && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {mode === 'list' && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                  {isAr
                    ? `عقود هذا المستأجر المحفوظة (${tenantContracts.length})`
                    : `Saved contracts for this tenant (${tenantContracts.length})`}
                </p>
                <button
                  onClick={startNewContract}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary-600/30 transition-all active:scale-95"
                >
                  <Plus size={18} />
                  {isAr ? 'عقد إيجار جديد' : 'New contract'}
                </button>
              </div>

              {tenantContracts.map(contract => (
                <div
                  key={contract.id}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-slate-800/70 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-gray-900 dark:text-white">
                          {isAr ? 'عقد رقم' : 'Contract'} {contract.number}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {contract.contract_date}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
                        <Users size={13} />
                        {contract.parties.map(p => `${p.title}/ ${p.name}`).join(' ، ')}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {contractDurationLabel(contract)} • {contract.start_date} ← {contract.end_date} •{' '}
                        {isAr
                          ? `إيجار ${contract.rent_amount.toLocaleString()} — تأمين ${contract.deposit_amount.toLocaleString()}`
                          : `Rent ${contract.rent_amount.toLocaleString()} — Deposit ${contract.deposit_amount.toLocaleString()}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateContractPdf(contract)}
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        title={isAr ? 'تحميل PDF' : 'Download PDF'}
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleEditSaved(contract)}
                        className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        title={isAr ? 'تعديل العقد' : 'Edit contract'}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(contract.id)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={isAr ? 'حذف العقد' : 'Delete contract'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId === contract.id && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangle size={15} />
                        {isAr ? 'تأكيد حذف هذا العقد؟' : 'Delete this contract?'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white"
                        >
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {mode === 'form' && draft && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {isAr
                    ? 'البيانات مسحوبة تلقائيًا من كارت المستأجر — عدّل أي حاجة قبل الحفظ.'
                    : 'Fields are pre-filled from the tenant card — adjust anything before saving.'}
                </p>
                {tenantContracts.length > 0 && (
                  <button
                    onClick={() => setMode('list')}
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    {isAr ? 'رجوع لقايمة العقود' : 'Back to saved contracts'}
                  </button>
                )}
              </div>

              {/* Contract header data */}
              <SectionTitle icon={<FileSignature size={16} className="text-primary-500" />}>
                {isAr ? 'بيانات العقد' : 'Contract data'}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'رقم العقد' : 'Contract no.'}</label>
                  <input className={inputClass} value={draft.number} onChange={e => patch({ number: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'تاريخ العقد (تلقائي = اليوم)' : 'Contract date (auto = today)'}</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.contract_date}
                    onChange={e => patch({ contract_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'نهاية الإيجار (محسوبة)' : 'Rental end (computed)'}</label>
                  <input className={`${inputClass} bg-gray-50 dark:bg-slate-800/50`} value={computedEndDate || '—'} readOnly />
                </div>
              </div>

              {/* Landlord */}
              <SectionTitle icon={<Users size={16} className="text-primary-500" />}>
                {isAr ? 'الطرف الأول (المؤجر)' : 'First party (landlord)'}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'الاسم' : 'Name'}</label>
                  <input className={inputClass} value={draft.landlord.name} onChange={e => patchLandlord({ name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'الرقم القومي' : 'National ID'}</label>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={14}
                    value={draft.landlord.national_id}
                    onChange={e => patchLandlord({ national_id: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'الجنسية' : 'Nationality'}</label>
                  <input className={inputClass} value={draft.landlord.nationality} onChange={e => patchLandlord({ nationality: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="tel"
                    value={draft.landlord.phone}
                    onChange={e => patchLandlord({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'العنوان' : 'Address'}</label>
                  <input className={inputClass} value={draft.landlord.address} onChange={e => patchLandlord({ address: e.target.value })} />
                </div>
              </div>

              {/* Tenants */}
              <SectionTitle icon={<Users size={16} className="text-primary-500" />}>
                {isAr ? `الطرف الثاني (المستأجرون) — ${draft.parties.length}` : `Second party (tenants) — ${draft.parties.length}`}
              </SectionTitle>

              <div className="space-y-3">
                {draft.parties.map((party, index) => (
                  <div key={party.id} className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                        {isAr ? `الطرف ${index + 1}` : `Party ${index + 1}`}
                      </span>
                      {draft.parties.length > 1 && (
                        <button
                          onClick={() => removeParty(party.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={isAr ? 'مسح الطرف' : 'Remove party'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClass}>{isAr ? 'الجنس' : 'Gender'}</label>
                        <div className="flex gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                          {([
                            { value: 'male', label: isAr ? 'ذكر' : 'Male' },
                            { value: 'female', label: isAr ? 'أنثى' : 'Female' },
                          ] as { value: PartyGender; label: string }[]).map(option => (
                            <button
                              key={option.value}
                              onClick={() => setPartyGender(party.id, option.value)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                party.gender === option.value
                                  ? 'bg-primary-600 text-white shadow'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>{isAr ? 'اللقب' : 'Title'}</label>
                        <select
                          className={inputClass}
                          value={party.title}
                          onChange={e => patchParty(party.id, { title: e.target.value as PartyTitle })}
                        >
                          {partyTitles(party.gender).map(title => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>{isAr ? 'الاسم' : 'Name'}</label>
                        <input
                          className={inputClass}
                          value={party.name}
                          onChange={e => patchParty(party.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{isAr ? 'الرقم القومي' : 'National ID'}</label>
                        <input
                          className={inputClass}
                          dir="ltr"
                          inputMode="numeric"
                          maxLength={14}
                          value={party.national_id}
                          onChange={e => patchParty(party.id, { national_id: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                        <input
                          className={inputClass}
                          dir="ltr"
                          inputMode="tel"
                          value={party.phone}
                          onChange={e => patchParty(party.id, { phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addParty}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {isAr ? 'إضافة طرف آخر (مستأجر إضافي)' : 'Add another tenant'}
                </button>
              </div>

              {/* Unit + term */}
              <SectionTitle icon={<FileSignature size={16} className="text-primary-500" />}>
                {isAr ? 'الوحدة ومدة الإيجار' : 'Unit & rental term'}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'الوحدة' : 'Unit'}</label>
                  <input className={inputClass} value={draft.unit_name} onChange={e => patch({ unit_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'النوع' : 'Type'}</label>
                  <input className={inputClass} value={draft.unit_type} onChange={e => patch({ unit_type: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'القرية' : 'Village'}</label>
                  <input className={inputClass} value={draft.village_name} onChange={e => patch({ village_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'المرحلة' : 'Phase'}</label>
                  <input className={inputClass} value={draft.unit_phase} onChange={e => patch({ unit_phase: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'بداية الإيجار' : 'Rental start'}</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.start_date}
                    onChange={e => patch({ start_date: e.target.value })}
                  />
                </div>
              </div>

              {/* المدة: أيام / شهور / سنوات — مفيش "ليالي" في العقد */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'نظام المدة' : 'Duration mode'}</label>
                  <div className="flex gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                    {([
                      { value: 'days', label: isAr ? 'أيام' : 'Days' },
                      { value: 'months', label: isAr ? 'شهور' : 'Months' },
                      { value: 'years', label: isAr ? 'سنوات' : 'Years' },
                    ] as { value: ContractDurationMode; label: string }[]).map(option => (
                      <button
                        key={option.value}
                        onClick={() => patch({ duration_mode: option.value })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          draft.duration_mode === option.value
                            ? 'bg-primary-600 text-white shadow'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {draft.duration_mode === 'days'
                      ? (isAr ? 'عدد الأيام' : 'Number of days')
                      : draft.duration_mode === 'months'
                        ? (isAr ? 'عدد الشهور' : 'Number of months')
                        : (isAr ? 'عدد السنوات' : 'Number of years')}
                  </label>
                  <NumberInput
                    className={inputClass}
                    min={1}
                    allowDecimal={false}
                    value={draft.duration_value}
                    onChange={duration_value => patch({ duration_value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'نهاية الإيجار (محسوبة)' : 'Rental end (computed)'}</label>
                  <input className={`${inputClass} bg-gray-50 dark:bg-slate-800/50`} value={computedEndDate || '—'} readOnly />
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-primary-50/70 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/40 text-xs font-bold text-primary-800 dark:text-primary-200">
                {isAr ? 'المدة في العقد' : 'Contract duration'}: {durationLabel || '—'}
                {draft.duration_mode === 'days' && (
                  <span className="block mt-1 font-semibold opacity-80">
                    {isAr
                      ? 'لو عدد الأيام يوافق عددًا صحيحًا من الشهور على الكالندر (زي 365 يوم = سنة كاملة) هيتكتب جنبه تلقائيًا.'
                      : 'If the days match a whole number of calendar months (e.g. 365 days = a full year) it is added automatically.'}
                  </span>
                )}
              </div>

              {/* قائمة المنقولات (ملحق العقد) */}
              <SectionTitle icon={<ClipboardList size={16} className="text-primary-500" />}>
                {isAr
                  ? `قائمة المنقولات (${draft.inventory.reduce((sum, s) => sum + s.items.length, 0)} منقول)`
                  : `Inventory list (${draft.inventory.reduce((sum, s) => sum + s.items.length, 0)} items)`}
              </SectionTitle>

              {/* زرار تفعيل/إلغاء قائمة المنقولات في العقد */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border ${
                  draft.inventory_enabled
                    ? 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-gray-100/70 dark:bg-slate-800/60 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    draft.inventory_enabled
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {draft.inventory_enabled
                    ? isAr
                      ? 'قائمة المنقولات مفعّلة — هتتطبع كملحق في العقد.'
                      : 'Inventory is enabled — it prints as an annex in the contract.'
                    : isAr
                      ? 'قائمة المنقولات مقفولة — مش هتظهر في العقد خالص.'
                      : 'Inventory is disabled — it will not appear in the contract.'}
                </span>
                <button
                  onClick={() => patch({ inventory_enabled: !draft.inventory_enabled })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    draft.inventory_enabled
                      ? 'bg-white dark:bg-slate-800 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50'
                      : 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700'
                  }`}
                >
                  {draft.inventory_enabled
                    ? (isAr ? 'إلغاء قائمة المنقولات' : 'Disable inventory')
                    : (isAr ? 'تفعيل قائمة المنقولات' : 'Enable inventory')}
                </button>
              </div>

              {draft.inventory_enabled && (
                <>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {isAr
                  ? 'البنود دي محفوظة أوتوماتيك في كل عقد جديد — تقدر تعدّل أي منقول، أو تمسح بند/منقول، أو تزوّد بنود ومنقولات جديدة.'
                  : 'These sections come with every new contract — edit any item, delete a section or item, or add new ones.'}
              </p>

              {draft.inventory.map((section, sIndex) => (
                <div
                  key={section.id}
                  className="mb-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 shrink-0 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center text-xs font-black">
                      {sIndex + 1}
                    </span>
                    <input
                      className={`${inputClass} font-bold`}
                      value={section.title}
                      onChange={e => patchSection(section.id, { title: e.target.value })}
                    />
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-2 shrink-0 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={isAr ? 'مسح البند بالكامل' : 'Delete section'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-1.5 mb-1 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    <div className="col-span-1 text-center">م</div>
                    <div className="col-span-3">{section.nameHeader}</div>
                    <div className="col-span-4">{section.specsHeader}</div>
                    <div className="col-span-1 text-center">{section.countHeader}</div>
                    <div className="col-span-2">{section.conditionHeader}</div>
                    <div className="col-span-1" />
                  </div>

                  {section.items.map((item, iIndex) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1.5 mb-1.5 items-center">
                      <div className="col-span-1 text-center text-[11px] font-bold text-gray-500">{iIndex + 1}</div>
                      <input
                        className={`${inputClass} col-span-3 !p-2 text-xs`}
                        value={item.name}
                        onChange={e => patchItem(section.id, item.id, { name: e.target.value })}
                      />
                      <input
                        className={`${inputClass} col-span-4 !p-2 text-xs`}
                        value={item.specs}
                        onChange={e => patchItem(section.id, item.id, { specs: e.target.value })}
                      />
                      <input
                        className={`${inputClass} col-span-1 !p-2 text-xs text-center`}
                        value={item.count}
                        onChange={e => patchItem(section.id, item.id, { count: e.target.value })}
                      />
                      <input
                        className={`${inputClass} col-span-2 !p-2 text-xs`}
                        value={item.condition}
                        onChange={e => patchItem(section.id, item.id, { condition: e.target.value })}
                      />
                      <button
                        onClick={() => removeItem(section.id, item.id)}
                        className="col-span-1 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={isAr ? 'مسح المنقول' : 'Delete item'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addItem(section.id)}
                    className="w-full mt-1 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    {isAr ? 'إضافة منقول للبند' : 'Add item'}
                  </button>
                </div>
              ))}

              <button
                onClick={addSection}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-900/50 text-xs font-bold text-primary-600 dark:text-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {isAr ? 'إضافة بند جديد للقائمة' : 'Add new section'}
              </button>
                </>
              )}

              {/* Amounts */}
              <SectionTitle icon={<FileSignature size={16} className="text-primary-500" />}>
                {isAr ? 'القيمة الإيجارية والتأمين' : 'Rent & deposit'}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'قيمة الإيجار (ج.م)' : 'Rent amount (EGP)'}</label>
                  <NumberInput
                    className={inputClass}
                    value={draft.rent_amount}
                    onChange={rent_amount => patch({ rent_amount })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'مبلغ التأمين (ج.م)' : 'Deposit (EGP)'}</label>
                  <NumberInput
                    className={inputClass}
                    value={draft.deposit_amount}
                    onChange={deposit_amount => patch({ deposit_amount })}
                  />
                </div>
                {draft.inventory_enabled && (
                  <div>
                    <label className={labelClass}>{isAr ? 'قيمة المنقولات (ج.م)' : 'Inventory value (EGP)'}</label>
                    <NumberInput
                      className={inputClass}
                      value={draft.inventory_value}
                      onChange={inventory_value => patch({ inventory_value })}
                    />
                  </div>
                )}
                <div className="md:col-span-3">
                  <label className={labelClass}>{isAr ? 'طريقة السداد' : 'Payment terms'}</label>
                  <input className={inputClass} value={draft.payment_terms} onChange={e => patch({ payment_terms: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={draft.notes}
                    onChange={e => patch({ notes: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-slate-800/60 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>

          {mode === 'form' && draft && (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={busy !== null}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {busy === 'save' ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {isAr ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={busy !== null}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {busy === 'export' ? <Loader2 size={17} className="animate-spin" /> : <FileDown size={17} />}
                {isAr ? 'حفظ وتصدير PDF' : 'Save & export PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
