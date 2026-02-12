import { createClient } from '@supabase/supabase-js';

const supabaseUrl = https://rhcmppstjichgyhoxgaw.supabase.co;
const supabaseKey = sb_publishable_fHVGIE81mSLLr7HRkD0bwA_TJWRA82d;

export const supabase = createClient(supabaseUrl, supabaseKey);