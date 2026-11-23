import { Router } from 'express';
import { reporteCiudadanos } from '../controllers/reporteController';
import { requiereSesion } from '../middlewares/autenticacion';
import { requierePermiso } from '../middlewares/permisos';

export const rutasReportes = Router();

rutasReportes.get('/ciudadanos', requiereSesion, requierePermiso('reportes', 'leer'), reporteCiudadanos);

// Exige sesion y permiso de lectura sobre la opcion "reportes". El prefijo /api/reportes se pone en app.ts.
