import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Types } from 'mongoose';
import { app } from '../app';
import { conectarBasesDeDatos, dbDefensa, dbRegistraduria } from '../config/database';
import { Ciudadano } from '../models/Ciudadano';
import { ClaveTemporal, Consulta, PersonalActivo, UsuarioFp, type IUsuarioFp } from '../models/defensa';
import { Perfil } from '../models/Perfil';
import { Permiso } from '../models/Permiso';
import { Usuario } from '../models/Usuario';
import { hashearContraseña } from '../utils/contraseña';

export const CLAVE_PRUEBA = 'Zz_test1A';
const PREFIJO = /^zz_test_/;

let servidor: Server;
let base = '';

export async function arrancar(): Promise<string> {
    await conectarBasesDeDatos();
    servidor = app.listen(0);
    await once(servidor, 'listening');
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    return base;
}

export async function cerrar(): Promise<void> {
    await limpiar();
    servidor.close();
    await Promise.all([dbRegistraduria.close(), dbDefensa.close()]);
}

export interface Respuesta {
    estado: number;
    cuerpo: any;
}

export async function pedir(metodo: string, ruta: string, cuerpo?: unknown, token?: string): Promise<Respuesta> {
    const cabeceras: Record<string, string> = {};
    if (token) cabeceras.Authorization = `Bearer ${token}`;
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    const r = await fetch(base + ruta, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    return { estado: r.status, cuerpo: texto ? JSON.parse(texto) : null };
}

let contador = 0;
const unico = () => `${Date.now()}${++contador}`.slice(-8);

export async function crearPerfilPrueba() {
    return Perfil.create({ nombre: `zz_test_perfil_${unico()}` });
}

export async function crearUsuarioPrueba(perfilId: Types.ObjectId) {
    const n = unico();
    return Usuario.create({
        cedula: `99${n}`,
        nombres: `zz_test_usuario_${n}`,
        correo: `zz_test_${n}@prueba.local`,
        passwordHash: await hashearContraseña(CLAVE_PRUEBA),
        perfilId,
    });
}

export async function tokenDe(cedula: string, contrasena: string): Promise<string> {
    const r = await pedir('POST', '/api/auth/login', { cedula, contrasena });
    return r.cuerpo.token;
}

export async function limpiar(): Promise<void> {
    const perfiles = await Perfil.find({ nombre: PREFIJO }).select('_id');
    await Permiso.deleteMany({ perfilId: { $in: perfiles.map((p) => p._id) } });
    await Usuario.deleteMany({ nombres: PREFIJO });
    await Perfil.deleteMany({ nombre: PREFIJO });
    await Ciudadano.deleteMany({ nombres: PREFIJO });

    const fp = (await UsuarioFp.find({ nombres: PREFIJO }).select('_id')).map((u) => u._id);
    await Consulta.deleteMany({ usuarioId: { $in: fp } });
    await ClaveTemporal.deleteMany({ usuarioId: { $in: fp } });
    await UsuarioFp.deleteMany({ nombres: PREFIJO });
    await PersonalActivo.deleteMany({ nombres: PREFIJO });
}

// 1) Cada archivo de prueba arranca la app con app.listen(0): el sistema operativo asigna un puerto libre
//    y asi las pruebas no chocan con el servidor real ni entre si. Se usa fetch real, sin simular nada.
// 2) Todo dato de prueba lleva el prefijo zz_test_ (en nombres) y limpiar() lo borra al terminar, incluso si
//    una prueba falla, porque cerrar() se llama en after().
// 3) Los usuarios de prueba reciben una cedula de 10 digitos que empieza por 99 y termina en una marca de tiempo,
//    para no chocar con cedulas reales.
// 4) Los archivos de prueba corren uno tras otro (--test-concurrency=1): limpiar() borra TODO lo zz_test_,
//    y en paralelo un archivo borraria los datos del otro a mitad de sus pruebas.

export async function crearUsuarioFpPrueba(extra: Partial<IUsuarioFp> = {}) {
    const n = unico();
    return UsuarioFp.create({
        cedula: `98${n}`,
        nombres: `zz_test_fp_${n}`,
        apellidos: 'Prueba',
        correo: `zz_test_fp_${n}@prueba.local`,
        fuerza: 'Policia',
        rango: 'Patrullero',
        idFuerza: `ZZ-${n}`,
        passwordHash: await hashearContraseña(CLAVE_PRUEBA),
        estadoCuenta: 'activa',
        debeCambiarPassword: false,
        ...extra,
    });
}
