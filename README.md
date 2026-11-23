# Consulta de Ciudadanos

Aplicación web (Angular) y API (Node + Express + MongoDB Atlas) para administrar ciudadanos y su estado
(Requerido / No requerido), con inicio de sesión y menú según los permisos del perfil.

```
backend/   API REST (Express 5, Mongoose, zod, JWT)
frontend/  Aplicación web (Angular)
db/        Scripts de mongosh que crean colecciones, validadores, índices y datos base
docs/      Bitácora, preparación de la sustentación, pendientes y API
mobile/    Reservado para la app móvil (aún sin desarrollar)
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

## Pruebas
- Backend: `cd backend && npm test` (usa la base real de Atlas; los datos de prueba llevan el prefijo `zz_test_` y se borran al terminar).
- Frontend: `cd frontend && npx ng test --watch=false`.

## Alcance de esta entrega
Inicio de sesión, menú por permisos y CRUD de ciudadanos (web + API). Reportes PDF, gestión de usuarios y perfiles,
cifrado AES y la app móvil quedan fuera; ver `docs/PENDIENTES.md`. La documentación de cada fase está en `docs/BITACORA.md`.
