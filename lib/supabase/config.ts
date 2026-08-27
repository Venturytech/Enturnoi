// Configuración de conexión a Supabase, leída de variables de entorno.
// Se definen en .env.local (desarrollo) y en Vercel (producción):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
