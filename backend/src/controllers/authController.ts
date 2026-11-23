import type { RequestHandler } from 'express';
import { z } from 'zod';
import { iniciarSesion } from '../services/authService';
import { validar } from '../utils/validar';

const texto = (nombre: string) =>
    z.string({ error: (i) => (i.input === undefined ? `${nombre} es obligatoria` : `${nombre} debe enviarse como texto`) });

const esquemaLogin = z.object(
    {
        cedula: texto('La identificación')
            .trim()
            .regex(/^[0-9]{6,10}$/, 'La identificación debe tener entre 6 y 10 dígitos'),
        contrasena: texto('La contraseña')
            .min(1, 'La contraseña es obligatoria')
            .max(128, 'La contraseña es demasiado larga'),
    },
    { error: 'El cuerpo debe ser un objeto JSON' },
);

export const login: RequestHandler = async (req, res) => {
    const { cedula, contrasena } = validar(esquemaLogin, req.body ?? {});
    const sesion = await iniciarSesion(cedula, contrasena);
    res.json(sesion);
};

// 1) El controlador solo hace tres cosas: validar lo que llega, llamar al servicio y responder.
//    La logica de negocio (bloqueos, hash, token) vive en authService
// 2) texto() crea mensajes en español para zod: distingue "falta el campo" de "llego con otro tipo"
//    (por ejemplo la cedula como numero, que debe ir como texto).
// 3) trim() quita espacios de la cedula antes de validar; la contraseña NO se recorta, porque los espacios
//    pueden ser parte de la clave.
// 4) La contraseña se limita a 128 caracteres para que nadie obligue al servidor a procesar textos enormes.
// 5) req.body ?? {}: en Express 5 el cuerpo es undefined si no llega JSON; asi se obtienen los mensajes de campos faltantes.