import { format, differenceInCalendarDays } from 'date-fns';
import { Booking, ContractParty, PartyGender, PartyTitle, RentalContract, Unit, User } from '../types';

/* -------------------------------------------------------------------------
   عقود الإيجار: أدوات الكارت + نسخة محلية (cache) من العقود
   المصدر الأساسي بقى جدول public.contracts على Supabase، والنسخة المحلية
   بتخلّي الشغل شغال حتى لو النت قطع أو الجدول لسه ما اتعملش.
   ------------------------------------------------------------------------- */

const STORAGE_PREFIX = 'rental-contracts:';

const storageKey = (userId?: string) => `${STORAGE_PREFIX}${userId || 'local'}`;

const safeParse = (raw: string | null): RentalContract[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RentalContract[]) : [];
  } catch {
    return [];
  }
};

export const newId = () => {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const sortContracts = (list: RentalContract[]) =>
  [...list].sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));

// ---------- نسخة محلية (cache) ----------

export const readContractCache = (userId?: string): RentalContract[] =>
  sortContracts(safeParse(localStorage.getItem(storageKey(userId))));

export const writeContractCache = (userId: string | undefined, list: RentalContract[]): RentalContract[] => {
  const sorted = sortContracts(list);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(sorted));
  } catch (e) {
    console.error('Could not cache contracts locally', e);
  }
  return sorted;
};

export const upsertContractCache = (userId: string | undefined, contract: RentalContract): RentalContract[] => {
  const list = readContractCache(userId);
  const idx = list.findIndex(c => c.id === contract.id);
  if (idx >= 0) list[idx] = contract;
  else list.push(contract);
  return writeContractCache(userId, list);
};

export const removeContractCache = (userId: string | undefined, id: string): RentalContract[] =>
  writeContractCache(userId, readContractCache(userId).filter(c => c.id !== id));

// بندمج عقود السحابة مع النسخة المحلية بالـ id، والأحدث (updated_at) هو اللي يفوز
export const mergeContractCache = (userId: string | undefined, dbList: RentalContract[]): RentalContract[] => {
  const byId = new Map<string, RentalContract>();
  [...readContractCache(userId), ...dbList].forEach(contract => {
    const existing = byId.get(contract.id);
    if (!existing) {
      byId.set(contract.id, contract);
      return;
    }
    if ((contract.updated_at || '') > (existing.updated_at || '')) byId.set(contract.id, contract);
  });
  return writeContractCache(userId, [...byId.values()]);
};

// ---------- تطبيع صفوف قاعدة البيانات ----------

export const createParty = (overrides: Partial<ContractParty> = {}): ContractParty => {
  const gender: PartyGender = overrides.gender === 'female' ? 'female' : 'male';
  return {
    id: overrides.id || newId(),
    gender,
    title: titleForGender(gender, overrides.title),
    name: overrides.name || '',
    national_id: overrides.national_id || '',
    phone: overrides.phone || '',
  };
};

export const normalizeContractRow = (row: any): RentalContract => ({
  id: String(row?.id || newId()),
  user_id: row?.user_id,
  booking_id: row?.booking_id || undefined,
  unit_id: row?.unit_id || undefined,
  number: row?.number || '',
  contract_date: String(row?.contract_date || '').slice(0, 10),
  landlord: {
    name: row?.landlord?.name || '',
    national_id: row?.landlord?.national_id || '',
    phone: row?.landlord?.phone || '',
    address: row?.landlord?.address || '',
  },
  parties: Array.isArray(row?.parties)
    ? row.parties.map((p: any) =>
        createParty({
          id: p?.id,
          gender: p?.gender === 'female' ? 'female' : 'male',
          title: p?.title,
          name: p?.name || '',
          national_id: p?.national_id || '',
          phone: p?.phone || '',
        })
      )
    : [],
  unit_name: row?.unit_name || '',
  unit_type: row?.unit_type || '',
  village_name: row?.village_name || '',
  start_date: String(row?.start_date || '').slice(0, 10),
  end_date: String(row?.end_date || '').slice(0, 10),
  nights: Number(row?.nights) || 0,
  rent_amount: Number(row?.rent_amount) || 0,
  deposit_amount: Number(row?.deposit_amount) || 0,
  payment_terms: row?.payment_terms || '',
  notes: row?.notes || '',
  created_at: row?.created_at || new Date().toISOString(),
  updated_at: row?.updated_at || new Date().toISOString(),
});

// ---------- البحث عن عقود نفس المستأجر ----------

const normalizeName = (value?: string) => (value || '').replace(/[\s\u0640]+/g, ' ').trim();

const normalizePhone = (value?: string) => (value || '').replace(/[^0-9]/g, '').replace(/^20/, '');

export const matchesTenant = (
  contract: RentalContract,
  tenant: { id?: string; name?: string; phone?: string }
): boolean => {
  const name = normalizeName(tenant.name);
  const phone = normalizePhone(tenant.phone);
  return (
    Boolean(tenant.id && contract.booking_id === tenant.id) ||
    Boolean(name && contract.parties?.some(p => normalizeName(p.name) === name)) ||
    Boolean(phone && contract.parties?.some(p => normalizePhone(p.phone) === phone))
  );
};

export const contractsForTenant = (
  list: RentalContract[],
  tenant: { id?: string; name?: string; phone?: string }
): RentalContract[] => sortContracts(list.filter(c => matchesTenant(c, tenant)));

// ---------- الألقاب ----------

export const titlesForGender = (gender: PartyGender): PartyTitle[] =>
  gender === 'female' ? ['السيدة', 'الآنسة', 'المدام'] : ['السيد', 'الأستاذ'];

// اللقب لازم يتبع الجنس المختار (ذكر / أنثى)
export const titleForGender = (gender: PartyGender, current?: PartyTitle): PartyTitle => {
  const allowed = titlesForGender(gender);
  return current && allowed.includes(current) ? current : allowed[0];
};

// ---------- رقم العقد والمبالغ ----------

export const nextContractNumber = (existing: RentalContract[], date = new Date()) => {
  const year = format(date, 'yyyy');
  const used = existing
    .map(c => (c.number || '').split('/'))
    .filter(parts => parts[0] === year)
    .map(parts => parseInt(parts[1] || '0', 10))
    .filter(n => !isNaN(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${year}/${String(next).padStart(3, '0')}`;
};

const nightsBetween = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(e, s));
};

// كل بيانات العقد جاهزة أوتوماتيك من كارت المستأجر (ويقدر المستخدم يعدّلها)
export const buildContractDefaults = (
  booking: Booking,
  unit: Unit | undefined,
  user: User | null | undefined,
  existing: RentalContract[]
): RentalContract => {
  const today = new Date();
  return {
    id: newId(),
    user_id: user?.id,
    booking_id: booking.id,
    unit_id: booking.unit_id,
    number: nextContractNumber(existing, today),
    contract_date: format(today, 'yyyy-MM-dd'),
    landlord: {
      name: user?.full_name || '',
      national_id: '',
      phone: user?.phone || '',
      address: '',
    },
    parties: [createParty({ name: booking.tenant_name, phone: booking.phone })],
    unit_name: unit?.name || '',
    unit_type: unit?.type || '',
    village_name: unit?.village_name_ar || unit?.village_name_en || '',
    start_date: booking.start_date,
    end_date: booking.end_date,
    nights: booking.nights || nightsBetween(booking.start_date, booking.end_date),
    rent_amount: booking.total_rental_price || 0,
    deposit_amount:
      (booking.security_deposit_enabled ? booking.security_deposit : booking.deposit_amount) || 0,
    payment_terms: 'يُسدد كامل المبلغ عند التوقيع على هذا العقد.',
    notes: booking.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
