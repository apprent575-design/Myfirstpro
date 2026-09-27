-- ============================================================
--  نظام الإيجار بالشهر / بالسنة في جدول الحجوزات (bookings)
--  شغّل الملف ده مرة واحدة في Supabase → SQL Editor → Run
-- ============================================================

alter table public.bookings add column if not exists rental_mode text default 'nightly'; -- 'nightly' | 'monthly'
alter table public.bookings add column if not exists period_unit text default 'months';  -- 'months' | 'years'
alter table public.bookings add column if not exists period_count integer default 0;     -- عدد الشهور / السنين
alter table public.bookings add column if not exists period_rate numeric default 0;      -- سعر الشهر / السنة

-- الحجوزات القديمة كلها بالنظام العادي (بالليلة)
update public.bookings set rental_mode = 'nightly' where rental_mode is null;
