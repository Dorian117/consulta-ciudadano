import { Router } from 'express';
import { consulta, loginFp } from '../controllers/fpController';
import { requiereSesionFp } from '../middlewares/autenticacionFp';

export const rutasFp = Router();
rutasFp.post('/login', loginFp);

export const rutasConsulta = Router();
rutasConsulta.get('/:cedula', requiereSesionFp, consulta);

// /api/fp/login es publica (quien intenta ingresar aun no tiene sesion). /api/consulta/:cedula exige un token
// de audiencia "fp". Los prefijos se ponen en app.ts.
