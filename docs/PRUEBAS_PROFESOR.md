# Posibles pruebas del profesor (guion de demostracion)

Para cada una: que pedirian, como mostrarlo y estado real. "Probado" = hay prueba automatica o se verifico a mano; "No probado" = falta verificar antes de la entrega.

## Acceso y bloqueo
| Prueba | Como mostrarla | Estado |
|---|---|---|
| Clave incorrecta | Login web o app con clave mala: mensaje unico "Usuario o contraseña incorrectos" | Probado |
| 3 intentos fallidos = pausa de 15 min (web y app) | Fallar 3 veces; la 4a muestra bloqueo, incluso con la clave correcta | Probado (backend); en pantalla web/app no probado |
| Desbloquear para repetir la demo | Seguridad > Usuarios > Desbloquear | Probado (backend) |
| Sesion vencida | Token vencido devuelve SESION_VENCIDA y vuelve al login | Probado |
| Ruta protegida sin sesion | Abrir /ciudadanos sin login redirige a login; API da 401 | Probado |

## Permisos y roles
| Prueba | Como mostrarla | Estado |
|---|---|---|
| Admin edita permisos de otro rol | Seguridad > elegir rol > marcar casillas > Guardar | Probado (backend); pantalla no probada con admin real |
| El cambio se nota de inmediato | Con otro usuario conectado, quitar "leer" y refrescar: pierde la opcion y la API da 403 | Probado (backend) |
| Rol de Fuerza Publica | Quitar "consultar antecedentes": la app recibe 403 | Probado (backend); en el telefono no |
| El admin no puede quitarse permisos | Intentar editar Administrador: sale bloqueado | Probado |
| Crear rol nuevo y usuario con ese rol | Seguridad > Nuevo rol, luego Nuevo usuario | Probado (backend) |

## Usuarios
| Prueba | Como mostrarla | Estado |
|---|---|---|
| Crear usuario web | Seguridad > Nuevo usuario (Web); iniciar sesion con el | Probado (backend) |
| Crear usuario de Fuerza Publica | Tipo Fuerza Publica; iniciar sesion en la app | Probado (backend) |
| Cedula o correo repetido | Crear dos veces: error 409 claro | Probado |
| Clave debil | Menos de 6 caracteres o sin mayuscula/digito: rechazada | Probado |
| Las claves no se ven | Ninguna respuesta trae passwordHash; en la base solo hay hash bcrypt | Probado |

## Ciudadanos y reporte
| Prueba | Como mostrarla | Estado |
|---|---|---|
| Crear / editar / eliminar ciudadano | Pantalla Ciudadanos | Crear y eliminar probados; editar y filtro por estado no verificados en navegador |
| Validaciones (cedula, estatura, fecha futura) | Enviar datos malos | Probado |
| Cedula repetida | Mensaje "El número de identificación ya se encuentra registrado" | Probado |
| Reporte PDF por estado | Reportes > Generar PDF (Todos / Requerido / No requerido) | Contenido probado; aspecto visual no verificado |
| Reporte sin datos | Mensaje del requisito (404) | Probado |

## App movil
| Prueba | Como mostrarla | Estado |
|---|---|---|
| Escanear codigo de barras | Hoja docs/codigos_barras.html: 1000000002 y 1000000004 = Requerido; 1000000001 y 1000000003 = No requerido | No probado en telefono |
| Cedula inexistente | 3000000001: "No encontrado" | Probado en navegador; telefono no |
| Digitacion manual | Esperar 10 s o fallar la camara | Probado en navegador |
| Cada consulta queda registrada | Coleccion defensa.consultas | Probado |
| Token web no sirve en la app y al reves | Probado con audiencias separadas | Probado |

## Seguridad tecnica (preguntas de teoria)
- Inyeccion NoSQL: los datos pasan por zod y esquemas de Mongoose; un objeto en vez de texto se rechaza con 400.
- Por que bcrypt y 12 rondas, por que el mismo error para usuario inexistente y clave mala, por que hash de relleno.
- Por que JWT con audiencias distintas y permisos leidos de la base en cada peticion.
- Riesgos conocidos: HTTP sin cifrar en la red local (la version publicada debe ir por HTTPS), clave de Atlas pendiente de rotar, cifrado AES fuera de alcance.

## Antes de la entrega
1. Probar el APK en el telefono con los 6 codigos.
2. Ver la pantalla Seguridad con el administrador real y repetir el bloqueo de 3 intentos en la web.
3. Imprimir o abrir la hoja de codigos en el navegador y confirmar que dibuja.
4. No borrar los 4 ciudadanos "Prueba" (1000000001 a 1000000004) hasta despues de la demo.
