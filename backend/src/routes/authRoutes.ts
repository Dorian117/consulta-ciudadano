import { Router } from 'express';
import { login, menu, yo } from '../controllers/authController';
import { requiereSesion } from '../middlewares/autenticacion';

export const rutasAuth = Router();

rutasAuth.post('/login', login);
rutasAuth.get('/yo', requiereSesion, yo);
rutasAuth.get('/menu', requiereSesion, menu);

// Las rutas solo conectan una direccion con su controlador. Esta es publica (no lleva requiereSesion):
// por definicion, quien intenta ingresar todavia no tiene sesion. El prefijo /api/auth se pone en app.ts.