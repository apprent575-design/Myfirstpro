
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
export const SUPABASE_URL = 'https://wxqadpvmfrhsjlhruuju.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_8KCv_jlQgylFN-tYpIbvQw_mBl2i3KQ';

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
