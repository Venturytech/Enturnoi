import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Refresca la sesión de Supabase en cada request y la mantiene en cookies.
// Blindado: si algo falla (config incompleta, red), deja pasar la request
// en vez de tumbar todo el sitio con un 500.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // Importante: refresca el token del usuario (no quitar).
    await supabase.auth.getUser();
  } catch (e) {
    console.error("middleware supabase error:", e);
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
