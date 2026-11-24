import { Capacitor } from '@capacitor/core';

// Direccion de la API. CAMBIAR AQUI (y solo aqui) por la IP del computador que corre el backend, en la misma red WiFi
// que el telefono. En Windows se ve con: ipconfig (IPv4 del adaptador WiFi). El puerto es el del backend (3000).
export const URL_SERVIDOR = 'https://consulta-ciudadano-57du.onrender.com';

// En el telefono se usa URL_SERVIDOR. En el navegador (desarrollo con "npm start") se usan rutas relativas y el proxy
// de proxy.conf.json las envia al backend en localhost:3000.
export const urlApi = (): string => (Capacitor.isNativePlatform() ? URL_SERVIDOR : '');
