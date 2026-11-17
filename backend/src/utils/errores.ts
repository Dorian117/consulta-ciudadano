export class ErrorApp extends Error {
    readonly estado: number;
    readonly codigo: string;

    constructor(estado: number, codigo: string, mensaje: string) {
        super(mensaje);
        this.name = 'ErrorApp';
        this.estado = estado;
        this.codigo = codigo;
    }
}

// Un error "esperado" del negocio (credenciales malas, ciudadano no encontrado, sin permiso) se lanza con
//    throw new ErrorApp(404, 'CIUDADANO_NO_ENCONTRADO', 'mensaje en español').
// estado es el codigo HTTP, codigo es una etiqueta estable para que el frontend decida que hacer
//    sin depender del texto, y el mensaje es lo que se le muestra al usuario.
// Al extender Error se conserva la pila (stack) para depurar, y el manejador distingue estos errores
//    con instanceof de los fallos inesperados.