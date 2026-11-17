import type { ZodType } from 'zod';
import { ErrorApp } from './errores';

export function validar<T>(esquema: ZodType<T>, datos: unknown): T {
    const resultado = esquema.safeParse(datos);
    if (!resultado.success) {
        throw new ErrorApp(400, 'DATOS_INVALIDOS', resultado.error.issues.map((i) => i.message).join('. '));
    }
    return resultado.data;
}

// 1) Recibe un esquema de zod y los datos que llegaron en la peticion. Si cumplen, devuelve los datos ya
//    limpios y con su tipo; si no, lanza un ErrorApp 400 con todos los mensajes juntos.
// 2) Asi cada controlador valida en una sola linea y el manejador de errores responde con el formato comun.
// 3) Se valida en el servidor aunque el frontend tambien lo haga: el frontend lo puede saltar cualquiera con Postman.