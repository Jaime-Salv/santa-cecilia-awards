import { createClient } from '@supabase/supabase-js';

// La URL y la clave publishable de Supabase están diseñadas para uso público.
// Nunca introducir una clave secreta o service_role en el código del navegador.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nlipaxztoznwkhqlmiuj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_7YQwX7asa5BSuC9R-aBvfw_V3OADgHf';

export const supabase = createClient(supabaseUrl, publishableKey);
