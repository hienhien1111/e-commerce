import { createClient } from '@supabase/supabase-js';

const supabaseURL: string = process.env.SUPABASE_URL!;
const supabaseKey: string = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseURL, supabaseKey);
