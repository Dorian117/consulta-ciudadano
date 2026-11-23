import type { RequestHandler } from 'express';
import { z } from 'zod';
import { generarReporteCiudadanos } from '../services/reporteService';
import { validar } from '../utils/validar';

const esquema = z.object({
    estado: z.enum(['Todos', 'Requerido', 'No requerido'], { error: 'El filtro debe ser Todos, Requerido o No requerido' }).default('Todos'),
});

export const reporteCiudadanos: RequestHandler = async (req, res) => {
    const { estado } = validar(esquema, req.query);
    const pdf = await generarReporteCiudadanos(estado);
    const dia = new Date().toISOString().slice(0, 10);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="reporte_ciudadanos_${dia}.pdf"`,
        'Content-Length': String(pdf.length),
    });
    res.send(pdf);
};

// El controlador valida el filtro (por defecto Todos), pide el PDF al servicio y lo envia con su tipo de contenido.
// Los errores (404 SIN_RESULTADOS, 500 ERROR_PDF, 400 filtro invalido) salen por el manejador comun en formato JSON.
