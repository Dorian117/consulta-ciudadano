import { Router } from 'express';
import { actualizar, crear, eliminar, listar, obtener } from '../controllers/ciudadanoController';
import { requiereSesion } from '../middlewares/autenticacion';
import { requierePermiso } from '../middlewares/permisos';

export const rutasCiudadanos = Router();

rutasCiudadanos.use(requiereSesion);
rutasCiudadanos.post('/', requierePermiso('ciudadanos', 'crear'), crear);
rutasCiudadanos.get('/', requierePermiso('ciudadanos', 'leer'), listar);
rutasCiudadanos.get('/:cedula', requierePermiso('ciudadanos', 'leer'), obtener);
rutasCiudadanos.put('/:cedula', requierePermiso('ciudadanos', 'actualizar'), actualizar);
rutasCiudadanos.delete('/:cedula', requierePermiso('ciudadanos', 'eliminar'), eliminar);

// Todas las rutas exigen sesion (use) y cada una pide la accion que le corresponde sobre la opcion "ciudadanos".
// El prefijo /api/ciudadanos se pone en app.ts.
