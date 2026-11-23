# API

Errores siempre con el formato `{ "error": { "codigo": "...", "mensaje": "..." } }`.
Con sesión: encabezado `Authorization: Bearer <token>`.

| Método y ruta | Sesión | Permiso | Respuesta |
|---|---|---|---|
| `GET /api/salud` | no | — | estado del servidor y de las dos bases |
| `POST /api/auth/login` `{ cedula, contrasena }` | no | — | 200 `{ token, usuario }`; 401 `CREDENCIALES_INVALIDAS`; 423 `CUENTA_BLOQUEADA` (3 intentos, 15 min); 400 `DATOS_INVALIDOS` / `JSON_INVALIDO` |
| `GET /api/auth/yo` | sí | — | `{ cedula, nombres, perfil }` |
| `GET /api/auth/menu` | sí | — | opciones con `leer: true`, ordenadas, con sus 4 permisos |
| `POST /api/ciudadanos` | sí | ciudadanos / crear | 201 ciudadano; 409 `CEDULA_DUPLICADA` |
| `GET /api/ciudadanos?estado=&q=&pagina=&limite=` | sí | ciudadanos / leer | `{ datos, total, pagina, limite }` (límite máximo 100) |
| `GET /api/ciudadanos/:cedula` | sí | ciudadanos / leer | ciudadano; 404 `CIUDADANO_NO_ENCONTRADO` |
| `PUT /api/ciudadanos/:cedula` | sí | ciudadanos / actualizar | ciudadano actualizado (la cédula no cambia) |
| `DELETE /api/ciudadanos/:cedula` | sí | ciudadanos / eliminar | `{ mensaje }` |

Otros códigos: 401 `NO_AUTENTICADO` / `SESION_VENCIDA`, 403 `SIN_PERMISO`, 404 `RUTA_NO_ENCONTRADA`.
La cédula es texto de 6 a 10 dígitos. Estados válidos: `Requerido`, `No requerido`.
