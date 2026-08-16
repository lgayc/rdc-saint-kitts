/**
 * ============================================================
 *  CORS
 * ============================================================
 *  El sitio y el backend viven en dominios distintos (Netlify y
 *  Supabase), así que el navegador exige permiso explícito.
 *
 *  ALLOWED_ORIGINS es una lista separada por comas:
 *
 *      ALLOWED_ORIGINS="https://rdcsaintkitts.com,https://rdc.netlify.app"
 *
 *  Si no se define, se acepta cualquier origen. Eso está bien
 *  mientras se prueba, pero en producción conviene ponerla: sin
 *  ella, cualquier página puede enviar reservas desde el navegador
 *  de un visitante.
 * ============================================================
 */

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  // Sin lista configurada: modo abierto.
  if (ALLOWED.length === 0) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  // Con lista: se devuelve el origen solo si está en ella. Si no,
  // se devuelve el primero autorizado, que hace que el navegador
  // bloquee la respuesta. Es el rechazo correcto.
  const allowed = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return { ...base, "Access-Control-Allow-Origin": allowed };
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
