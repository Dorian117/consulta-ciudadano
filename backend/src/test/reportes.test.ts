import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
import { datosAdminInicial } from '../config/env';
import { Ciudadano } from '../models/Ciudadano';
import { armarDocumento, generarReporteCiudadanos } from '../services/reporteService';
import { arrancar, cerrar, CLAVE_PRUEBA, crearPerfilPrueba, crearUsuarioPrueba, tokenDe } from './ayudas';

// require (y no import) para poder sustituir la funcion con mock: el servicio de reportes la llama por el objeto del modulo
const servicioCiudadanos = require('../services/ciudadanoService');

const datos = (cedula: string, estado: string) => ({
    cedula, nombres: 'zz_test_Ana', apellidos: 'zz_test_Perez', fechaNacimiento: '1990-05-20', lugarNacimiento: 'Bogota',
    genero: 'F', fechaExpedicion: '2008-06-01', lugarExpedicion: 'Bogota', grupoSanguineo: 'O+', estatura: 1.65, estado,
});

async function pdf(ruta: string, token?: string) {
    const r = await fetch(base + ruta, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const tipo = r.headers.get('content-type') ?? '';
    const bytes = Buffer.from(await r.arrayBuffer());
    return { estado: r.status, tipo, bytes, json: tipo.includes('json') ? JSON.parse(bytes.toString()) : null };
}
let base = '';

describe('GET /api/reportes/ciudadanos', () => {
    let admin = '';
    let sinPermiso = '';

    before(async () => {
        base = await arrancar();
        const a = datosAdminInicial();
        admin = await tokenDe(a.cedula, a.clave);
        sinPermiso = await tokenDe((await crearUsuarioPrueba((await crearPerfilPrueba())._id)).cedula, CLAVE_PRUEBA);
        await Ciudadano.create([datos('8800000011', 'Requerido'), datos('8800000012', 'No requerido')] as any[]);
    });
    after(cerrar);

    it('sin sesion 401 y sin permiso 403', async () => {
        assert.equal((await pdf('/api/reportes/ciudadanos')).estado, 401);
        assert.equal((await pdf('/api/reportes/ciudadanos', sinPermiso)).estado, 403);
    });

    it('200 con tipo application/pdf y cabecera %PDF', async () => {
        const r = await pdf('/api/reportes/ciudadanos?estado=Requerido', admin);
        assert.equal(r.estado, 200);
        assert.ok(r.tipo.startsWith('application/pdf'));
        assert.equal(r.bytes.subarray(0, 4).toString(), '%PDF');
        assert.equal((await pdf('/api/reportes/ciudadanos', admin)).estado, 200); // por defecto Todos
    });

    it('filtro invalido: 400', async () => {
        assert.equal((await pdf('/api/reportes/ciudadanos?estado=Otro', admin)).estado, 400);
    });

    it('sin resultados: 404 SIN_RESULTADOS y no se genera archivo', async () => {
        await assert.rejects(generarReporteCiudadanos('Requerido', async () => []), (e: any) =>
            e.estado === 404 && e.codigo === 'SIN_RESULTADOS' &&
            e.message === 'No existen ciudadanos registrados que cumplan con el filtro seleccionado');
    });

    it('fallo al generar: 500 con el mensaje del requisito', async () => {
        const log = mock.method(console, 'error', () => undefined);
        const roto = [{ cedula: '1', nombres: 'x', estado: 'Requerido', get apellidos(): string { throw new Error('fallo simulado'); } }];
        await assert.rejects(generarReporteCiudadanos('Requerido', async () => roto as never), (e: any) =>
            e.estado === 500 && e.message === 'Error al generar el archivo PDF. Por favor intente nuevamente');
        log.mock.restore();
    });

    it('el filtro se respeta: la consulta trae solo ese estado y la columna Estado solo sale con Todos', async () => {
        const req = (await servicioCiudadanos.ciudadanosPorEstado('Requerido')).filter((c: any) => c.nombres === 'zz_test_Ana');
        assert.deepEqual(req.map((c: any) => c.cedula), ['8800000011']);
        assert.ok((await servicioCiudadanos.ciudadanosPorEstado('Requerido')).every((c: any) => c.estado === 'Requerido'));

        const filas = [{ cedula: '1', nombres: 'A', apellidos: 'B', estado: 'Requerido' as const }];
        const tabla = (d: any) => d.content.find((c: any) => c.table).table;
        assert.equal(tabla(armarDocumento(filas, 'Todos', new Date())).body[0].length, 4);
        assert.equal(tabla(armarDocumento(filas, 'Requerido', new Date())).body[0].length, 3);
        assert.equal(tabla(armarDocumento(filas, 'Requerido', new Date())).body.length, 2);
    });
});

// Las pruebas 404 y 500 llaman al servicio con una funcion de lectura propia porque no se puede borrar a los ciudadanos
// reales de Atlas para provocarlos. Los datos de prueba (zz_test_) se crean aqui y los borra cerrar().
