import { Types } from 'mongoose';
import { Rango, UsuarioFp, type IUsuarioFp } from '../models/defensa';
import { Opcion } from '../models/Opcion';
import { Perfil } from '../models/Perfil';
import { Permiso } from '../models/Permiso';
import { Usuario } from '../models/Usuario';
import { hashearContraseña } from '../utils/contraseña';
import { ErrorApp } from '../utils/errores';
import { ACCIONES, type Accion } from './menuService';

export const PERFIL_ADMIN = 'Administrador';
export const PERFIL_FP = 'Fuerza Publica';
export const OPCION_FP = 'consultaFp';

export type PermisosAccion = Record<Accion, boolean>;
export interface PermisoOpcion extends PermisosAccion {
    codigo: string;
    nombre: string;
}

const ninguno = (): PermisosAccion => ({ crear: false, leer: false, actualizar: false, eliminar: false });

// Crea (si faltan) el perfil de Fuerza Publica y su opcion; lo usan el script crear-admin y las pruebas.
export async function asegurarPerfilFp(): Promise<void> {
    await Perfil.updateOne(
        { nombre: PERFIL_FP },
        { $setOnInsert: { nombre: PERFIL_FP, descripcion: 'Consulta de antecedentes desde la app movil', activo: true } },
        { upsert: true },
    );
    await Opcion.updateOne(
        { codigo: OPCION_FP },
        { $setOnInsert: { codigo: OPCION_FP, nombre: 'Consulta de antecedentes (app movil)', ruta: '/consulta-fp', orden: 4 } },
        { upsert: true },
    );
    const [perfil, opcion] = await Promise.all([Perfil.findOne({ nombre: PERFIL_FP }), Opcion.findOne({ codigo: OPCION_FP })]);
    await Permiso.updateOne(
        { perfilId: perfil!._id, opcionId: opcion!._id },
        { $setOnInsert: { perfilId: perfil!._id, opcionId: opcion!._id, crear: false, leer: true, actualizar: false, eliminar: false } },
        { upsert: true },
    );
}

// Opciones configurables: el perfil de Fuerza Publica solo tiene la consulta; los demas, las opciones de la web.
async function opcionesDe(nombrePerfil: string) {
    const todas = await Opcion.find().sort({ orden: 1 });
    return todas.filter((o) => (nombrePerfil === PERFIL_FP) === (o.codigo === OPCION_FP));
}

export async function listarPerfiles() {
    const [perfiles, permisos] = await Promise.all([Perfil.find().sort({ nombre: 1 }), Permiso.find()]);
    const resultado = [];
    for (const p of perfiles) {
        const propios = new Map(permisos.filter((x) => x.perfilId.equals(p._id)).map((x) => [x.opcionId.toString(), x]));
        const lista: PermisoOpcion[] = (await opcionesDe(p.nombre)).map((o) => {
            const x = propios.get(o.id);
            const acciones = x ? { crear: x.crear, leer: x.leer, actualizar: x.actualizar, eliminar: x.eliminar } : ninguno();
            return { codigo: o.codigo, nombre: o.nombre, ...acciones };
        });
        resultado.push({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion ?? '',
            activo: p.activo,
            protegido: p.nombre === PERFIL_ADMIN,
            permisos: lista,
        });
    }
    return resultado;
}

export async function listarRangos() {
    return Rango.find().sort({ fuerza: 1, orden: 1 }).select('fuerza nombre -_id');
}

export async function crearPerfil(nombre: string, descripcion?: string) {
    if (nombre === PERFIL_FP) throw new ErrorApp(409, 'REGISTRO_DUPLICADO', 'Error: El registro ya existe');
    const p = await Perfil.create({ nombre, descripcion });
    return { id: p.id, nombre: p.nombre };
}

export async function guardarPermisos(perfilId: string, nuevos: ({ codigo: string } & PermisosAccion)[]) {
    const perfil = await Perfil.findById(perfilId);
    if (!perfil) throw new ErrorApp(404, 'PERFIL_NO_ENCONTRADO', 'El perfil no existe');
    if (perfil.nombre === PERFIL_ADMIN) throw new ErrorApp(409, 'PERFIL_PROTEGIDO', 'El perfil Administrador no se puede modificar');
    const validas = new Map((await opcionesDe(perfil.nombre)).map((o) => [o.codigo, o]));
    for (const n of nuevos) {
        if (!validas.has(n.codigo)) throw new ErrorApp(400, 'DATOS_INVALIDOS', `La opción ${n.codigo} no se puede asignar a este perfil`);
    }
    for (const n of nuevos) {
        // crear, actualizar o eliminar sin leer dejaria una opcion que no aparece en el menu
        const leer = ACCIONES.some((a) => n[a]);
        await Permiso.updateOne(
            { perfilId: perfil._id, opcionId: validas.get(n.codigo)!._id },
            { $set: { crear: n.crear, leer, actualizar: n.actualizar, eliminar: n.eliminar } },
            { upsert: true },
        );
    }
}

// ---------- usuarios ----------
export async function listarUsuarios() {
    const [web, fp, perfiles] = await Promise.all([Usuario.find().sort({ cedula: 1 }), UsuarioFp.find().sort({ cedula: 1 }), Perfil.find()]);
    const nombrePerfil = new Map(perfiles.map((p) => [p.id, p.nombre]));
    const bloqueado = (d: Date | null) => !!d && d > new Date();
    return [
        ...web.map((u) => ({
            id: u.id, tipo: 'web', cedula: u.cedula, nombres: u.nombres, correo: u.correo,
            rol: nombrePerfil.get(u.perfilId.toString()) ?? '', activo: u.activo, bloqueado: bloqueado(u.bloqueadoHasta),
        })),
        ...fp.map((u) => ({
            id: u.id, tipo: 'fp', cedula: u.cedula, nombres: `${u.nombres} ${u.apellidos}`, correo: u.correo,
            rol: `${u.fuerza} - ${u.rango}`, activo: u.estadoCuenta === 'activa', bloqueado: bloqueado(u.bloqueadoHasta),
        })),
    ];
}

export async function crearUsuarioWeb(d: { cedula: string; nombres: string; correo: string; contrasena: string; perfilId: string }) {
    const perfil = await Perfil.findById(d.perfilId);
    if (!perfil || !perfil.activo || perfil.nombre === PERFIL_FP) {
        throw new ErrorApp(400, 'DATOS_INVALIDOS', 'El perfil no existe o no está disponible');
    }
    const u = await Usuario.create({
        cedula: d.cedula, nombres: d.nombres, correo: d.correo,
        passwordHash: await hashearContraseña(d.contrasena), perfilId: perfil._id,
    });
    return { id: u.id, cedula: u.cedula, nombres: u.nombres, perfil: perfil.nombre };
}

type DatosFp = Pick<IUsuarioFp, 'cedula' | 'nombres' | 'apellidos' | 'correo' | 'fuerza' | 'rango' | 'idFuerza'> & { contrasena: string };

export async function crearUsuarioFp(d: DatosFp) {
    if (!(await Rango.exists({ fuerza: d.fuerza, nombre: d.rango }))) {
        throw new ErrorApp(400, 'DATOS_INVALIDOS', 'El rango no existe para esa fuerza');
    }
    const { contrasena, ...datos } = d;
    const u = await UsuarioFp.create({
        ...datos, passwordHash: await hashearContraseña(contrasena), estadoCuenta: 'activa', debeCambiarPassword: false,
    });
    return { id: u.id, cedula: u.cedula, nombres: u.nombres, apellidos: u.apellidos };
}

export async function desbloquearUsuario(tipo: 'web' | 'fp', id: string) {
    const cambio = { $set: { intentosFallidos: 0, bloqueadoHasta: null } };
    const _id = new Types.ObjectId(id);
    const r = tipo === 'web' ? await Usuario.updateOne({ _id }, cambio) : await UsuarioFp.updateOne({ _id }, cambio);
    if (!r.matchedCount) throw new ErrorApp(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe');
}

export async function fpPuedeConsultar(): Promise<boolean> {
    const [perfil, opcion] = await Promise.all([Perfil.findOne({ nombre: PERFIL_FP }), Opcion.findOne({ codigo: OPCION_FP })]);
    if (!perfil?.activo || !opcion) return false;
    return !!(await Permiso.exists({ perfilId: perfil._id, opcionId: opcion._id, leer: true }));
}

// 1) El administrador administra TODOS los roles desde "seguridad": los perfiles de la web (registraduria) y el
//    perfil de Fuerza Publica, que solo tiene la opcion consultaFp (poder consultar desde la app movil).
// 2) El perfil Administrador esta protegido: si pudiera quitarse permisos se bloquearia a si mismo.
// 3) Marcar crear/actualizar/eliminar activa leer automaticamente, porque sin leer la opcion no aparece en el menu.
// 4) Un usuario FP creado por el administrador nace activo y con clave definida (sin pasar por el registro M5).
// 5) shortcut: todos los usuarios FP comparten el rol Fuerza Publica; no hay permisos por individuo.
