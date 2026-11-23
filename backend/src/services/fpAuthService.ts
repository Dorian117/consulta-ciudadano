import type { Types } from 'mongoose';
import { UsuarioFp } from '../models/defensa';
import { compararContraseña, hashDeRelleno } from '../utils/contraseña';
import { ErrorApp } from '../utils/errores';
import { firmarToken } from '../utils/jwt';

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;

export interface SesionFp {
    token: string;
    usuario: { cedula: string; nombres: string; apellidos: string; fuerza: string; rango: string };
}

const credencialesInvalidas = () => new ErrorApp(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos');

async function registrarIntentoFallido(id: Types.ObjectId): Promise<void> {
    const u = await UsuarioFp.findByIdAndUpdate(id, { $inc: { intentosFallidos: 1 } }, { returnDocument: 'after' });
    if (u && u.intentosFallidos >= MAX_INTENTOS) {
        await UsuarioFp.updateOne({ _id: id }, { $set: { bloqueadoHasta: new Date(Date.now() + MINUTOS_BLOQUEO * 60_000), intentosFallidos: 0 } });
        throw new ErrorApp(423, 'CUENTA_BLOQUEADA', `La cuenta se bloqueó por ${MAX_INTENTOS} intentos fallidos. Podrá intentar de nuevo en ${MINUTOS_BLOQUEO} minutos`);
    }
}

export async function iniciarSesionFp(cedula: string, contrasena: string): Promise<SesionFp> {
    const usuario = await UsuarioFp.findOne({ cedula }).select('+passwordHash');

    if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
        const minutos = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60_000);
        throw new ErrorApp(423, 'CUENTA_BLOQUEADA', `La cuenta está bloqueada por intentos fallidos. Podrá intentar de nuevo en ${minutos} minuto(s)`);
    }

    const correcta = await compararContraseña(contrasena, usuario?.passwordHash ?? (await hashDeRelleno()));
    if (!usuario || !correcta) {
        if (usuario) await registrarIntentoFallido(usuario._id);
        throw credencialesInvalidas();
    }
    if (usuario.estadoCuenta !== 'activa') throw credencialesInvalidas();

    if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
        await UsuarioFp.updateOne({ _id: usuario._id }, { $set: { intentosFallidos: 0, bloqueadoHasta: null } });
    }
    const token = firmarToken({ sub: usuario.id, cedula: usuario.cedula }, 'fp');
    const { nombres, apellidos, fuerza, rango } = usuario;
    return { token, usuario: { cedula: usuario.cedula, nombres, apellidos, fuerza, rango } };
}

// Mismas reglas que el login web (authService.ts): error unico para cedula inexistente, clave mala o cuenta no activa;
// comparacion contra un hash de relleno para que tarde igual; 3 intentos fallidos bloquean 15 minutos (423) y el
// contador se incrementa con $inc (atomico). Diferencias: usa la coleccion usuarios_fp de la base defensa, exige
// estadoCuenta "activa" (una cuenta pendiente no entra aunque tenga clave) y firma el token con audiencia "fp", que
// el backend web rechaza (y al reves).
// shortcut: la logica de bloqueo esta repetida en vez de compartida con authService; si se agrega un tercer tipo de
// usuario conviene extraerla a una funcion comun.
