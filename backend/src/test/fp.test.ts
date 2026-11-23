import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { datosAdminInicial } from '../config/env';
import { Ciudadano } from '../models/Ciudadano';
import { Consulta, UsuarioFp } from '../models/defensa';
import { arrancar, cerrar, CLAVE_PRUEBA, crearUsuarioFpPrueba, pedir, tokenDe } from './ayudas';

const ciudadano = (cedula: string, estado: string) => ({
    cedula, nombres: 'zz_test_Ana', apellidos: 'Perez', fechaNacimiento: '1990-05-20', lugarNacimiento: 'Bogota',
    genero: 'F', fechaExpedicion: '2008-06-01', lugarExpedicion: 'Bogota', grupoSanguineo: 'O+', estatura: 1.65, estado,
});
const loginFp = (cedula: string, contrasena: string) => pedir('POST', '/api/fp/login', { cedula, contrasena });

describe('Fuerza Publica: login y consulta', () => {
    let fp: Awaited<ReturnType<typeof crearUsuarioFpPrueba>>;
    let token = '';

    before(async () => {
        await arrancar();
        fp = await crearUsuarioFpPrueba();
        token = (await loginFp(fp.cedula, CLAVE_PRUEBA)).cuerpo.token;
        await Ciudadano.create([ciudadano('8800000021', 'Requerido'), ciudadano('8800000022', 'No requerido')] as any[]);
    });
    after(cerrar);

    it('login correcto: 200 con token y datos, sin hash', async () => {
        const r = await loginFp(fp.cedula, CLAVE_PRUEBA);
        assert.equal(r.estado, 200);
        assert.ok(r.cuerpo.token);
        assert.equal(r.cuerpo.usuario.fuerza, 'Policia');
        assert.equal(r.cuerpo.usuario.passwordHash, undefined);
    });

    it('cedula inexistente, clave errada y cuenta pendiente dan el mismo 401', async () => {
        const pendiente = await crearUsuarioFpPrueba({ estadoCuenta: 'pendiente' });
        const a = await loginFp('0000000001', 'Cualquiera1');
        const b = await loginFp(fp.cedula, 'Equivocada1');
        const c = await loginFp(pendiente.cedula, CLAVE_PRUEBA);
        assert.equal(a.estado, 401);
        assert.deepEqual(a, b);
        assert.deepEqual(a, c);
        await UsuarioFp.updateOne({ _id: fp._id }, { intentosFallidos: 0 });
    });

    it('datos mal formados: 400 y JSON roto JSON_INVALIDO', async () => {
        assert.equal((await pedir('POST', '/api/fp/login', {})).estado, 400);
        assert.equal((await pedir('POST', '/api/fp/login', { cedula: 12345678, contrasena: 'x' })).estado, 400);
        assert.equal((await pedir('POST', '/api/fp/login', '{"cedula":')).cuerpo.error.codigo, 'JSON_INVALIDO');
    });

    it('3 intentos fallidos bloquean 15 minutos (423), incluso con la clave correcta', async () => {
        const otro = await crearUsuarioFpPrueba();
        assert.equal((await loginFp(otro.cedula, 'Mala1234')).estado, 401);
        assert.equal((await loginFp(otro.cedula, 'Mala1234')).estado, 401);
        const tercero = await loginFp(otro.cedula, 'Mala1234');
        assert.equal(tercero.estado, 423);
        assert.equal(tercero.cuerpo.error.codigo, 'CUENTA_BLOQUEADA');
        assert.equal((await loginFp(otro.cedula, CLAVE_PRUEBA)).estado, 423);
    });

    it('consulta sin token 401; con token web (administrador) tambien 401', async () => {
        assert.equal((await pedir('GET', '/api/consulta/8800000021')).estado, 401);
        const admin = datosAdminInicial();
        const web = await tokenDe(admin.cedula, admin.clave);
        assert.equal((await pedir('GET', '/api/consulta/8800000021', undefined, web)).estado, 401);
    });

    it('el token de Fuerza Publica no abre rutas web', async () => {
        assert.equal((await pedir('GET', '/api/auth/menu', undefined, token)).estado, 401);
        assert.equal((await pedir('GET', '/api/ciudadanos', undefined, token)).estado, 401);
    });

    it('consulta: devuelve estado y nombres; inexistente da No encontrado sin nombre', async () => {
        const si = await pedir('GET', '/api/consulta/8800000021', undefined, token);
        assert.equal(si.estado, 200);
        assert.deepEqual(si.cuerpo, { cedula: '8800000021', estado: 'Requerido', nombres: 'zz_test_Ana', apellidos: 'Perez' });
        const no = await pedir('GET', '/api/consulta/8800000022', undefined, token);
        assert.equal(no.cuerpo.estado, 'No requerido');
        const nada = await pedir('GET', '/api/consulta/0000000009', undefined, token);
        assert.equal(nada.estado, 200);
        assert.deepEqual(nada.cuerpo, { cedula: '0000000009', estado: 'No encontrado' });
    });

    it('formato de cedula invalido: 400 y no se registra', async () => {
        const antes = await Consulta.countDocuments({ usuarioId: fp._id });
        assert.equal((await pedir('GET', '/api/consulta/abc', undefined, token)).estado, 400);
        assert.equal(await Consulta.countDocuments({ usuarioId: fp._id }), antes);
    });

    it('cada consulta queda registrada con quien la hizo y el resultado', async () => {
        const registros = await Consulta.find({ usuarioId: fp._id });
        const porCedula = Object.fromEntries(registros.map((c) => [c.cedulaConsultada, c.resultado]));
        assert.deepEqual(porCedula, { '8800000021': 'Requerido', '8800000022': 'No requerido', '0000000009': 'No encontrado' });
    });

    it('una cuenta desactivada pierde el acceso aunque su token no haya vencido', async () => {
        await UsuarioFp.updateOne({ _id: fp._id }, { estadoCuenta: 'bloqueada' });
        assert.equal((await pedir('GET', '/api/consulta/8800000021', undefined, token)).estado, 401);
    });
});

// Los usuarios FP y los ciudadanos de prueba llevan el prefijo zz_test_ (los borra limpiar(), junto con sus consultas).
// La cedula 0000000009 se usa como "no existe": ningun ciudadano real la tiene.
