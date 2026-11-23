import type { RequestHandler } from 'express';
import { z } from 'zod';
import { consultarCiudadano } from '../services/consultaService';
import { iniciarSesionFp } from '../services/fpAuthService';
import { validar } from '../utils/validar';

const texto = (nombre: string) =>
    z.string({ error: (i) => (i.input === undefined ? `${nombre} es obligatoria` : `${nombre} debe enviarse como texto`) });

const cedula = texto('La identificación').trim().regex(/^[0-9]{6,10}$/, 'La identificación debe tener entre 6 y 10 dígitos');

const esquemaLogin = z.object(
    { cedula, contrasena: texto('La contraseña').min(1, 'La contraseña es obligatoria').max(128, 'La contraseña es demasiado larga') },
    { error: 'El cuerpo debe ser un objeto JSON' },
);

export const loginFp: RequestHandler = async (req, res) => {
    const { cedula, contrasena } = validar(esquemaLogin, req.body ?? {});
    res.json(await iniciarSesionFp(cedula, contrasena));
};

export const consulta: RequestHandler = async (req, res) => {
    res.json(await consultarCiudadano(req.usuarioFp!.id, validar(cedula, req.params.cedula)));
};

// Igual que los demas controladores: valida, llama al servicio y responde. La cedula consultada se valida igual que
// en la web (texto de 6 a 10 digitos): un valor mal formado no llega a la base ni se registra como consulta.
