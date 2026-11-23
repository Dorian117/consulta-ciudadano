import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ClaveTemporal, Consulta, PersonalActivo, Rango, UsuarioFp } from '../models/defensa';
import { arrancar, cerrar, crearUsuarioFpPrueba } from './ayudas';

describe('modelos de la base defensa', () => {
    before(async () => void (await arrancar()));
    after(cerrar);

    it('rangos y personal_activo existen y traen los datos del script 02', async () => {
        assert.ok((await Rango.countDocuments({ fuerza: 'Policia' })) > 0, 'faltan rangos: ejecute db/02_defensa.js');
        const p = await PersonalActivo.findOne({ cedula: '2000000001' });
        assert.equal(p?.activo, true);
        assert.equal((await PersonalActivo.findOne({ cedula: '2000000004' }))?.activo, false);
    });

    it('usuarios_fp: la base acepta el documento y el hash no sale en JSON ni en consultas normales', async () => {
        const u = await crearUsuarioFpPrueba();
        assert.equal(u.estadoCuenta, 'activa');
        assert.equal((u.toJSON() as any).passwordHash, undefined);
        assert.equal((await UsuarioFp.findById(u._id))!.passwordHash, undefined);
    });

    it('usuarios_fp: datos invalidos se rechazan (estado, correo, fuerza)', async () => {
        const base = { cedula: '9900000001', nombres: 'zz_test_x', apellidos: 'y', correo: 'zz_test@prueba.local', fuerza: 'Policia', rango: 'Patrullero', idFuerza: 'ZZ-1' };
        await assert.rejects(UsuarioFp.create({ ...base, estadoCuenta: 'otra' } as never), /valid/i);
        await assert.rejects(UsuarioFp.create({ ...base, correo: 'sin-arroba' } as never), /correo/i);
        await assert.rejects(UsuarioFp.create({ ...base, fuerza: 'Marina' } as never), /valid/i);
    });

    it('consultas y claves_temporales: la base acepta lo que el modelo escribe', async () => {
        const u = await crearUsuarioFpPrueba();
        const c = await Consulta.create({ usuarioId: u._id, cedulaConsultada: '1000000001', resultado: 'No encontrado' });
        assert.ok(c.fecha instanceof Date);
        const k = await ClaveTemporal.create({ usuarioId: u._id, hash: 'h', expiraEn: new Date(Date.now() + 60_000) });
        assert.equal(k.usada, false);
        await assert.rejects(Consulta.create({ usuarioId: u._id, cedulaConsultada: '12', resultado: 'Requerido' }), /dígitos/);
        await assert.rejects(Consulta.create({ usuarioId: u._id, cedulaConsultada: '1000000001', resultado: 'Fugitivo' } as never), /valid/i);
    });
});

// Estas pruebas escriben de verdad en Atlas: si el modelo y el $jsonSchema del script 02 no coinciden, la base
// rechaza el documento y la prueba falla. Los usuarios zz_test_ (y sus consultas y claves) los borra limpiar().
