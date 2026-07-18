
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
export const SUPABASE_URL = 'https://wcjoxjpyarfhfzkcmgue.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjam94anB5YXJmaGZ6a2NtZ3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODA3OTAsImV4cCI6MjA5OTk1Njc5MH0.actfJ9oX1vIJI-fyL-VEe1AnadZrJaf4JdNr_Q3ReYQ';

// Check if keys are valid
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

if (!supabase) {
  console.warn("%c Supabase Not Connected! ", "background: #f59e0b; color: black; padding: 4px; border-radius: 4px; font-weight: bold;");
  console.log("Running in local Mock Mode. Data will not be saved to the database.");
} else {
  console.log("%c Supabase Connected ", "background: #10b981; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
}
