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

