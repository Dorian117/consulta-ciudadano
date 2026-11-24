# Bitacora de desarrollo

## Fase W0 · Base — 2026-11-22 20:15
- **Cambios:** `authController.ts` (campo `contrasena`), `authService.ts` (opcion `returnDocument` en lugar de `new`, deprecada), `package.json` (script `npm test`), nuevos `src/test/ayudas.ts` y `src/test/auth.test.ts`.
- **Decisiones:** el campo JSON pasa a ASCII por la regla 3 del plan. Las pruebas usan `app.listen(0)` y fetch real contra Atlas; los datos llevan prefijo `zz_test_` y se borran en `after()`. El bloqueo y el "mismo 401" se prueban con un usuario de prueba, nunca con el admin.
- **Verificado:** `app.ts` ya monta `/api/auth` antes de `rutaNoEncontrada`. `git pull`: ya estaba al dia.
- **Probar:** `cd backend && npm test`
- **Resultado real:** 6 pruebas, 6 pasan (login correcto 200, mismo 401, cuerpo vacio 400, cedula numerica 400, JSON_INVALIDO, bloqueo 423).
- **Pendiente:** ver docs/PENDIENTES.md.

## Fase W1 · Permisos y menu — 2026-11-22 20:18
- **Archivos:** nuevos `middlewares/permisos.ts`, `services/menuService.ts`, `test/permisos.test.ts`; cambiados `authController.ts` (yo, menu), `authRoutes.ts`, `test/ayudas.ts`, `package.json` (`--test-concurrency=1`).
- **Decisiones:** los permisos se consultan en la base en cada peticion (no van en el token) para que un cambio surta efecto al instante. Todo lo no concedido es 403 SIN_PERMISO. Las pruebas corren en serie porque limpiar() borra todo lo `zz_test_`; en paralelo un archivo borraba los datos del otro (fallo real que aparecio y se corrigio).
- **Probar:** `cd backend && npm test`
- **Resultado real:** 12 pruebas, 12 pasan (6 de W0 + 6 de W1). `tsc --noEmit` sin errores.
- **Pendiente:** el middleware se prueba con una mini app; se prueba con la API real en W2.

## Fase W2 · API de ciudadanos — 2026-11-22 20:19
- **Archivos:** nuevos `services/ciudadanoService.ts`, `controllers/ciudadanoController.ts`, `routes/ciudadanoRoutes.ts`, `test/ciudadanos.test.ts`; cambiado `app.ts` (monta `/api/ciudadanos`).
- **Rutas:** POST /, GET / (?estado, ?q, ?pagina, ?limite), GET /:cedula, PUT /:cedula, DELETE /:cedula; todas con sesion y permiso sobre la opcion `ciudadanos` (crear, leer, actualizar, eliminar).
- **Decisiones:** la cedula es texto de 6-10 digitos y no se puede cambiar en PUT; busqueda con regex escapado; limite maximo 100; respuesta de lista `{ datos, total, pagina, limite }`; DELETE responde 200 con mensaje (supuesto, no habia convencion visible).
- **Probar:** `cd backend && npm test`
- **Resultado real:** 20 pruebas, 20 pasan (W0 6, W1 6, W2 8). `tsc --noEmit` sin errores. Datos zz_test_ borrados al terminar.

## Fase W3 · Angular base y sesion — 2026-11-22 20:21
- **Compatibilidad:** `npm view @angular/cli` 22.3.0 declara node `^22.22.3 || ^24.15.0 || >=26.0.0`; el equipo usa Node 26.13, compatible. Proyecto creado con `ng new` (standalone, routing, CSS, sin SSR) dentro de `frontend/`.
- **Archivos:** `frontend/proxy.conf.json` (/api a localhost:3000) y `angular.json` (proxy y target de pruebas con vitest), `core/sesion.service.ts`, `core/sesion.interceptor.ts`, `core/sesion.guard.ts`, `core/sesion.spec.ts`, `app.config.ts`. Dependencias de desarrollo: vitest y jsdom.
- **Decisiones:** token en sessionStorage (ver riesgo en el comentario del servicio); el interceptor excluye el login; SESION_VENCIDA o NO_AUTENTICADO fuera del login cierran la sesion y llevan a /login con aviso.
- **Probar:** `cd frontend && npx ng test --watch=false`; con backend y `npx ng serve` corriendo: `curl localhost:4200/api/salud`.
- **Resultado real:** 3 pruebas pasan (token agregado y no al login, SESION_VENCIDA cierra sesion, puede()). Proxy comprobado: `/api/salud` por el puerto 4200 devolvio `{"estado":"OK","registraduria":true,"defensa":true}`.
- **Pendiente:** el guard no tiene prueba propia; se ejercita en W4 con el login real.

## Fase W4 · Login y layout — 2026-11-22 20:23
- **Archivos:** nuevos `login/login.ts` y `login.spec.ts`, `layout/layout.ts`, `paginas/paginas.ts` (Proximamente, SinAcceso), `ciudadanos/ciudadanos.ts` (marcador, se reemplaza en W5), `core/opcion.guard.ts`; cambiados `app.routes.ts`, `app.ts` (app.html y app.css de plantilla borrados), `index.html` (lang es), `styles.css` (Helvetica, Garamond cursiva, colores calidos).
- **Decisiones:** el login muestra el mensaje exacto del servidor; el menu se dibuja con `/api/auth/menu`; la ruta vacia redirige a la primera opcion del perfil o a /sin-acceso; reportes y seguridad quedan en pagina "Proximamente" (fuera de alcance). El menu pasa a fila superior en pantallas angostas.
- **Probar:** `cd frontend && npx ng test --watch=false`; con backend y `ng serve`, abrir http://localhost:4200.
- **Resultado real:** 5 pruebas pasan (3 de sesion + 2 de login); `ng build` sin errores. Verificado en el navegador con un usuario de prueba zz_test_ (no el admin): sin sesion redirige a /login; clave errada muestra "Usuario o contraseña incorrectos"; clave correcta entra a /ciudadanos con las 3 opciones del menu y el nombre y perfil en la barra.
- **Pendiente:** el usuario de prueba del navegador se borra al cerrar W5.

## Fase W5 · CRUD en pantalla — 2026-11-22 20:26
- **Archivos:** nuevos `ciudadanos/ciudadano.service.ts` y `ciudadanos.spec.ts`; `ciudadanos/ciudadanos.ts` reemplaza el marcador de W4. Backend: `ciudadanoController.ts` solo cambia el texto de los errores zod ("X: dato obligatorio" / "X: valor no valido", neutro en genero).
- **Decisiones:** una sola pantalla con tabla, filtros (estado y busqueda), paginacion de 10, formulario de crear/editar y confirmacion de eliminar. Botones Nuevo/Editar/Eliminar segun `sesion.puede()`. Cedula no editable. Los errores del servidor se muestran tal cual.
- **Probar:** `cd frontend && npx ng test --watch=false`; `cd backend && npm test`.
- **Resultado real:** frontend 8 pruebas pasan; backend 20 pasan; `ng build` y `tsc` sin errores. En el navegador, con usuario de prueba zz_test_ con todos los permisos: lista de 4 ciudadanos, formulario con fechas vacias mostro los errores del servidor, creacion (aparece "Ciudadano creado"), busqueda filtra a 1, eliminar pide confirmacion con nombre y cedula y borra. Usuario, perfil y permisos de prueba borrados al terminar.
- **No verificado en navegador:** el boton Editar y el filtro por estado (el PUT y el filtro si estan probados en la API, y el boton en la prueba unitaria de permisos); el comportamiento con un perfil de solo lectura se cubre en la prueba unitaria, no a mano.
- **Pendiente:** los 4 ciudadanos "Prueba Uno..Cuatro" del script 01 siguen en Atlas (ver W6).

## Fase W6 · Cierre — 2026-11-22 20:27
- **Cambios:** `db/01_registraduria.js` sin el bloque de datos de prueba; `backend/src/.env-example` eliminado y reemplazado por `backend/.env.example` con los nombres reales de variables que lee `env.ts` (MONGO_URI, PORT, JWT_SECRET, JWT_EXPIRA_EN, ADMIN_INICIAL_*) y valores de ejemplo; `README.md` con como ejecutar; nuevo `docs/API.md`; `docs/PENDIENTES.md` completo. El `.env` real no se leyo en ningun momento.
- **Hallazgo:** el `.env-example` viejo usaba MONGODB_URI (el codigo lee MONGO_URI) y no tenia marcas de ejemplo en su cadena de conexion; pudo ser real. Queda en el historial de git: ver PENDIENTES (rotar la clave).
- **Decision:** los 4 ciudadanos de prueba ya cargados en Atlas NO se borraron desde el codigo (accion sobre la base compartida); se quitan con el boton Eliminar o a mano.
- **Probar:** `cd backend && npm test`; `cd frontend && npx ng test --watch=false && npx ng build`.
- **Resultado real:** ver la verificacion final al pie de esta entrada.

- **Verificacion final:** backend `tsc` sin errores y 20 de 20 pruebas; frontend `ng build` sin errores y 8 de 8 pruebas.

## Fase W8 · Rediseno sobrio — 2026-11-23 10:58
- **Archivos:** `frontend/src/styles.css` (paleta piedra, granate y laton en variables, sin sombras ni degradados; reglas compartidas de tabla, filtros, botones y etiquetas), `login.ts` (dos paneles), `layout.ts` (barra clara con filete granate), `ciudadanos.ts` (sus estilos pasaron al CSS global), `index.html` (theme-color), `angular.json` (analytics desactivado).
- **Decisiones:** Helvetica y Garamond cursiva (RNF); el granate #5e1f2b es el unico acento; los estilos compartidos viven en styles.css para que las pantallas nuevas no repitan CSS.
- **Hecho antes en el chat** (capturas de escritorio y celular). **Verificado ahora:** `ng build` sin errores y `ng test` con las pruebas existentes pasando.
- **No verificado por mi:** el aspecto visual (no lo mire de nuevo).

## Fase W7 · Reporte PDF (HU04, RF-06) — 2026-11-23 10:58
- **Archivos:** backend nuevos `services/reporteService.ts`, `controllers/reporteController.ts`, `routes/reporteRoutes.ts`, `test/reportes.test.ts`; cambiados `ciudadanoService.ts` (ciudadanosPorEstado, sin paginar), `app.ts`, `test/ayudas.ts` (arrancar devuelve la URL). Dependencias: `pdfmake` 0.3.15 y `@types/pdfmake`. Frontend nuevos `reportes/reportes.ts` y `reportes.spec.ts`; `app.routes.ts` abre Reportes en lugar de "Proximamente".
- **Ruta:** `GET /api/reportes/ciudadanos?estado=Todos|Requerido|No requerido` (por defecto Todos), con sesion y permiso reportes/leer. PDF con titulo, filtro, fecha y hora (hora de Colombia), total, tabla Identificacion, Nombres, Apellidos (mas Estado si el filtro es Todos) y pie "Pagina x de y". Sin resultados: 404 SIN_RESULTADOS y no se genera archivo. Fallo al generar: 500 con el mensaje del requisito.
- **Decisiones:** pdfmake con fuente estandar Helvetica (no se incrusta ninguna); armarDocumento es pura para probar el contenido sin leer el PDF; el servicio recibe opcionalmente la funcion de lectura para probar 404 y 500 sin tocar datos reales; el PDF se descarga con un enlace temporal (abrir pestana despues de esperar lo bloquean los navegadores). Se bloquea la descarga de recursos de internet en pdfmake (setUrlAccessPolicy); la politica local NO se restringio porque pdfmake trata el nombre de la fuente estandar como archivo y falla (se probo y se revirtio).
- **Probar:** `cd backend && npm test`; `cd frontend && npx ng test --watch=false`.
- **Resultado real:** backend 26 pruebas pasan (6 nuevas: 401, 403, 200 con %PDF y tipo application/pdf, filtro invalido 400, 404, 500, filtro respetado); frontend 10 pasan; `tsc` y `ng build` sin errores. Se genero un PDF de muestra de 45 filas sin errores.
- **No verificado:** el aspecto visual del PDF (no pude renderizarlo: sin pdftoppm y el panel no abre PDF locales); el boton de la pantalla en el navegador contra el servidor real.
- **Pendiente:** pdfmake imprime en consola un aviso por no tener politica local; es inofensivo.

## Fase M0 · Modelos de la base defensa — 2026-11-23 11:01
- **Archivos:** `backend/src/models/defensa.ts` (Rango, PersonalActivo, UsuarioFp, ClaveTemporal, Consulta), `test/defensa.test.ts`; `test/ayudas.ts` (crearUsuarioFpPrueba y limpieza de datos FP).
- **Decisiones:** un modelo por coleccion de `db/02_defensa.js`, sobre `dbDefensa`, con los mismos limites del `$jsonSchema` (la base tiene additionalProperties false). `consultas` sin timestamps y `claves_temporales` solo con createdAt, como declara el script. `passwordHash` con select false y fuera de toJSON. **No hay modelo de alertas:** el script 02 no define esa coleccion (solo se necesitaria en M5).
- **Probar:** `cd backend && npm test`
- **Resultado real:** 30 pruebas pasan (4 nuevas). Las pruebas escriben en Atlas: la base acepto usuarios_fp, consultas y claves_temporales, y los datos invalidos se rechazaron. Comprobado que `db/02_defensa.js` ya estaba ejecutado en Atlas (rangos y personal de prueba presentes).
- **Pendiente:** el personal_activo de prueba (2000000001 a 2000000004) sigue en Atlas para M5.

## Fase M1 · Login de Fuerza Publica y consulta — 2026-11-23 11:03
- **Archivos:** nuevos `services/fpAuthService.ts`, `services/consultaService.ts`, `middlewares/autenticacionFp.ts`, `controllers/fpController.ts`, `routes/fpRoutes.ts`, `test/fp.test.ts`; cambiados `app.ts` (monta /api/fp y /api/consulta) y `utils/jwt.ts` (perfilId opcional: el token FP no lo lleva).
- **Rutas:** `POST /api/fp/login` (audiencia fp, error unico 401, 3 intentos = 423 por 15 min, cuenta debe estar "activa") y `GET /api/consulta/:cedula` (solo token fp; devuelve estado y nombres, o "No encontrado" sin nombre; registra cada consulta en defensa.consultas).
- **Decisiones:** la audiencia separa los tokens: el de administrador no consulta y el de FP no abre rutas web (probado). El registro de la consulta se espera antes de responder (sin rastro no se entrega el dato). La logica de bloqueo se repite en vez de compartirse con el login web (anotado como shortcut). El login responde 401 generico para cuenta pendiente. No se agrego CORS al servidor: la app movil usara HTTP nativo de Capacitor (ver M2).
- **Probar:** `cd backend && npm test`
- **Resultado real:** 40 pruebas pasan (10 nuevas de FP); `tsc` sin errores. Cubren login correcto, mismo 401, 400, bloqueo 423, 401 sin token y con token web, aislamiento de tokens, consulta Requerido / No requerido / No encontrado, cedula mal formada sin registro, registro de cada consulta, y cuenta desactivada pierde acceso.
- **Pendiente:** el login no maneja aun `debeCambiarPassword` (cambio de clave en primer ingreso, M5 opcional).

## Fase M2 · App movil (Ionic + Capacitor, Android) — 2026-11-23 11:08
- **Archivos:** nuevo proyecto en `mobile/` (Angular 22 con Ionic Angular 9.0.13, Capacitor 8.6.2 y `@capacitor-mlkit/barcode-scanning` 8.2.2): `capacitor.config.ts`, `proxy.conf.json`, `src/app/config.ts` (unica direccion del servidor), `servicios/api.service.ts`, `servicios/sesion.ts` (interceptor y guard), pantallas `login`, `consulta` y `resultado`, `styles.css` (mismo estilo sobrio de la web), `movil.spec.ts`.
- **Decisiones:** (1) En Ionic 9 los componentes se importan de `@ionic/angular` (ya no de `/standalone`). (2) La URL del servidor vive solo en `config.ts`; en el navegador se usan rutas relativas con el proxy de desarrollo. (3) `CapacitorHttp` activo: el telefono usa HTTP nativo y no hace falta CORS en el servidor. (4) `cleartext: true` permite HTTP sin cifrar en la red local, solo desarrollo (riesgo documentado en el archivo). (5) Lector con formatos Code 128 y PDF417; solo se acepta un valor de 6 a 10 digitos. (6) Digitacion manual a los 10 s de abrir Consulta o de inmediato si el lector falla o lee otra cosa (el plugin abre pantalla nativa propia, que no se puede cerrar a los 10 s; ver comentario en `consulta.ts`). (7) Resultado a pantalla completa: granate para Requerido, claro para No requerido, gris para No encontrado, siempre con el texto grande.
- **Probar:** `cd mobile && npx ng test --watch=false && npx ng build`; en el navegador: backend en marcha y `npm start` (puerto 4200 por defecto).
- **Resultado real:** 8 pruebas pasan (validacion de cedula, login con token y Bearer, SESION_VENCIDA, mensaje del servidor, plazo de 10 s, codigo invalido, codigo valido va a Resultado, fallo de camara); `ng build` sin errores. Verificado a mano en el navegador con vista de celular y un usuario FP `zz_test_`: clave errada muestra el mensaje del servidor, clave correcta entra a Consulta, el boton Escanear (sin camara en el navegador) avisa y abre la digitacion, y consultar un ciudadano requerido muestra "Requerido" en grande con el nombre. Datos de prueba borrados.
- **NO verificado:** nada de lo que depende del telefono: la camara y el lector real, el HTTP nativo hacia la IP del computador, el permiso de trafico sin cifrar, y la apariencia en Android. `npx cap add android` y el APK no se hicieron (M4, lo hace Sergio con Android Studio).
- **Pendiente:** cambiar `URL_SERVIDOR` en `mobile/src/app/config.ts` por la IP real del computador antes de compilar.

## Fase M3 · Hoja de codigos de barras — 2026-11-23 11:12
- **Archivos:** nuevos `docs/codigos_barras.html`, `docs/vendor/JsBarcode.all.min.js` (JsBarcode 3.12.3, MIT, para imprimir sin internet) y `backend/src/test/hoja.test.ts`; README y PENDIENTES actualizados (seccion de app movil y pasos de M4).
- **Contenido:** 6 tarjetas Code 128 en SVG: 1000000001 a 1000000004 (los ciudadanos de prueba: 2 Requerido y 2 No requerido) y 3000000001, 3000000002 que no existen (esperado: No encontrado). Cada tarjeta trae el resultado esperado. Hoja A4 con estilo de impresion.
- **Probar:** `cd backend && npm test`; para imprimir, abrir `docs/codigos_barras.html` en el navegador.
- **Resultado real:** 43 pruebas del backend pasan (3 nuevas): la hoja tiene 4 + 2 casos, la libreria incluida codifica las 6 identificaciones en Code 128, y lo que promete cada tarjeta coincide con la base real de Atlas.
- **NO verificado:** el dibujo de los codigos en un navegador. Intente verlo en el panel de vista previa, que no pudo cargar el script relativo; un servidor local improvisado para abrirlo por http fue bloqueado por el entorno y no lo reintente. Tampoco se escaneo ninguno con un telefono.
- **Pendiente:** abrir la hoja en el navegador antes de imprimir; si un codigo no aparece, es un problema de carga del script `vendor/JsBarcode.all.min.js`.


## Fase W9 · Seguridad: roles, permisos y usuarios — 2026-11-24
- **Archivos:** nuevos `backend/src/services/seguridadService.ts`, `controllers/seguridadController.ts`, `routes/seguridadRoutes.ts`, `test/seguridad.test.ts`, `frontend/src/app/seguridad/seguridad.ts` y su `.spec.ts`; cambiados `app.ts` (monta /api/seguridad), `menuService.ts` (oculta la opcion de FP), `middlewares/autenticacionFp.ts` y `routes/fpRoutes.ts` (la consulta movil exige permiso), `scripts/crearAdmin.ts` (crea el rol Fuerza Publica) y `app.routes.ts` (la opcion Seguridad ya no es "Proximamente").
- **Que hace:** (1) el administrador edita los permisos (crear, leer, actualizar, eliminar) de cualquier rol, tanto los de la web (Registraduria) como el de Fuerza Publica, cuyo unico permiso es consultar desde la app movil; (2) crea roles nuevos; (3) crea usuarios web y usuarios de Fuerza Publica que ya pueden iniciar sesion; (4) ve la lista de usuarios y desbloquea una cuenta bloqueada. El bloqueo de 3 intentos fallidos por 15 minutos ya existia en web y FP (W2/M1) y ahora tiene prueba de punta a punta.
- **Decisiones:** el rol Administrador esta protegido (no se puede quitar permisos: se bloquearia a si mismo). Marcar crear/actualizar/eliminar activa leer solo, porque sin leer no aparece en el menu. Los usuarios FP comparten un rol; no hay permisos por persona. Los rangos vienen del catalogo de la base. Un usuario FP creado por el administrador nace activo y con clave definida.
- **Probar:** `cd backend && npm test`; `cd frontend && npx ng test --watch=false`; en la web, opcion Seguridad con el administrador.
- **Resultado real:** 52 pruebas del backend (9 nuevas) y 13 del frontend pasan. Cubren 401/403, permisos por rol con efecto inmediato en el menu, rol protegido, opciones invalidas, contraseña debil, cedula duplicada, usuario FP que inicia sesion y consulta, quitar y devolver el permiso de consulta al rol FP, bloqueo a los 3 intentos y desbloqueo (web y FP).
- **NO verificado:** la pantalla de Seguridad en el navegador con un administrador real (solo pruebas automaticas con datos simulados); el cambio de permisos de FP desde el telefono.
- **Pendiente:** editar o desactivar usuarios ya creados, cambiar la clave, y registro de FP con clave temporal (M5).
