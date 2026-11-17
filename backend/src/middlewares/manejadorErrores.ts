import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { Error as ErrorMongoose } from 'mongoose';
import { ErrorApp } from '../utils/errores';

const DUPLICADOS: Record<string, { codigo: string; mensaje: string }> = {
    cedula: { codigo: 'CEDULA_DUPLICADA', mensaje: 'Error: El número de identificación ya se encuentra registrado' },
    correo: { codigo: 'CORREO_DUPLICADO', mensaje: 'Error: El correo electrónico ya se encuentra registrado' },
};

function responder(res: Response, estado: number, codigo: string, mensaje: string): void {
    res.status(estado).json({ error: { codigo, mensaje } });
}

export const rutaNoEncontrada: RequestHandler = (_req, _res, next) => {
    next(new ErrorApp(404, 'RUTA_NO_ENCONTRADA', 'La ruta solicitada no existe'));
};

export const manejadorErrores: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error instanceof ErrorApp) {
        responder(res, error.estado, error.codigo, error.message);
        return;
    }
    if (error instanceof ErrorMongoose.ValidationError) {
        const mensajes = Object.values(error.errors).map((e) => e.message);
        responder(res, 400, 'DATOS_INVALIDOS', mensajes.join('. '));
        return;
    }
    if (error instanceof ErrorMongoose.CastError) {
        responder(res, 400, 'DATOS_INVALIDOS', `El valor del campo ${error.path} no es válido`);
        return;
    }
    if (error?.code === 11000) {
        const campo = Object.keys(error.keyPattern ?? {})[0] ?? '';
        const duplicado = DUPLICADOS[campo] ?? { codigo: 'REGISTRO_DUPLICADO', mensaje: 'Error: El registro ya existe' };
        responder(res, 409, duplicado.codigo, duplicado.mensaje);
        return;
    }
    if (error?.type === 'entity.parse.failed') {
        responder(res, 400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido');
        return;
    }
    console.error('Error no controlado:', error);
    responder(res, 500, 'ERROR_INTERNO', 'Error interno del servidor');
};

// 1) Es el UNICO lugar que decide como se ve un error hacia afuera: siempre { error: { codigo, mensaje } },
//    el formato que fija CONVENCIONES.md. Los controladores solo lanzan errores, nunca arman respuestas de error.
// 2) Express reconoce un manejador de errores porque tiene cuatro parametros (error, req, res, next).
// 3) En Express 5, si una funcion async lanza un error, llega aqui sin try/catch.
// 4) El 11000 es el error de indice unico de MongoDB; keyPattern dice cual campo se repitio (cedula o correo),
//    asi no hace falta que cada servicio capture el duplicado por su cuenta.
// 5) Cualquier error desconocido responde 500 generico y se registra en consola: la pila y los detalles
//    internos (nombres de colecciones, consultas) nunca se envian al cliente.