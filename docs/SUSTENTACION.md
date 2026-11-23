# Sustentacion (preparacion para el profesor)

## W0 · Login
- El login recibe cedula y contrasena (campos en ASCII para evitar problemas de codificacion entre cliente y servidor).
- Se valida con zod en el controlador; la logica (hash, bloqueo, token) esta en el servicio.
- Cedula inexistente y clave errada responden exactamente lo mismo, y se compara contra un hash de relleno para que tarden igual: nadie puede averiguar que cedulas existen.
- A los 3 intentos fallidos la cuenta se bloquea 15 minutos (RF-07); el contador usa $inc, que es atomico.
- Las pruebas llaman a la API real con fetch sobre un puerto libre y limpian sus datos zz_test_.

**P: ¿Por que el mismo error si la cedula no existe?** R: Para no revelar que cedulas estan registradas (enumeracion de usuarios).
**P: ¿Como evitan que dos intentos simultaneos se salten el limite?** R: El contador se incrementa con $inc en MongoDB, una operacion atomica.

## W1 · Permisos y menu
- Un perfil tiene permisos (crear, leer, actualizar, eliminar) sobre cada opcion; es la relacion muchos a muchos de la coleccion permisos.
- requierePermiso(opcion, accion) se pone en cada ruta despues de requiereSesion: 401 sin sesion, 403 SIN_PERMISO sin permiso.
- obtenerMenu devuelve solo las opciones con leer: true, ordenadas, y con los 4 permisos para que la pantalla oculte botones.
- Los permisos se leen de la base en cada peticion, no del token: si se quita un permiso, deja de valer de inmediato.
- /api/auth/yo y /api/auth/menu alimentan la pantalla despues del login.

**P: ¿Por que no guardan los permisos dentro del token?** R: Porque el token no se puede revocar; con la consulta en cada peticion un cambio de permisos aplica al instante.
**P: ¿Ocultar un boton es suficiente seguridad?** R: No. Ocultar es comodidad; la seguridad real es requierePermiso en el servidor.

