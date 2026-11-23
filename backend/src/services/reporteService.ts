import pdfmake from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ICiudadano } from '../models/Ciudadano';
import { ErrorApp } from '../utils/errores';
import { ciudadanosPorEstado } from './ciudadanoService';

export type FiltroReporte = ICiudadano['estado'] | 'Todos';

const GRANATE = '#5e1f2b';
const GRIS = '#6a5f57';
const LINEA = '#d8d2c9';

pdfmake.setUrlAccessPolicy(() => false); // el reporte no descarga nada de internet. No se restringe la politica local: pdfmake trata el nombre de una fuente estandar como archivo y fallaria
pdfmake.setFonts({
    Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
});

const fechaLarga = (d: Date) =>
    new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(d);

export function armarDocumento(
    ciudadanos: Pick<ICiudadano, 'cedula' | 'nombres' | 'apellidos' | 'estado'>[],
    filtro: FiltroReporte,
    generado: Date,
): TDocumentDefinitions {
    const conEstado = filtro === 'Todos';
    const encabezado = ['Identificación', 'Nombres', 'Apellidos', ...(conEstado ? ['Estado'] : [])];
    const filas = ciudadanos.map((c) => [c.cedula, c.nombres, c.apellidos, ...(conEstado ? [c.estado] : [])]);

    const tabla: Content = {
        table: {
            headerRows: 1,
            widths: conEstado ? ['auto', '*', '*', 'auto'] : ['auto', '*', '*'],
            body: [encabezado.map((t) => ({ text: t, bold: true, color: GRANATE })), ...filas],
        },
        layout: {
            hLineWidth: (i, nodo) => (i === 0 || i === nodo.table.body.length ? 0 : i === 1 ? 1 : 0.5),
            hLineColor: (i) => (i === 1 ? GRANATE : LINEA),
            vLineWidth: () => 0,
            paddingTop: () => 5,
            paddingBottom: () => 5,
        },
    };

    return {
        pageSize: 'A4',
        pageMargins: [48, 56, 48, 56],
        defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#2b2421' },
        content: [
            { text: 'Reporte de ciudadanos', fontSize: 20, bold: true, color: GRANATE, margin: [0, 0, 0, 6] },
            { text: `Filtro aplicado: ${filtro}`, color: GRIS },
            { text: `Generado: ${fechaLarga(generado)}`, color: GRIS },
            { text: `Total de ciudadanos: ${ciudadanos.length}`, color: GRIS, margin: [0, 0, 0, 14] },
            tabla,
        ],
        footer: (pagina, total) => ({ text: `Página ${pagina} de ${total}`, alignment: 'center', color: GRIS, fontSize: 8, margin: [0, 20, 0, 0] }),
    };
}

export async function generarReporteCiudadanos(
    filtro: FiltroReporte,
    leer: (estado?: ICiudadano['estado']) => Promise<Parameters<typeof armarDocumento>[0]> = ciudadanosPorEstado,
): Promise<Buffer> {
    const ciudadanos = await leer(filtro === 'Todos' ? undefined : filtro);
    if (ciudadanos.length === 0) {
        throw new ErrorApp(404, 'SIN_RESULTADOS', 'No existen ciudadanos registrados que cumplan con el filtro seleccionado');
    }
    try {
        return await pdfmake.createPdf(armarDocumento(ciudadanos, filtro, new Date())).getBuffer();
    } catch (error) {
        console.error('Fallo al generar el PDF:', error);
        throw new ErrorApp(500, 'ERROR_PDF', 'Error al generar el archivo PDF. Por favor intente nuevamente');
    }
}

// 1) El PDF se arma en el servidor con pdfmake a partir de una tabla declarativa (sin navegador ni Puppeteer).
//    armarDocumento es una funcion pura: recibe los datos y devuelve la definicion, asi se prueba sin leer el PDF.
// 2) Si no hay resultados NO se genera archivo: se responde 404 SIN_RESULTADOS con el mensaje exacto del requisito.
// 3) Cualquier fallo al construir el PDF se registra en consola (con detalle) y al cliente solo le llega el mensaje
//    generico del requisito, sin datos internos.
// 4) Diseno sobrio: fuente estandar Helvetica del PDF (no se incrusta ninguna), escala de grises y el granate #5e1f2b
//    como unico acento. La columna Estado solo aparece cuando el filtro es Todos, porque con un filtro seria repetida.
// 5) La fecha se muestra en hora de Colombia, no en la del servidor.
// 6) generarReporteCiudadanos recibe opcionalmente la funcion que lee los datos: en produccion es la consulta a la base
//    y las pruebas pasan una propia para provocar el caso sin resultados o un fallo, sin tocar los datos reales.
