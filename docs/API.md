# API

Errores siempre con el formato `{ "error": { "codigo": "...", "mensaje": "..." } }`.
Con sesión: encabezado `Authorization: Bearer <token>`.

| Método y ruta | Sesión | Permiso | Respuesta |
|---|---|---|---|
| `GET /api/salud` | no | — | estado del servidor y de las dos bases |
| `POST /api/auth/login` `{ cedula, contrasena }` | no | — | 200 `{ token, usuario }`; 401 `CREDENCIALES_INVALIDAS`; 423 `CUENTA_BLOQUEADA` (3 intentos, 15 min); 400 `DATOS_INVALIDOS` / `JSON_INVALIDO` |
| `GET /api/auth/yo` | sí | — | `{ cedula, nombres, perfil }` |
| `GET /api/auth/menu` | sí | — | opciones con `leer: true`, ordenadas, con sus 4 permisos |
| `GET /api/reportes/ciudadanos?estado=Todos, Requerido o No requerido` | sí | reportes / leer | PDF (`application/pdf`); 404 `SIN_RESULTADOS`; 500 `ERROR_PDF` |
| `POST /api/fp/login` `{ cedula, contrasena }` | no | — | Fuerza Pública: 200 `{ token, usuario }` (token con audiencia `fp`); 401 `CREDENCIALES_INVALIDAS`; 423 `CUENTA_BLOQUEADA` (3 intentos, 15 min) |
| `GET /api/consulta/:cedula` | sí (token `fp`) | rol Fuerza Pública / consultaFp | `{ cedula, estado, nombres, apellidos }`; si no existe `{ cedula, estado: "No encontrado" }`; registra la consulta en `defensa.consultas`; 400 si la cédula no es de 6 a 10 dígitos |
| `GET /api/seguridad/perfiles` | sí | seguridad / leer | roles con sus permisos por opción (Fuerza Pública solo `consultaFp`) |
| `POST /api/seguridad/perfiles` `{ nombre }` | sí | seguridad / crear | 201 rol nuevo sin permisos; 409 si ya existe |
| `PUT /api/seguridad/perfiles/:id/permisos` `{ permisos: [{ codigo, crear, leer, actualizar, eliminar }] }` | sí | seguridad / actualizar | 200; 409 `PERFIL_PROTEGIDO` (Administrador); 400 opción que no corresponde al rol |
| `GET /api/seguridad/usuarios`, `GET /api/seguridad/rangos` | sí | seguridad / leer | usuarios web y FP (sin claves); catálogo de rangos |
| `POST /api/seguridad/usuarios` `{ cedula, nombres, correo, contrasena, perfilId }` | sí | seguridad / crear | 201 usuario web; 409 cédula o correo duplicados; 400 clave débil |
| `POST /api/seguridad/usuarios-fp` `{ cedula, nombres, apellidos, correo, contrasena, fuerza, rango, idFuerza }` | sí | seguridad / crear | 201 usuario FP activo; 400 rango inexistente |
| `POST /api/seguridad/usuarios/:tipo/:id/desbloquear` (`web` o `fp`) | sí | seguridad / actualizar | quita el bloqueo por intentos fallidos |
| `POST /api/ciudadanos` | sí | ciudadanos / crear | 201 ciudadano; 409 `CEDULA_DUPLICADA` |
| `GET /api/ciudadanos?estado=&q=&pagina=&limite=` | sí | ciudadanos / leer | `{ datos, total, pagina, limite }` (límite máximo 100) |
| `GET /api/ciudadanos/:cedula` | sí | ciudadanos / leer | ciudadano; 404 `CIUDADANO_NO_ENCONTRADO` |
| `PUT /api/ciudadanos/:cedula` | sí | ciudadanos / actualizar | ciudadano actualizado (la cédula no cambia) |
| `DELETE /api/ciudadanos/:cedula` | sí | ciudadanos / eliminar | `{ mensaje }` |

Otros códigos: 401 `NO_AUTENTICADO` / `SESION_VENCIDA`, 403 `SIN_PERMISO`, 404 `RUTA_NO_ENCONTRADA`.
La cédula es texto de 6 a 10 dígitos. Estados válidos: `Requerido`, `No requerido`.
