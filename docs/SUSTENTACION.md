# Sustentacion (preparacion para el profesor)

## W0 · Login
- El login recibe cedula y contrasena (campos en ASCII para evitar problemas de codificacion entre cliente y servidor).
- Se valida con zod en el controlador; la logica (hash, bloqueo, token) esta en el servicio.
- Cedula inexistente y clave errada responden exactamente lo mismo, y se compara contra un hash de relleno para que tarden igual: nadie puede averiguar que cedulas existen.
- A los 3 intentos fallidos la cuenta se bloquea 15 minutos (RF-07); el contador usa $inc, que es atomico.
- Las pruebas llaman a la API real con fetch sobre un puerto libre y limpian sus datos zz_test_.

**P: ¿Por que el mismo error si la cedula no existe?** R: Para no revelar que cedulas estan registradas (enumeracion de usuarios).
**P: ¿Como evitan que dos intentos simultaneos se salten el limite?** R: El contador se incrementa con $inc en MongoDB, una operacion atomica.

