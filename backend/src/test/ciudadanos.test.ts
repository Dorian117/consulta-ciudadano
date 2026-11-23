import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { datosAdminInicial } from '../config/env';
import { Opcion } from '../models/Opcion';
import { Permiso } from '../models/Permiso';
import { arrancar, cerrar, CLAVE_PRUEBA, crearPerfilPrueba, crearUsuarioPrueba, pedir, tokenDe } from './ayudas';

const base = (cedula: string, extra: object = {}) => ({
    cedula,
    nombres: 'zz_test_Ana',
    apellidos: 'zz_test_Perez',
    fechaNacimiento: '1990-05-20',
    lugarNacimiento: 'Bogota',
    genero: 'F',
    fechaExpedicion: '2008-06-01',
    lugarExpedicion: 'Bogota',
    grupoSanguineo: 'O+',
    estatura: 1.65,
    estado: 'No requerido',
    ...extra,
});

describe('API /api/ciudadanos', () => {
    let admin = '';
    let sinPermiso = '';
    let soloLeer = '';
    const C1 = '8800000001';
    const C2 = '8800000002';

    before(async () => {
        await arrancar();
        const datos = datosAdminInicial();
        admin = await tokenDe(datos.cedula, datos.clave);
        sinPermiso = await tokenDe((await crearUsuarioPrueba((await crearPerfilPrueba())._id)).cedula, CLAVE_PRUEBA);
        const lector = await crearPerfilPrueba();
        await Permiso.create({ perfilId: lector._id, opcionId: (await Opcion.findOne({ codigo: 'ciudadanos' }))!._id, leer: true });
        soloLeer = await tokenDe((await crearUsuarioPrueba(lector._id)).cedula, CLAVE_PRUEBA);
    });
    after(cerrar);

    it('sin sesion: 401; sin permiso: 403; solo leer no puede crear ni borrar', async () => {
        assert.equal((await pedir('GET', '/api/ciudadanos')).estado, 401);
        const r = await pedir('GET', '/api/ciudadanos', undefined, sinPermiso);
        assert.equal(r.estado, 403);
        assert.equal(r.cuerpo.error.codigo, 'SIN_PERMISO');
        assert.equal((await pedir('GET', '/api/ciudadanos', undefined, soloLeer)).estado, 200);
        assert.equal((await pedir('POST', '/api/ciudadanos', base(C1), soloLeer)).estado, 403);
        assert.equal((await pedir('PUT', `/api/ciudadanos/${C1}`, base(C1), soloLeer)).estado, 403);
        assert.equal((await pedir('DELETE', `/api/ciudadanos/${C1}`, undefined, soloLeer)).estado, 403);
    });

    it('POST crea (201) y devuelve el ciudadano', async () => {
        const r = await pedir('POST', '/api/ciudadanos', base(C1), admin);
        assert.equal(r.estado, 201);
        assert.equal(r.cuerpo.cedula, C1);
        assert.equal(r.cuerpo.estado, 'No requerido');
    });

    it('POST duplicado: 409 CEDULA_DUPLICADA', async () => {
        const r = await pedir('POST', '/api/ciudadanos', base(C1), admin);
        assert.equal(r.estado, 409);
        assert.equal(r.cuerpo.error.codigo, 'CEDULA_DUPLICADA');
    });

    it('POST con datos malos: 400 (cedula corta, numerica, estado, estatura, campo faltante)', async () => {
        for (const malo of [
            base('123'),
            base('12345678901'),
            { ...base(C2), cedula: 88000002 },
            base(C2, { estado: 'Fugitivo' }),
            base(C2, { estatura: 3 }),
            base(C2, { fechaNacimiento: 'ayer' }),
            { ...base(C2), nombres: undefined },
        ]) {
            const r = await pedir('POST', '/api/ciudadanos', malo, admin);
            assert.equal(r.estado, 400, JSON.stringify(malo));
            assert.equal(r.cuerpo.error.codigo, 'DATOS_INVALIDOS');
        }
    });

    it('GET :cedula devuelve el ciudadano; inexistente 404; formato malo 400', async () => {
        assert.equal((await pedir('GET', `/api/ciudadanos/${C1}`, undefined, admin)).cuerpo.nombres, 'zz_test_Ana');
        const r = await pedir('GET', '/api/ciudadanos/8800009999', undefined, admin);
        assert.equal(r.estado, 404);
        assert.equal(r.cuerpo.error.codigo, 'CIUDADANO_NO_ENCONTRADO');
        assert.equal((await pedir('GET', '/api/ciudadanos/abc', undefined, admin)).estado, 400);
    });

    it('GET lista: filtro de estado, busqueda y paginacion', async () => {
        await pedir('POST', '/api/ciudadanos', base(C2, { estado: 'Requerido', nombres: 'zz_test_Luis' }), admin);
        const todos = await pedir('GET', '/api/ciudadanos?q=zz_test_', undefined, admin);
        assert.equal(todos.cuerpo.total, 2);
        const req = await pedir('GET', '/api/ciudadanos?q=zz_test_&estado=Requerido', undefined, admin);
        assert.deepEqual(req.cuerpo.datos.map((c: any) => c.cedula), [C2]);
        const luis = await pedir('GET', '/api/ciudadanos?q=ZZ_TEST_LUIS', undefined, admin);
        assert.equal(luis.cuerpo.total, 1);
        const pag = await pedir('GET', '/api/ciudadanos?q=zz_test_&limite=1&pagina=2', undefined, admin);
        assert.equal(pag.cuerpo.datos.length, 1);
        assert.equal(pag.cuerpo.total, 2);
        assert.equal((await pedir('GET', '/api/ciudadanos?q=(', undefined, admin)).estado, 200);
        assert.equal((await pedir('GET', '/api/ciudadanos?estado=Otro', undefined, admin)).estado, 400);
        assert.equal((await pedir('GET', '/api/ciudadanos?limite=1000', undefined, admin)).estado, 400);
    });

    it('PUT actualiza (la cedula no cambia); inexistente 404; datos malos 400', async () => {
        const r = await pedir('PUT', `/api/ciudadanos/${C1}`, base(C1, { estado: 'Requerido', cedula: '8800000099' }), admin);
        assert.equal(r.estado, 200);
        assert.equal(r.cuerpo.estado, 'Requerido');
        assert.equal(r.cuerpo.cedula, C1);
        assert.equal((await pedir('PUT', '/api/ciudadanos/8800009999', base('x'), admin)).estado, 404);
        assert.equal((await pedir('PUT', `/api/ciudadanos/${C1}`, base(C1, { estatura: 9 }), admin)).estado, 400);
    });

    it('DELETE elimina; repetirlo da 404', async () => {
        assert.equal((await pedir('DELETE', `/api/ciudadanos/${C1}`, undefined, admin)).estado, 200);
        assert.equal((await pedir('GET', `/api/ciudadanos/${C1}`, undefined, admin)).estado, 404);
        assert.equal((await pedir('DELETE', `/api/ciudadanos/${C1}`, undefined, admin)).estado, 404);
        await pedir('DELETE', `/api/ciudadanos/${C2}`, undefined, admin);
    });
});

// Los ciudadanos de prueba tienen nombres con prefijo zz_test_ (los borra limpiar()) y cedulas 88000000xx.
// Si una prueba falla a medias, cerrar() los borra por el prefijo, asi que no queda basura en Atlas.
