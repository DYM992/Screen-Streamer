import { createClient } from '@supabase/supabase-js';

const supabaseUrl = https://rhcmppstjichgyhoxgaw.supabase.co;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);