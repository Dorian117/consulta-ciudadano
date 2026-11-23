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

## W2 · API de ciudadanos
- CRUD completo bajo /api/ciudadanos, en capas: ruta (permiso), controlador (validacion zod), servicio (logica y base de datos).
- Cada verbo exige su permiso: POST=crear, GET=leer, PUT=actualizar, DELETE=eliminar.
- La lista admite filtro por estado (Requerido / No requerido), busqueda por cedula, nombres o apellidos, y paginacion con tope de 100.
- La cedula se guarda como texto para no perder ceros a la izquierda; el indice unico de la base impide duplicados y el error se convierte en 409 CEDULA_DUPLICADA.
- Los errores salen siempre como { error: { codigo, mensaje } } desde un solo manejador.

**P: ¿Por que la cedula es texto y no numero?** R: Un numero pierde ceros a la izquierda y no es un valor con el que se calcule; es un identificador.
**P: ¿Como evitan que la busqueda sea un riesgo?** R: El texto se escapa antes de armar la expresion regular y el limite de pagina es maximo 100.

## W3 · Angular base y sesion
- Angular 22 es compatible con Node 26 (su campo engines lo declara); se verifico antes de crear el proyecto.
- El proxy del servidor de desarrollo reenvia /api al backend (puerto 3000): el navegador ve un solo origen y no hace falta CORS.
- SesionService guarda el token y el usuario en signals; el menu que manda el servidor decide que botones se ven.
- El interceptor pone Authorization: Bearer en cada peticion y, si el servidor dice SESION_VENCIDA, cierra la sesion y vuelve al login.
- El guard de rutas impide entrar sin sesion y restaura usuario y menu si se recarga la pagina.

**P: ¿Por que un proxy y no CORS?** R: Con el proxy el frontend y la API parecen del mismo origen en desarrollo; evita abrir CORS en el servidor, que seria una puerta mas.
**P: ¿Donde guardan el token y que riesgo tiene?** R: En sessionStorage (se pierde al cerrar la pestana). Un script malicioso podria leerlo; la alternativa es una cookie httpOnly, que requiere cambios en el backend.

