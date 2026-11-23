# Consulta de Ciudadanos

Aplicación web (Angular) y API (Node + Express + MongoDB Atlas) para administrar ciudadanos y su estado
(Requerido / No requerido), con inicio de sesión y menú según los permisos del perfil.

```
backend/   API REST (Express 5, Mongoose, zod, JWT)
frontend/  Aplicación web (Angular)
db/        Scripts de mongosh que crean colecciones, validadores, índices y datos base
docs/      Bitácora, preparación de la sustentación, pendientes y API
mobile/    App móvil Android (Ionic + Capacitor)
```

## Requisitos
- Node 26 (Angular 22 y las dependencias del backend lo soportan) y npm.
- Un cluster de MongoDB Atlas y `mongosh`.

## Cómo ejecutar
1. **Base de datos** (una sola vez): `mongosh "<MONGO_URI>" db/01_registraduria.js` y luego `db/02_defensa.js`.
2. **Variables de entorno:** copie `backend/.env.example` a `backend/.env` y complete los valores. Nunca suba el `.env`.
3. **Backend:**
   ```
   cd backend
   npm install
   npm run crear-admin   # crea el primer administrador con los datos de ADMIN_INICIAL_*
   npm run dev           # API en http://localhost:3000
   ```
4. **Frontend:**
   ```
   cd frontend
   npm install
   npm start             # http://localhost:4200 (el proxy envía /api al puerto 3000)
   ```

## App móvil (Android, Ionic + Capacitor)
Para la Fuerza Pública: login, lectura de código de barras (o digitación) y resultado Requerido / No requerido.
1. Edite `mobile/src/app/config.ts` y ponga la IP del computador que corre el backend (ver con `ipconfig`); teléfono y computador en la misma red.
2. `cd mobile && npm install && npx ng build`
3. Primera vez: `npx cap add android`. Siempre: `npx cap sync`
4. `npx cap open android` y compile el APK con Android Studio.
Para probar sin teléfono: `npm start` en `mobile/` (usa el proxy hacia el backend). Imprima `docs/codigos_barras.html` para tener códigos de prueba.

## Pruebas
- Backend: `cd backend && npm test` (usa la base real de Atlas; los datos de prueba llevan el prefijo `zz_test_` y se borran al terminar).
- Frontend y móvil: `npx ng test --watch=false` dentro de `frontend/` y de `mobile/`.

## Alcance de esta entrega
Inicio de sesión, menú por permisos, CRUD de ciudadanos y reporte PDF (web + API), y la app móvil de consulta. Reportes PDF, gestión de usuarios y perfiles,
cifrado AES quedan fuera; la web incluye el reporte PDF y hay una app móvil de consulta; ver `docs/PENDIENTES.md`. La documentación de cada fase está en `docs/BITACORA.md`.
