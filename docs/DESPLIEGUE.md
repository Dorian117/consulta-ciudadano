# Publicar la aplicacion en internet (web + API en una sola direccion)

El backend sirve tambien la web compilada (`frontend/dist`), asi que se publica un solo servicio y la app movil usa la misma direccion con HTTPS.

## Ejemplo con Render (plan gratuito, hace falta cuenta y repositorio en GitHub)
1. Crear un "Web Service" desde el repositorio.
2. **Build command:**
   `cd frontend && npm install && npx ng build && cd ../backend && npm install && npm run build`
3. **Start command:** `cd backend && npm start`
4. **Variables de entorno** (panel de Render, nunca en el repositorio): `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRA_EN` y las de `backend/.env.example`. `PORT` lo pone Render.
5. **Atlas > Network Access:** permitir el acceso del servicio. Render no tiene IP fija en el plan gratuito, por lo que para la demo hay que permitir `0.0.0.0/0`; es un riesgo: rote la clave de la base despues y use un usuario de base con los permisos minimos.
6. Una vez publicado, abrir `https://<servicio>.onrender.com`: debe cargar el login. `https://<servicio>.onrender.com/api/salud` debe mostrar las dos bases en `true`.

## Cambios en la app movil
1. `mobile/src/app/config.ts`: poner `URL_SERVIDOR = 'https://<servicio>.onrender.com'`.
2. `mobile/capacitor.config.ts`: quitar `cleartext: true`; y en `mobile/android/app/src/main/AndroidManifest.xml` quitar `android:usesCleartextTraffic="true"`.
3. Recompilar: `cd mobile && npx ng build && npx cap sync` y generar el APK (`gradlew assembleDebug`).

## Advertencias
- El plan gratuito de Render duerme el servicio tras unos minutos sin uso: la primera consulta tarda cerca de un minuto. Abrir `/api/salud` antes de la demo.
- No se probo ningun despliegue real desde este proyecto; estos pasos son la ruta esperada.
- El administrador inicial se crea una vez con `npm run crear-admin` (variables `ADMIN_INICIAL_*`), ejecutado contra la misma base.
