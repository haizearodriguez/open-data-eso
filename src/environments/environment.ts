// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // URL del proxy que esquiva el bloqueo de CORS de EUSTAT (ver server/).
  // En desarrollo local apunta a `npm start` dentro de esa carpeta.
  eustatProxyUrl: 'http://localhost:3000',

  // Supabase: perfiles y resultados, protegidos con Row Level
  // Security (ver supabase-schema.sql). La clave "anon" es pública
  // por diseño -- no es un secreto, va en el bundle del cliente.
  supabaseUrl: 'https://kfgiqjpatmcaqrpbcwlw.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZ2lxanBhdG1jYXFycGJjd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTU4MTUsImV4cCI6MjEwNjU5MTgxNX0.I65wl5vSc4aZ24FZqDEeo4U5ZuTU4r7-LBulCxVZABQ',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.