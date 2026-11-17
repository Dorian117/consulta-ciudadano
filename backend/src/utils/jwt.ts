import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Sign } from 'node:crypto';

export type Audiencia = 'web' | 'fp';

export interface CargaToken {
    sub: string;
    cedula: string;
    perfilId: string;
}

export function firmarToken(carga: CargaToken, audiencia: Audiencia): string{
    const opciones: SignOptions = {
        algorithm: 'HS256',
        audience: audiencia,
        expiresIn: env.jwtExpiraEn as SignOptions['expiresIn'],
    };
    return jwt.sign(carga, env.jwtSecreto, opciones);
}

export function verificarToken(token: string, audiencia: Audiencia): CargaToken {
    const decodificado = jwt.verify(token, env.jwtSecreto, {algorithms: ['HS256'], audience: audiencia})
    if (
        typeof decodificado === 'string' ||
        typeof decodificado.sub !== 'string' ||
        typeof decodificado.cedula !== 'string' ||
        typeof decodificado.perfilId !== 'string'
    ) {
        throw new Error('El token no tiene el formato esperado');
    }
    return { sub: decodificado.sub, cedula: decodificado.cedula, perfilId: decodificado.perfilId};
}