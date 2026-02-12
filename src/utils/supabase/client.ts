import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rhcmppstjichgyhoxgaw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY21wcHN0amljaGd5aG94Z2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODUyMjIsImV4cCI6MjA4NjQ2MTIyMn0.BrEDeB1zbDCGLg3wY_Yc6tQ6jDHMm_Wx6xwPhgam0VE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);