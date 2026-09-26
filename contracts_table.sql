-- ============================================================
--  عقود الإيجار (Rental contracts)
--  شغّل الملف ده مرة واحدة في Supabase → SQL Editor → Run
-- ============================================================

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  booking_id uuid references public.bookings(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  number text,
  contract_date date,
  landlord jsonb default '{}'::jsonb,   -- { name, national_id, nationality, phone, address }
  parties jsonb default '[]'::jsonb,    -- [{ id, gender, title, name, national_id, phone }]
  unit_name text,
  unit_type text,
  village_name text,
  unit_phase text,                      -- المرحلة (مثال: المرحلة الأولى)
  start_date date,
  end_date date,
  nights integer default 0,             -- قديم: للتوافق مع العقود المحفوظة قبل التعديل
  duration_mode text default 'days',    -- 'days' | 'months' | 'years'
  duration_value integer default 0,     -- عدد الأيام / الشهور / السنوات
  inventory jsonb default '[]'::jsonb,  -- ملحق قائمة المنقولات (بنود + منقولات)
  inventory_enabled boolean default true, -- تفعيل/إلغاء قائمة المنقولات في العقد
  inventory_value numeric default 0,    -- قيمة المنقولات الإجمالية
  rent_amount numeric default 0,
  deposit_amount numeric default 0,
  payment_terms text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- تفعيل RLS زي باقي الجداول
alter table public.contracts enable row level security;

drop policy if exists "Users can CRUD own contracts" on public.contracts;
drop policy if exists "Admins can all contracts" on public.contracts;

create policy "Users can CRUD own contracts" on public.contracts for all using (auth.uid() = user_id);
create policy "Admins can all contracts" on public.contracts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- تحديث updated_at تلقائيًا عند أي تعديل
create or replace function public.touch_contracts_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists contracts_touch_updated_at on public.contracts;
create trigger contracts_touch_updated_at
  before update on public.contracts
  for each row execute procedure public.touch_contracts_updated_at();

-- فهارس سريعة للبحث بالمستأجر/الحجز
create index if not exists contracts_user_id_idx on public.contracts (user_id);
create index if not exists contracts_booking_id_idx on public.contracts (booking_id);

-- ============================================================
--  لو الجدول كان اتعمل قبل كده (نسخة قديمة): الأعمدة الجديدة تتضاف بأمان
--  المدة (أيام/شهور/سنوات) + ملحق قائمة المنقولات + زرار تفعيل/إلغاء القائمة
-- ============================================================
alter table public.contracts add column if not exists duration_mode text default 'days';
alter table public.contracts add column if not exists duration_value integer default 0;
alter table public.contracts add column if not exists unit_phase text;
alter table public.contracts add column if not exists inventory jsonb default '[]'::jsonb;
alter table public.contracts add column if not exists inventory_enabled boolean default true;
alter table public.contracts add column if not exists inventory_value numeric default 0;

-- العقود القديمة: قائمة المنقولات مفعّلة افتراضيًا
update public.contracts set inventory_enabled = true where inventory_enabled is null;

-- تحويل العقود القديمة المحفوظة بالليالي إلى أيام
update public.contracts
   set duration_mode = 'days',
       duration_value = nights
 where (duration_value is null or duration_value = 0)
   and coalesce(nights, 0) > 0;
