import type { RequestHandler } from 'express';
import { Opcion } from '../models/Opcion';
import { Perfil } from '../models/Perfil';
import { Permiso } from '../models/Permiso';
import { ErrorApp } from '../utils/errores';
import type { Accion } from '../services/menuService';

export function requierePermiso(codigoOpcion: string, accion: Accion): RequestHandler {
    return async (req, _res, next) => {
        if (!req.usuario) {
            throw new ErrorApp(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
        }
        const sinPermiso = () => new ErrorApp(403, 'SIN_PERMISO', 'No tiene permiso para realizar esta acción');

        const perfil = await Perfil.findById(req.usuario.perfilId);
        if (!perfil?.activo) throw sinPermiso();
        const opcion = await Opcion.findOne({ codigo: codigoOpcion });
        if (!opcion) throw sinPermiso();
        const permiso = await Permiso.findOne({ perfilId: perfil._id, opcionId: opcion._id });
        if (!permiso?.[accion]) throw sinPermiso();
        next();
    };
}

// 1) Se usa DESPUES de requiereSesion: rutas.get('/', requiereSesion, requierePermiso('ciudadanos', 'leer'), ...).
// 2) Sin sesion responde 401; con sesion pero sin permiso, 403 SIN_PERMISO. Perfil inactivo, opcion inexistente
//    o permiso ausente dan el mismo 403: por defecto todo esta denegado.
// 3) Los permisos se consultan en cada peticion (no van en el token): si el administrador cambia un permiso,
//    surte efecto de inmediato sin esperar a que venza la sesion.
