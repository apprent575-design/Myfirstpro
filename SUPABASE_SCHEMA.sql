
-- ⚠️ WARNING: This ensures the schema is correct and Permissions are fixed for Admins.

-- 1. Create Profiles Table (Linked to Auth Users) if not exists
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user', -- 'admin' or 'user'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Policies: Drop first to avoid "already exists" error
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. Create Subscriptions Table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_date date not null,
  duration_days integer not null,
  price numeric default 0,
  status text default 'active', -- 'active', 'paused', 'expired'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on Subscriptions
alter table public.subscriptions enable row level security;

-- Drop old policies
drop policy if exists "Users can read own subscription" on public.subscriptions;
drop policy if exists "Admins can view all subscriptions" on public.subscriptions;
drop policy if exists "Admins can insert subscriptions" on public.subscriptions;
drop policy if exists "Admins can update subscriptions" on public.subscriptions;
drop policy if exists "Admins can delete subscriptions" on public.subscriptions;

-- User Policies
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- ADMIN POLICIES (CRITICAL FIX: Allow Full CRUD)
create policy "Admins can view all subscriptions" on public.subscriptions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert subscriptions" on public.subscriptions for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update subscriptions" on public.subscriptions for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete subscriptions" on public.subscriptions for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 3. Create Units Table
create table if not exists public.units (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.units enable row level security;

-- Drop old policies
drop policy if exists "Users can CRUD own units" on public.units;
drop policy if exists "Admins can all units" on public.units;

-- Simplified Admin Policies for Units
create policy "Users can CRUD own units" on public.units for all using (auth.uid() = user_id);
create policy "Admins can all units" on public.units for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 4. Create Bookings Table
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade not null,
  tenant_name text not null,
  phone text,
  start_date date not null,
  end_date date,
  nights integer default 1,
  nightly_rate numeric default 0,
  village_fee numeric default 0,
  total_rental_price numeric default 0,
  housekeeping_enabled boolean default false,
  housekeeping_price numeric default 0,
  deposit_enabled boolean default false,
  deposit_amount numeric default 0,
  status text default 'Pending',
  payment_status text default 'Unpaid',
  notes text,
  tenant_rating_good boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.bookings enable row level security;

-- Drop old policies
drop policy if exists "Users can CRUD own bookings" on public.bookings;
drop policy if exists "Admins can all bookings" on public.bookings;

create policy "Users can CRUD own bookings" on public.bookings for all using (auth.uid() = user_id);
create policy "Admins can all bookings" on public.bookings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 5. Create Expenses Table
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade,
  title text not null,
  category text,
  amount numeric default 0,
  date date default now(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.expenses enable row level security;

-- Drop old policies
drop policy if exists "Users can CRUD own expenses" on public.expenses;
drop policy if exists "Admins can all expenses" on public.expenses;

create policy "Users can CRUD own expenses" on public.expenses for all using (auth.uid() = user_id);
create policy "Admins can all expenses" on public.expenses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 6. Trigger for New User
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Admin Helper Function
create or replace function delete_user_by_id(target_user_id uuid)
returns void as $$
begin
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;

-- 8. ENABLE REALTIME (Critical for Instant Updates)
-- We try to add tables. If they exist, it might throw a warning, but that's fine.
-- Safe way: remove from publication first then add back, or just ignore errors if possible.
-- Since SQL scripts stop on error, we just run the alter statements. 
-- If you get "already exists" for publication, ignore it, but usually "add table" is safe if not present.
do $$
begin
  alter publication supabase_realtime add table public.subscriptions;
exception when others then null; -- Ignore if already exists
end; $$;

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when others then null;
end; $$;

do $$
begin
  alter publication supabase_realtime add table public.units;
exception when others then null;
end; $$;

do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception when others then null;
end; $$;

-- 9. SET REPLICA IDENTITY (Critical for DELETE events)
alter table public.subscriptions replica identity full;
