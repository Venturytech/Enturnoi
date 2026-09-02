export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jtjpaigxmepqwehyjijd.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0anBhaWd4bWVwcXdlaHlqaWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODUxODUsImV4cCI6MjEwMzM2MTE4NX0.fMqp_pwYs1exbbWMJKfnAM-qD5nt-ohtzW6T_XZzbwM";

export const supabaseConfigured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
