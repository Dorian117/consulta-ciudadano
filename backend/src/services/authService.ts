import type { Types } from 'mongoose';
import { Perfil } from '../models/Perfil';
import { Usuario } from '../models/Usuario';
import { compararContraseña, hashDeRelleno } from '../utils/contraseña';
import { ErrorApp } from '../utils/errores';
import { firmarToken } from '../utils/jwt';

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;

export interface SesionIniciada {
    token: string;
    usuario: { cedula: string; nombres: string; perfil: string };
}

function credencialesInvalidas(): ErrorApp {
    return new ErrorApp(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos');
}

async function registrarIntentoFallido(id: Types.ObjectId): Promise<void> {
    const actualizado = await Usuario.findByIdAndUpdate(id, { $inc: { intentosFallidos: 1 } }, { returnDocument: 'after' });
    if (actualizado && actualizado.intentosFallidos >= MAX_INTENTOS) {
        const bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60_000);
        await Usuario.updateOne({ _id: id }, { $set: { bloqueadoHasta, intentosFallidos: 0 } });
        throw new ErrorApp(
            423,
            'CUENTA_BLOQUEADA',
            `La cuenta se bloqueó por ${MAX_INTENTOS} intentos fallidos. Podrá intentar de nuevo en ${MINUTOS_BLOQUEO} minutos`,
        );
    }
}

export async function iniciarSesion(cedula: string, contraseña: string): Promise<SesionIniciada> {
    const usuario = await Usuario.findOne({ cedula }).select('+passwordHash');

    if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
        const minutos = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60_000);
        throw new ErrorApp(
            423,
            'CUENTA_BLOQUEADA',
            `La cuenta está bloqueada por intentos fallidos. Podrá intentar de nuevo en ${minutos} minuto(s)`,
        );
    }

    const correcta = await compararContraseña(contraseña, usuario?.passwordHash ?? (await hashDeRelleno()));

    if (!usuario || !correcta) {
        if (usuario) {
            await registrarIntentoFallido(usuario._id);
        }
        throw credencialesInvalidas();
    }

    const perfil = await Perfil.findById(usuario.perfilId);
    if (!usuario.activo || !perfil?.activo) {
        throw credencialesInvalidas();
    }

    if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
        await Usuario.updateOne({ _id: usuario._id }, { $set: { intentosFallidos: 0, bloqueadoHasta: null } });
    }

    const token = firmarToken(
        { sub: usuario.id, cedula: usuario.cedula, perfilId: usuario.perfilId.toString() },
        'web',
    );
    return { token, usuario: { cedula: usuario.cedula, nombres: usuario.nombres, perfil: perfil.nombre } };
}

// 1) El error de credenciales es SIEMPRE el mismo (cedula inexistente, clave mala, usuario o perfil inactivo):
//    quien ataca no puede saber cual de las cosas fallo.
// 2) Si la cedula no existe se compara contra un hash de relleno: asi tarda lo mismo que con un usuario real
//    y el tiempo de respuesta no delata que cedulas estan registradas.
// 3) Cuenta bloqueada: ni siquiera se compara la clave mientras dure el bloqueo, y se informa el tiempo restante
//    (RF-07). Es la unica respuesta que distingue una cedula real, y es un requisito del enunciado.
// 4) Los intentos se cuentan con $inc, una operacion atomica de MongoDB: dos intentos simultaneos no se pisan.
//    Al llegar a 3 se bloquea 15 minutos y el contador vuelve a 0, para tener 3 intentos nuevos al terminar.
// 5) Un login correcto pone intentosFallidos en 0 y bloqueadoHasta en null, solo si habia algo que limpiar.
// 6) El token lleva el id, la cedula y el perfil; la respuesta nunca incluye el hash de la contraseña.