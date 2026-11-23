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

## W4 · Login y layout
- El login es un formulario que llama a /api/auth/login y muestra el mensaje que devuelve el servidor, sin reescribirlo.
- Al entrar se pide el menu y el usuario; la ruta raiz lleva a la primera opcion permitida del perfil.
- El layout (barra, menu lateral, area de contenido) dibuja el menu con lo que dijo el servidor: no esta escrito en el codigo.
- Estilo segun el RNF: Helvetica para el texto, Garamond cursiva para titulos y colores calidos con contraste suficiente; en celular el menu pasa arriba.
- reportes y seguridad apuntan a "Proximamente" porque estan fuera del alcance acordado.

**P: ¿Que pasa si alguien escribe /seguridad en la barra sin permiso?** R: guardOpcion lo devuelve al inicio, y aunque se saltara, el servidor responde 403 en cada peticion.
**P: ¿Por que el mensaje de error viene del servidor?** R: Para que el texto (incluido el tiempo de bloqueo) viva en un solo lugar y no se desincronice con la regla real.

## W5 · CRUD en pantalla
- Una pantalla con la tabla de ciudadanos, filtro por estado, buscador y paginacion; el formulario de crear y editar y la confirmacion de eliminar aparecen debajo cuando se necesitan.
- Los botones Nuevo, Editar y Eliminar dependen de los permisos del menu que mando el servidor.
- El frontend no repite las reglas de validacion: muestra el mensaje del servidor (cedula duplicada, fecha invalida), asi hay una sola fuente de verdad.
- La cedula no se edita porque es la llave del registro; eliminar siempre confirma con nombre y cedula.
- Se probo de punta a punta en el navegador contra la API real, y los botones por permiso con pruebas unitarias.

**P: ¿Ocultar el boton Eliminar impide que alguien borre?** R: No; solo evita confusion. Quien llame a la API sin permiso recibe 403, probado en las pruebas del backend.
**P: ¿Por que la lista esta paginada?** R: Para no traer toda la base de golpe; el servidor limita a 100 por pagina y la pantalla pide 10.

## W6 · Cierre
- Se quitaron los datos de prueba del script de base de datos para que una base nueva nazca limpia.
- El archivo de ejemplo de variables se movio a backend/.env.example y se corrigieron los nombres para que coincidan con lo que lee el codigo; el .env real nunca se sube.
- El README explica como ejecutar y la bitacora, la API y los pendientes dejan constancia de decisiones y supuestos.
- Quedaron fuera, por decision de alcance: reportes PDF, gestion de usuarios, cifrado AES y la app movil.

**P: ¿Que hacen con las credenciales?** R: Viven solo en .env (ignorado por git), se leen con la funcion nativa de Node y se validan al arrancar; la clave de Atlas se rota y la app usa un usuario con permisos minimos.
**P: ¿Que quedo sin hacer y por que?** R: Reportes, gestion de usuarios, AES y la app movil; el plan priorizo login, permisos y CRUD, y lo demas esta documentado como alcance futuro.

## W8 · Rediseno sobrio
- Toda la apariencia sale de variables en :root de styles.css: cambiar la paleta es editar un bloque.
- Sin sombras, degradados ni animaciones de entrada; la unica transicion (botones) se desactiva si la persona pidio menos movimiento.
- Helvetica para el texto y Garamond cursiva para los titulos, como pide el requisito no funcional de interfaz.
- Las reglas de tabla, filtros y botones son globales para que cada pantalla nueva se vea igual sin repetir CSS.

**P: ¿Por que un solo color de acento?** R: Para un aspecto institucional y sobrio; el granate sirve para marca, boton principal y estado Requerido, y el resto es escala de piedra.
**P: ¿Como se cuida la accesibilidad?** R: Contraste de texto oscuro sobre papel claro, contorno de enfoque visible con teclado y respeto de prefers-reduced-motion.

## W7 · Reporte PDF
- El servidor arma el PDF con pdfmake a partir de una tabla declarativa; no se usa un navegador sin cabeza (Puppeteer), que seria mas pesado y fragil.
- Contenido: titulo, filtro aplicado, fecha y hora, total y la tabla; la columna Estado solo aparece con el filtro Todos.
- Si no hay ciudadanos para el filtro no se genera archivo: responde 404 con el mensaje del requisito. Un fallo interno se registra en consola y al usuario solo le llega el mensaje generico.
- La ruta exige sesion y permiso de lectura sobre reportes; el frontend pide el PDF con HttpClient para que el interceptor agregue el token.
- Diseno sobrio: fuente estandar del PDF, grises y el granate como unico acento.

**P: ¿Por que pdfmake y no Puppeteer?** R: pdfmake construye el PDF directamente desde datos, sin navegador; es mas liviano y su resultado es predecible.
**P: ¿Por que el frontend no abre el PDF con un enlace directo?** R: Un enlace no enviaria el token de sesion; con HttpClient el interceptor lo agrega y ademas se pueden mostrar los errores del servidor.

## M0 · Modelos de defensa
- La base "defensa" guarda lo de Fuerza Publica separado de los ciudadanos: rangos, personal autorizado, usuarios, claves temporales y consultas.
- Cada modelo replica el esquema de validacion que el script de la base ya impone; asi un error de tipo se detecta en el codigo y, si algo se escapara, tambien lo frena la base.
- El hash de la contrasena nunca sale en una respuesta (select false y toJSON).
- Las pruebas escriben en Atlas de verdad para comprobar que modelo y base coinciden.
- La coleccion de alertas no existe en el script de la base; se deja documentado y se crearia solo si se hace la parte opcional.

**P: ¿Por que dos bases separadas?** R: Los datos de ciudadanos (registraduria) y los de la fuerza publica (defensa) tienen duenos y permisos distintos; separarlos limita el dano si una se compromete.
**P: ¿Para que repetir las reglas en el modelo si la base ya valida?** R: Para dar mensajes claros al usuario y fallar antes de llegar a la base; la base es la ultima barrera.

## M1 · Login de Fuerza Publica y consulta
- Fuerza Publica tiene su propio login (/api/fp/login) contra la base defensa, con las mismas reglas del web: error unico, comparacion de tiempo constante y bloqueo de 15 minutos a los 3 intentos fallidos.
- El token lleva audiencia "fp": un token de administrador no sirve para consultar y uno de FP no abre rutas web; son dos puertas separadas.
- /api/consulta/:cedula devuelve el estado (Requerido / No requerido) y el nombre, o "No encontrado" sin nombre.
- Cada consulta se registra en la coleccion consultas (quien, que cedula, resultado); si no se puede registrar, no se entrega el dato.
- Una cuenta que se desactiva pierde el acceso al instante, aunque su token no haya vencido.

**P: ¿Por que un token distinto para Fuerza Publica?** R: Para que un token robado de un lado no abra el otro: la audiencia se verifica en cada peticion.
**P: ¿Para que sirve registrar consultas de cedulas que no existen?** R: Es auditoria: permite saber quien consulto que y detectar uso indebido, incluso de busquedas sin resultado.

## M2 · App movil
- App Android hecha con Ionic (interfaz) sobre Angular y Capacitor (puente nativo): tres pantallas, Login, Consulta y Resultado.
- Consulta lee el codigo de barras con la camara (ML Kit, formatos Code 128 y PDF417) y, si no se puede leer, ofrece digitar la identificacion.
- El resultado se muestra en grande para leerse de lejos: "Requerido" sobre fondo granate, "No requerido" o "No encontrado" con colores neutros, y siempre con el texto.
- La direccion del servidor esta en un solo archivo; el telefono debe estar en la misma red que el computador.
- Las peticiones salen por el HTTP nativo de Capacitor, asi no hay que abrir CORS en el servidor.

**P: ¿Por que Ionic y Capacitor y no una app nativa en Kotlin?** R: Reutiliza Angular y el equipo ya lo conoce; Capacitor da acceso a la camara y genera el APK con el mismo codigo web.
**P: ¿Es seguro enviar la clave por HTTP?** R: No; en desarrollo se permite trafico sin cifrar en la red local, y esta documentado como riesgo. En produccion la API debe ir por HTTPS y se quita esa excepcion.

