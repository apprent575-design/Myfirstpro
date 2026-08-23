-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Setup Dynamic Backup Cron Job
-- This function will create or replace the backup cron job based on settings
CREATE OR REPLACE FUNCTION public.update_backup_cron_job()
RETURNS trigger AS $$
DECLARE
  v_time text;
  v_hr text;
  v_min text;
  v_date date;
  v_freq text;
  v_day text;
  v_month text;
  v_dow text;
  v_cron_schedule text;
BEGIN
  v_time := NEW.backup_time;
  v_date := NEW.backup_start_date;
  v_freq := NEW.backup_frequency;
  
  -- If time is null, default to midnight
  IF v_time IS NULL THEN
    v_time := '00:00';
  END IF;

  v_hr := split_part(v_time, ':', 1);
  v_min := split_part(v_time, ':', 2);
  
  -- Adjust for Egypt timezone (UTC+3)
  v_hr := (v_hr::int - 3)::text;
  IF v_hr::int < 0 THEN
      v_hr := (v_hr::int + 24)::text;
  END IF;

  -- Build cron string
  IF v_date IS NULL THEN
      IF v_freq = 'daily' THEN v_cron_schedule := v_min || ' ' || v_hr || ' * * *';
      ELSIF v_freq = 'weekly' THEN v_cron_schedule := v_min || ' ' || v_hr || ' * * 0';
      ELSIF v_freq = 'monthly' THEN v_cron_schedule := v_min || ' ' || v_hr || ' 1 * *';
      ELSIF v_freq = 'yearly' THEN v_cron_schedule := v_min || ' ' || v_hr || ' 1 1 *';
      ELSE v_cron_schedule := v_min || ' ' || v_hr || ' * * *';
      END IF;
  ELSE
      v_day := extract(day from v_date)::text;
      v_month := extract(month from v_date)::text;
      v_dow := extract(dow from v_date)::text;

      IF v_freq = 'daily' THEN 
          v_cron_schedule := v_min || ' ' || v_hr || ' * * *';
      ELSIF v_freq = 'weekly' THEN 
          v_cron_schedule := v_min || ' ' || v_hr || ' * * ' || v_dow;
      ELSIF v_freq = 'monthly' THEN 
          v_cron_schedule := v_min || ' ' || v_hr || ' ' || v_day || ' * *';
      ELSIF v_freq = 'yearly' THEN 
          v_cron_schedule := v_min || ' ' || v_hr || ' ' || v_day || ' ' || v_month || ' *';
      ELSE 
          v_cron_schedule := v_min || ' ' || v_hr || ' * * *';
      END IF;
  END IF;

  -- Unschedule existing job if it exists
  BEGIN
    PERFORM cron.unschedule('db-backup-job');
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist, ignore
  END;
  
  -- Schedule the new job
  PERFORM cron.schedule(
    'db-backup-job',
    v_cron_schedule,
    $cmd$
      SELECT net.http_post(
        url:='https://wxqadpvmfrhsjlhruuju.supabase.co/functions/v1/db-backup',
        headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cWFkcHZtZnJoc2psaHJ1dWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjEwMzYsImV4cCI6MjEwMjk5NzAzNn0.GGCjR93JIUPNa8AnQVZNPBTSzI_O5kNiDrvcSP2dkTQ"}'::jsonb
      );
    $cmd$
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Setup Dynamic Email Notification Cron Job
CREATE OR REPLACE FUNCTION public.update_email_cron_job()
RETURNS trigger AS $$
DECLARE
  v_time text;
  v_hour text;
  v_minute text;
  v_cron_schedule text;
BEGIN
  v_time := NEW.daily_email_time;
  v_hour := split_part(v_time, ':', 1);
  v_minute := split_part(v_time, ':', 2);
  
  -- Adjust for Egypt timezone (UTC+3)
  v_hour := (v_hour::int - 3)::text;
  IF v_hour::int < 0 THEN
      v_hour := (v_hour::int + 24)::text;
  END IF;

  v_cron_schedule := v_minute || ' ' || v_hour || ' * * *';

  BEGIN
    PERFORM cron.unschedule('daily-email-notifications');
  EXCEPTION WHEN OTHERS THEN
  END;
  
  PERFORM cron.schedule(
    'daily-email-notifications',
    v_cron_schedule,
    $cmd$
      SELECT net.http_post(
        url:='https://wxqadpvmfrhsjlhruuju.supabase.co/functions/v1/send-notifications',
        headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cWFkcHZtZnJoc2psaHJ1dWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjEwMzYsImV4cCI6MjEwMjk5NzAzNn0.GGCjR93JIUPNa8AnQVZNPBTSzI_O5kNiDrvcSP2dkTQ"}'::jsonb
      );
    $cmd$
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop triggers if exists and recreate
DROP TRIGGER IF EXISTS on_system_settings_email_update ON public.system_settings;
CREATE TRIGGER on_system_settings_email_update
  AFTER INSERT OR UPDATE OF daily_email_time ON public.system_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_email_cron_job();

DROP TRIGGER IF EXISTS on_system_settings_backup_update ON public.system_settings;
CREATE TRIGGER on_system_settings_backup_update
  AFTER INSERT OR UPDATE OF backup_frequency, backup_time, backup_start_date ON public.system_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_backup_cron_job();

-- Trigger them once manually to initialize both jobs
UPDATE public.system_settings SET daily_email_time = daily_email_time WHERE id = 'global';
UPDATE public.system_settings SET backup_frequency = backup_frequency WHERE id = 'global';
