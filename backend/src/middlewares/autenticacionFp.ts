import type { RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { UsuarioFp } from '../models/defensa';
import { ErrorApp } from '../utils/errores';
import { verificarToken } from '../utils/jwt';

declare global {
    namespace Express {
        interface Request {
            usuarioFp?: { id: string; cedula: string };
        }
    }
}

export const requiereSesionFp: RequestHandler = async (req, _res, next) => {
    const cabecera = req.headers.authorization;
    if (!cabecera?.startsWith('Bearer ')) throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');

    let carga;
    try {
        carga = verificarToken(cabecera.slice(7).trim(), 'fp');
    } catch (error) {
        if (error instanceof TokenExpiredError) throw new ErrorApp(401, 'SESION_VENCIDA', 'La sesión venció; inicie sesión de nuevo');
        throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
    }

    const usuario = await UsuarioFp.findById(carga.sub);
    if (!usuario || usuario.estadoCuenta !== 'activa') throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');

    req.usuarioFp = { id: usuario.id, cedula: usuario.cedula };
    next();
};

// Igual que requiereSesion (web) pero exige audiencia "fp": un token del sistema web (administradores) NO sirve para
// consultar antecedentes, y uno de Fuerza Publica no abre las rutas web. Tras verificar la firma se consulta la cuenta:
// si la desactivaron o bloquearon, el token deja de servir aunque no haya vencido.
