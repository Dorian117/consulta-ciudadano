import type { RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { Usuario } from '../models/Usuario';
import { ErrorApp } from '../utils/errores';
import { verificarToken } from '../utils/jwt';

export interface UsuarioSesion {
    id: string;
    cedula: string;
    perfilId: string;
}

declare global {
    namespace Express {
        interface Request {
            usuario?: UsuarioSesion;
        }
    }
}

const PREFIJO = 'Bearer ';

export const requiereSesion: RequestHandler = async (req, _res, next) => {
    const cabecera = req.headers.authorization;
    if (!cabecera?.startsWith(PREFIJO)) {
        throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
    }

    let carga;
    try {
        carga = verificarToken(cabecera.slice(PREFIJO.length).trim(), 'web');
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            throw new ErrorApp(401, 'SESION_VENCIDA', 'La sesión venció; inicie sesión de nuevo');
        }
        throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
    }

    const usuario = await Usuario.findById(carga.sub);
    if (!usuario || !usuario.activo) {
        throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
    }

    req.usuario = { id: usuario.id, cedula: usuario.cedula, perfilId: usuario.perfilId.toString() };
    next();
};

// 1) El token viaja en el encabezado Authorization con el formato "Bearer <token>".
// 2) Un token vencido responde SESION_VENCIDA (RF-07: "sesion vencida: se pide ingresar de nuevo");
//    cualquier otro problema (falta, alterado, de otra audiencia) responde el mismo NO_AUTENTICADO generico,
//    para no darle pistas a quien intenta falsificarlo.
// 3) Despues de verificar la firma se consulta el usuario en la base: si lo desactivaron o lo borraron,
//    el token deja de servir al instante aunque no haya vencido.
// 4) Si todo esta bien, el usuario queda en req.usuario para que los siguientes middlewares y controladores
//    sepan quien hace la peticion sin volver a leer el token.
// 5) declare global agrega el campo usuario al tipo Request de Express; sin eso TypeScript no lo reconoceria.