import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ESTADOS_CIUDADANO, GENEROS, GRUPOS_SANGUINEOS } from '../models/Ciudadano';
import {
    actualizarCiudadano,
    crearCiudadano,
    eliminarCiudadano,
    listarCiudadanos,
    obtenerCiudadano,
} from '../services/ciudadanoService';
import { validar } from '../utils/validar';

const obligatorio = (nombre: string) => ({
    error: (i: { input?: unknown }) => (i.input === undefined ? `${nombre} es obligatorio` : `${nombre} no es válido`),
});
const texto = (nombre: string) => z.string(obligatorio(nombre)).trim().min(1, `${nombre} es obligatorio`).max(80, `${nombre} no puede superar 80 caracteres`);
const fecha = (nombre: string) => z.coerce.date(obligatorio(nombre));

const cedula = z
    .string({ error: 'La cédula debe enviarse como texto' })
    .trim()
    .regex(/^[0-9]{6,10}$/, 'La cédula debe tener entre 6 y 10 dígitos');

const campos = {
    nombres: texto('Los nombres').min(2, 'Los nombres deben tener al menos 2 caracteres'),
    apellidos: texto('Los apellidos'),
    fechaNacimiento: fecha('La fecha de nacimiento').refine((d) => d <= new Date(), 'La fecha de nacimiento no puede ser futura'),
    lugarNacimiento: texto('El lugar de nacimiento'),
    genero: z.enum(GENEROS, { error: 'El género debe ser M o F' }),
    fechaExpedicion: fecha('La fecha de expedición'),
    lugarExpedicion: texto('El lugar de expedición'),
    grupoSanguineo: z.enum(GRUPOS_SANGUINEOS, { error: 'El grupo sanguíneo no es válido' }),
    estatura: z.number({ error: 'La estatura debe ser un número' }).min(0.5, 'La estatura mínima es 0,5 m').max(2.5, 'La estatura máxima es 2,5 m'),
    estado: z.enum(ESTADOS_CIUDADANO, { error: 'El estado debe ser Requerido o No requerido' }),
};
const cuerpo = { error: 'El cuerpo debe ser un objeto JSON' };
const esquemaCrear = z.object({ cedula, ...campos }, cuerpo);
const esquemaActualizar = z.object(campos, cuerpo);

const esquemaLista = z.object({
    estado: z.enum(ESTADOS_CIUDADANO, { error: 'El filtro de estado debe ser Requerido o No requerido' }).optional(),
    q: z.string().trim().max(80, 'La búsqueda es demasiado larga').optional(),
    pagina: z.coerce.number({ error: 'La página debe ser un número' }).int().min(1, 'La página mínima es 1').default(1),
    limite: z.coerce.number({ error: 'El límite debe ser un número' }).int().min(1).max(100, 'El límite máximo es 100').default(10),
});

const cedulaDeLaRuta = (valor: unknown) => validar(cedula, valor);

export const crear: RequestHandler = async (req, res) => {
    const ciudadano = await crearCiudadano(validar(esquemaCrear, req.body ?? {}));
    res.status(201).json(ciudadano);
};

export const listar: RequestHandler = async (req, res) => {
    res.json(await listarCiudadanos(validar(esquemaLista, req.query)));
};

export const obtener: RequestHandler = async (req, res) => {
    res.json(await obtenerCiudadano(cedulaDeLaRuta(req.params.cedula)));
};

export const actualizar: RequestHandler = async (req, res) => {
    const ciudadano = await actualizarCiudadano(cedulaDeLaRuta(req.params.cedula), validar(esquemaActualizar, req.body ?? {}));
    res.json(ciudadano);
};

export const eliminar: RequestHandler = async (req, res) => {
    await eliminarCiudadano(cedulaDeLaRuta(req.params.cedula));
    res.json({ mensaje: 'Ciudadano eliminado' });
};

// 1) Cada controlador valida, llama al servicio y responde; la logica vive en ciudadanoService.
// 2) La cedula es texto de 6 a 10 digitos (no numero): un numero perderia ceros a la izquierda.
// 3) En PUT la cedula no se acepta: viene en la ruta y es la llave del registro. Zod ignora campos extra,
//    asi que un "cedula" en el cuerpo del PUT simplemente no se usa.
// 4) Las fechas llegan como texto ISO (AAAA-MM-DD) y z.coerce.date las convierte; se rechazan nacimientos futuros.
// 5) Los parametros de la URL (?estado=&q=&pagina=&limite=) tambien se validan: pagina y limite se vuelven numeros,
//    con limite maximo 100 para que nadie pida la base completa de un golpe.
