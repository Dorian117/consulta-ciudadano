# Pendientes y supuestos

- **Documentos del Proyecto no disponibles en el repo.** ESTADO_PROYECTO.md, CONVENCIONES.md y RF_ConsultaCiudadano.md viven en el Proyecto de Claude y no estaban en el equipo ni en el repositorio al ejecutar las fases W0-W6. Se trabajo con el plan, el codigo existente y los comentarios de los archivos (que citan CONVENCIONES.md y el RF). Si CONVENCIONES.md contradice algo de lo hecho, gana CONVENCIONES.md: revisar y corregir.

## Lo hace Sergio a mano (no se hizo desde el codigo)
- **Rotar la clave de Atlas y crear un usuario de aplicacion con permisos minimos.** El archivo `backend/src/.env-example` que estaba en git no tenia marcas de ejemplo y pudo contener una cadena de conexion real: sigue en el historial de git. Rotar la clave cubre ese caso. Despues, actualizar `backend/.env`.
- **Borrar de Atlas los 4 ciudadanos de prueba** ("Prueba Uno" a "Prueba Cuatro", cedulas 1000000001 a 1000000004). Se quitaron del script `db/01_registraduria.js`, pero los que ya estaban cargados siguen en la base; se borran con el boton Eliminar de la pantalla. **No borrarlos antes de la demo:** son los 4 ciudadanos de la hoja `docs/codigos_barras.html` (y la prueba `hoja.test.ts` falla si desaparecen). No se borraron desde el codigo porque es una accion sobre la base compartida.
- Si se vuelve a correr `db/01_registraduria.js` en una base nueva, ya no crea ciudadanos de prueba.

## Supuestos tomados por defecto
- DELETE de ciudadano responde 200 con `{ mensaje }` (no 204); la lista responde `{ datos, total, pagina, limite }`.
- La cedula de un ciudadano no se puede cambiar (PUT).
- El token de sesion vive en sessionStorage (se pierde al cerrar la pestana). Alternativa: cookie httpOnly.
- La opcion `seguridad` del menu abre una pagina "Proximamente". `reportes` ya tiene su pantalla (W7).
- Los permisos se consultan en la base en cada peticion, no se guardan en el token.
- El frontend no tiene pruebas end-to-end automaticas; se verifico a mano en el navegador (ver BITACORA, W4 y W5).

## Fuera de esta entrega
Gestion de usuarios y perfiles (HU10), cifrado AES, backend `defensa` (login de Fuerza Publica, consultas, alertas) y la app movil. La tecnologia de la app (RF seccion 6, punto 7) sigue pendiente de decision del equipo: el plan propone una PWA Angular bajo `/movil`; si se exige app nativa, el plan no alcanza para el 23/11.

## App movil (opcion B: Ionic + Capacitor, Android)
- **Supuesto decidido por Sergio (23/11):** los codigos de barras se imprimen con un numero que emula la cedula (proyecto academico). Por eso se usan codigos lineales Code 128 y NO se interpreta el PDF417 binario de la cedula real. El lector acepta ambos formatos, pero solo usa el valor si son 6 a 10 digitos.
- La app movil se probo solo en el navegador; la camara, el lector real y el HTTP nativo hacia la IP del computador NO se han probado en un telefono.
- `mobile/src/app/config.ts` trae una IP de ejemplo (`192.168.1.50`): hay que cambiarla por la del computador antes de compilar.
- Trafico HTTP sin cifrar permitido (`cleartext: true`) solo para desarrollo en red local; en produccion se debe usar HTTPS y quitarlo.
- La digitacion manual aparece a los 10 s de abrir Consulta (el plugin abre su propia pantalla de lectura que no se puede cerrar por temporizador).
- No hay coleccion `alertas` en `db/02_defensa.js`; M5 (registro con clave temporal, alertas) no se hizo. El login FP no maneja `debeCambiarPassword`.
- **M4 (lo hace Sergio):** `cd mobile && npm install && npx ng build && npx cap add android && npx cap sync` y compilar el APK con Android Studio (`npx cap open android`).
