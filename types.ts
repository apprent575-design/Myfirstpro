
export enum UnitType {
  CHALET = 'Chalet',
  VILLA = 'Villa',
  PALACE = 'Palace'
}

export enum BookingStatus {
  CONFIRMED = 'Confirmed',
  PENDING = 'Pending',
  CANCELLED = 'Cancelled'
}

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid'
}

export enum FeeType {
  EXCLUSIVE = 'EXCLUSIVE',
  INCLUSIVE = 'INCLUSIVE',
  TENANT_PAYS = 'TENANT_PAYS'
}

export interface Unit {
  id: string;
  user_id?: string; // Owner
  name: string;
  type: UnitType;
  village_name_ar?: string;
  village_name_en?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id?: string; // Owner
  tenant_name: string;
  phone: string;
  start_date: string; // ISO Date string
  nights: number;
  end_date: string; // ISO Date string
  unit_id: string;
  nightly_rate: number; // Base Rate
  village_fee: number; // New: Daily Village Fee
  total_rental_price: number; // Grand Total (Tenant Pays)
  housekeeping_enabled: boolean;
  housekeeping_price: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  security_deposit_enabled?: boolean;
  security_deposit?: number;
  check_in_time?: string; // e.g. "14:00"
  check_out_time?: string; // e.g. "12:00"
  paid_amount: number; // New: Amount Paid (Down Payment / Deposit)
  fee_type?: FeeType; // EXCLUSIVE, INCLUSIVE, TENANT_PAYS
  notes?: string;
  payment_status: PaymentStatus;
  status: BookingStatus;
  tenant_rating_good: boolean; // True = Welcome Again, False = Not Welcome
  created_at: string;
  handler_enabled?: boolean;
  handler_name?: string;
  handler_phone?: string;
}

export interface Expense {
  id: string;
  user_id?: string; // Owner
  unit_id: string;
  booking_id?: string; // New: Link to a specific booking
  title: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
}

export type Role = 'admin' | 'user';

export interface Subscription {
  id: string;
  user_id: string;
  start_date: string;
  duration_days: number;
  price: number;
  status: 'active' | 'expired' | 'paused';
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  phone?: string;
  partner_email?: string;
  subscription?: Subscription;
}

export interface SystemSettings {
  id: string;
  daily_email_time: string;
  last_email_sent_date: string | null;
  emailjs_service_id: string | null;
  emailjs_template_id: string | null;
  emailjs_public_key: string | null;
  backup_frequency: string;
  backup_email: string | null;
  last_backup_date: string | null;
  backup_time: string;
  backup_start_date: string | null;
}

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

// --- Rental contract (عقد إيجار) ---
export type PartyGender = 'male' | 'female';

// Titles offered per gender: male -> السيد / الأستاذ, female -> السيدة / الآنسة / المدام
export type PartyTitle = 'السيد' | 'الأستاذ' | 'السيدة' | 'الآنسة' | 'المدام';

export interface ContractParty {
  id: string;
  gender: PartyGender;
  title: PartyTitle;
  name: string;
  national_id: string;
  phone: string;
}

export interface ContractLandlord {
  name: string;
  national_id: string;
  nationality: string;
  phone: string;
  address: string;
}

// قائمة المنقولات (ملحق العقد) — بند فيه منقولات، وكل منقول له اسم/مواصفات/عدد/حالة
export interface ContractInventoryItem {
  id: string;
  name: string;
  specs: string;
  count: string;
  condition: string;
}

export interface ContractInventorySection {
  id: string;
  title: string;
  nameHeader: string;
  specsHeader: string;
  countHeader: string;
  conditionHeader: string;
  items: ContractInventoryItem[];
}

// مدة الإيجار في العقد: أيام أو شهور أو سنوات (مفيش "ليالي" في العقد)
export type ContractDurationMode = 'days' | 'months' | 'years';

export interface RentalContract {
  id: string;
  user_id?: string;
  booking_id?: string;
  unit_id?: string;
  number: string;            // contract reference, auto from the date + sequence, editable
  contract_date: string;     // yyyy-MM-dd — auto = today, editable
  landlord: ContractLandlord;
  parties: ContractParty[];  // الطرف الثاني — 1 or more tenants
  unit_name: string;
  unit_type: string;
  village_name: string;
  unit_phase: string;        // المرحلة (مثال: المرحلة الأولى)
  start_date: string;        // yyyy-MM-dd (dates only — no times)
  end_date: string;          // yyyy-MM-dd — محسوبة من تاريخ البداية + المدة
  duration_mode: ContractDurationMode;
  duration_value: number;    // عدد الأيام / الشهور / السنين
  inventory: ContractInventorySection[];  // ملحق قائمة المنقولات
  inventory_enabled: boolean;             // تفعيل/إلغاء قائمة المنقولات في العقد
  inventory_value: number;   // قيمة المنقولات الإجمالية
  rent_amount: number;
  deposit_amount: number;
  payment_terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  units: Unit[];
  bookings: Booking[];
  expenses: Expense[];
  contracts: RentalContract[];
  // Admin Data
  allUsers: User[];
  systemSettings: SystemSettings | null;
}
