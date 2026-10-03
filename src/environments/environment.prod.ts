export const environment = {
  production: true,
  // TODO: sustituir por la URL del proxy EUSTAT/Gemini ya desplegado.
  eustatProxyUrl: 'https://TODO-sustituir-por-la-url-del-proxy-desplegado',

  // Mismo proyecto de Supabase en dev y prod por ahora (es un
  // prototipo) -- el día que haya entornos separados, aquí iría el
  // proyecto de producción.
  supabaseUrl: 'https://kfgiqjpatmcaqrpbcwlw.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZ2lxanBhdG1jYXFycGJjd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTU4MTUsImV4cCI6MjEwNjU5MTgxNX0.I65wl5vSc4aZ24FZqDEeo4U5ZuTU4r7-LBulCxVZABQ',
};