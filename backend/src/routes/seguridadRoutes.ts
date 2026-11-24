import { Router } from 'express';
import { desbloquear, nuevoPerfil, nuevoUsuarioFp, nuevoUsuarioWeb, perfiles, permisos, rangos, usuarios } from '../controllers/seguridadController';
import { requiereSesion } from '../middlewares/autenticacion';
import { requierePermiso } from '../middlewares/permisos';

export const rutasSeguridad = Router();

rutasSeguridad.use(requiereSesion);
rutasSeguridad.get('/perfiles', requierePermiso('seguridad', 'leer'), perfiles);
rutasSeguridad.post('/perfiles', requierePermiso('seguridad', 'crear'), nuevoPerfil);
rutasSeguridad.put('/perfiles/:id/permisos', requierePermiso('seguridad', 'actualizar'), permisos);
rutasSeguridad.get('/rangos', requierePermiso('seguridad', 'leer'), rangos);
rutasSeguridad.get('/usuarios', requierePermiso('seguridad', 'leer'), usuarios);
rutasSeguridad.post('/usuarios', requierePermiso('seguridad', 'crear'), nuevoUsuarioWeb);
rutasSeguridad.post('/usuarios-fp', requierePermiso('seguridad', 'crear'), nuevoUsuarioFp);
rutasSeguridad.post('/usuarios/:tipo/:id/desbloquear', requierePermiso('seguridad', 'actualizar'), desbloquear);

// Todo exige sesion web y permiso sobre la opcion "seguridad". El prefijo /api/seguridad se pone en app.ts.
