import { Router } from 'express';
import { login } from '../controllers/authController';

export const rutasAuth = Router();

rutasAuth.post('/login', login);

// Las rutas solo conectan una direccion con su controlador. Esta es publica (no lleva requiereSesion):
// por definicion, quien intenta ingresar todavia no tiene sesion. El prefijo /api/auth se pone en app.ts.