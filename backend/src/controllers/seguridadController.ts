import type { RequestHandler } from 'express';
import { z } from 'zod';
import { FUERZAS } from '../models/defensa';
import {
    crearPerfil, crearUsuarioFp, crearUsuarioWeb, desbloquearUsuario, guardarPermisos, listarPerfiles, listarRangos, listarUsuarios,
} from '../services/seguridadService';
import { cumplePolitica, MENSAJE_POLITICA_CONTRASEÑA } from '../utils/contraseña';
import { validar } from '../utils/validar';

const cuerpo = { error: 'El cuerpo debe ser un objeto JSON' };
const texto = (n: string, max = 80) =>
    z.string({ error: `${n}: dato obligatorio` }).trim().min(1, `${n}: dato obligatorio`).max(max, `${n} no puede superar ${max} caracteres`);
const cedula = z.string({ error: 'La cédula debe enviarse como texto' }).trim().regex(/^[0-9]{6,10}$/, 'La cédula debe tener entre 6 y 10 dígitos');
const correo = z.string({ error: 'El correo es obligatorio' }).trim().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'El correo no tiene un formato válido');
const contrasena = z.string({ error: 'La contraseña es obligatoria' }).refine(cumplePolitica, MENSAJE_POLITICA_CONTRASEÑA);
const id = z.string().regex(/^[a-f0-9]{24}$/, 'El identificador no es válido');

const esquemaPerfil = z.object(
    { nombre: texto('El nombre').min(3, 'El nombre debe tener al menos 3 caracteres'), descripcion: texto('La descripción', 200).optional() },
    cuerpo,
);
const esquemaPermisos = z.object(
    {
        permisos: z.array(
            z.object({ codigo: z.string(), crear: z.boolean(), leer: z.boolean(), actualizar: z.boolean(), eliminar: z.boolean() }),
            { error: 'Los permisos deben enviarse como lista' },
        ),
    },
    cuerpo,
);
const esquemaWeb = z.object({ cedula, nombres: texto('Los nombres', 120), correo, contrasena, perfilId: id }, cuerpo);
const esquemaFp = z.object(
    {
        cedula, nombres: texto('Los nombres'), apellidos: texto('Los apellidos'), correo, contrasena,
        fuerza: z.enum(FUERZAS, { error: 'La fuerza no es válida' }),
        rango: texto('El rango', 60),
        idFuerza: texto('El identificador de fuerza', 20).min(3, 'El identificador de fuerza debe tener al menos 3 caracteres'),
    },
    cuerpo,
);

export const perfiles: RequestHandler = async (_req, res) => void res.json(await listarPerfiles());

export const nuevoPerfil: RequestHandler = async (req, res) => {
    const d = validar(esquemaPerfil, req.body ?? {});
    res.status(201).json(await crearPerfil(d.nombre, d.descripcion));
};

export const permisos: RequestHandler = async (req, res) => {
    await guardarPermisos(validar(id, req.params.id), validar(esquemaPermisos, req.body ?? {}).permisos);
    res.json({ mensaje: 'Permisos actualizados' });
};

export const rangos: RequestHandler = async (_req, res) => void res.json(await listarRangos());

export const usuarios: RequestHandler = async (_req, res) => void res.json(await listarUsuarios());

export const nuevoUsuarioWeb: RequestHandler = async (req, res) => {
    res.status(201).json(await crearUsuarioWeb(validar(esquemaWeb, req.body ?? {})));
};

export const nuevoUsuarioFp: RequestHandler = async (req, res) => {
    res.status(201).json(await crearUsuarioFp(validar(esquemaFp, req.body ?? {})));
};

export const desbloquear: RequestHandler = async (req, res) => {
    await desbloquearUsuario(validar(z.enum(['web', 'fp']), req.params.tipo), validar(id, req.params.id));
    res.json({ mensaje: 'Usuario desbloqueado' });
};

// Mismo patron de los demas controladores: valida con zod, llama al servicio y responde. La contraseña se valida
// con la politica del sistema (6+ caracteres, mayuscula, minuscula y digito) y nunca se devuelve en las respuestas.
