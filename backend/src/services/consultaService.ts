import { Ciudadano } from '../models/Ciudadano';
import { Consulta, type IConsulta } from '../models/defensa';

export interface ResultadoConsulta {
    cedula: string;
    estado: IConsulta['resultado'];
    nombres?: string;
    apellidos?: string;
}

export async function consultarCiudadano(usuarioId: string, cedula: string): Promise<ResultadoConsulta> {
    const ciudadano = await Ciudadano.findOne({ cedula });
    const estado = ciudadano?.estado ?? 'No encontrado';
    await Consulta.create({ usuarioId, cedulaConsultada: cedula, resultado: estado });
    return ciudadano ? { cedula, estado, nombres: ciudadano.nombres, apellidos: ciudadano.apellidos } : { cedula, estado };
}

// 1) Devuelve solo lo necesario para el puesto de control: estado y nombre. Si la cedula no existe responde
//    "No encontrado" SIN nombre (no hay nada que revelar).
// 2) Cada consulta, incluso la de una cedula inexistente, queda registrada en defensa.consultas con quien la hizo
//    y el resultado: es el rastro de auditoria que luego permite un reporte de consultas por usuario.
// 3) El registro se espera (await) antes de responder: si no se pudo registrar, la consulta falla con error 500 en
//    lugar de entregar un dato sin dejar rastro.
