import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { datosAdminInicial } from '../config/env';
import { Usuario } from '../models/Usuario';
import { arrancar, cerrar, CLAVE_PRUEBA, crearPerfilPrueba, crearUsuarioPrueba, pedir } from './ayudas';

describe('POST /api/auth/login', () => {
    let cedulaPrueba = '';
    before(async () => {
        await arrancar();
        const perfil = await crearPerfilPrueba();
        cedulaPrueba = (await crearUsuarioPrueba(perfil._id)).cedula;
    });
    after(cerrar);

    it('credenciales correctas: 200 con token y usuario', async () => {
        const admin = datosAdminInicial();
        const r = await pedir('POST', '/api/auth/login', { cedula: admin.cedula, contrasena: admin.clave });
        assert.equal(r.estado, 200);
        assert.ok(r.cuerpo.token);
        assert.equal(r.cuerpo.usuario.cedula, admin.cedula);
        assert.equal(r.cuerpo.usuario.passwordHash, undefined);
    });

    it('cedula inexistente y clave errada dan el mismo 401', async () => {
        const a = await pedir('POST', '/api/auth/login', { cedula: '0000000001', contrasena: 'Cualquiera1' });
        const b = await pedir('POST', '/api/auth/login', { cedula: cedulaPrueba, contrasena: 'Equivocada1' });
        assert.equal(a.estado, 401);
        assert.deepEqual(a, b);
        await Usuario.updateOne({ cedula: cedulaPrueba }, { intentosFallidos: 0 });
    });

    it('cuerpo vacio: 400', async () => {
        const r = await pedir('POST', '/api/auth/login', {});
        assert.equal(r.estado, 400);
        assert.equal(r.cuerpo.error.codigo, 'DATOS_INVALIDOS');
    });

    it('cedula numerica: 400', async () => {
        const r = await pedir('POST', '/api/auth/login', { cedula: 12345678, contrasena: 'x' });
        assert.equal(r.estado, 400);
    });

    it('JSON roto: JSON_INVALIDO', async () => {
        const r = await pedir('POST', '/api/auth/login', '{"cedula":');
        assert.equal(r.estado, 400);
        assert.equal(r.cuerpo.error.codigo, 'JSON_INVALIDO');
    });

    it('3 intentos fallidos bloquean la cuenta de prueba (423), incluso con la clave correcta', async () => {
        const mala = { cedula: cedulaPrueba, contrasena: 'Equivocada1' };
        assert.equal((await pedir('POST', '/api/auth/login', mala)).estado, 401);
        assert.equal((await pedir('POST', '/api/auth/login', mala)).estado, 401);
        const tercero = await pedir('POST', '/api/auth/login', mala);
        assert.equal(tercero.estado, 423);
        assert.equal(tercero.cuerpo.error.codigo, 'CUENTA_BLOQUEADA');
        const buena = await pedir('POST', '/api/auth/login', { cedula: cedulaPrueba, contrasena: CLAVE_PRUEBA });
        assert.equal(buena.estado, 423);
    });
});

// 1) El bloqueo solo se prueba con un usuario zz_test_ creado para la prueba: nunca con el admin, para no dejarlo bloqueado.
// 2) La prueba de "mismo 401" tambien usa el usuario de prueba, porque una clave errada suma un intento fallido.
// 3) La clave del admin sale de las variables de entorno (datosAdminInicial); nunca esta escrita en el codigo.
