ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS backup_frequency text default 'weekly';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS backup_email text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS last_backup_date text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS backup_time text default '00:00';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS backup_start_date date;
