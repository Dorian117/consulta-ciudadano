import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.consultaciudadano.movil',
  appName: 'Consulta Ciudadano',
  webDir: 'dist/movil/browser',
  server: {
    // Solo desarrollo: permite HTTP sin cifrar hacia la API en la red local (Android lo bloquea por defecto).
  },
  plugins: {
    // Las peticiones salen por el HTTP nativo del telefono: no pasan por CORS y no hace falta abrirlo en el servidor.
    CapacitorHttp: { enabled: true },
  },
};

export default config;

// 1) appId identifica la app en Android (no se puede cambiar despues de publicarla).
// 2) webDir es la carpeta que genera "ng build"; "npx cap sync" la copia dentro del proyecto Android.
// 3) cleartext: true es un riesgo aceptado solo en desarrollo: sin HTTPS las claves viajan sin cifrar por la red local.
//    Para produccion, la API debe servirse por HTTPS y esta linea debe quitarse.
// 4) CapacitorHttp enabled: el HttpClient de Angular usa el cliente HTTP nativo en el telefono, sin las reglas CORS del navegador.
