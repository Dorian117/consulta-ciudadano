import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { datosAdminInicial } from '../config/env';
import { Rango } from '../models/defensa';
import { Perfil } from '../models/Perfil';
import { asegurarPerfilFp } from '../services/seguridadService';
import { arrancar, cerrar, CLAVE_PRUEBA, crearPerfilPrueba, crearUsuarioFpPrueba, crearUsuarioPrueba, pedir, tokenDe } from './ayudas';

let n = 0;
const cedulaNueva = () => `77${`${Date.now()}${++n}`.slice(-8)}`.slice(0, 10);
const todos = { crear: true, leer: true, actualizar: true, eliminar: true };
const nadie = { crear: false, leer: false, actualizar: false, eliminar: false };

describe('seguridad: perfiles, permisos y usuarios', () => {
    let admin = '';
    let sinPermiso = '';

    before(async () => {
        await arrancar();
        await asegurarPerfilFp();
        const a = datosAdminInicial();
        admin = await tokenDe(a.cedula, a.clave);
        sinPermiso = await tokenDe((await crearUsuarioPrueba((await crearPerfilPrueba())._id)).cedula, CLAVE_PRUEBA);
    });
    after(cerrar);

    it('sin permiso sobre seguridad responde 403 y sin sesion 401', async () => {
        assert.equal((await pedir('GET', '/api/seguridad/perfiles', undefined, sinPermiso)).estado, 403);
        assert.equal((await pedir('POST', '/api/seguridad/usuarios', {}, sinPermiso)).estado, 403);
        assert.equal((await pedir('GET', '/api/seguridad/perfiles')).estado, 401);
    });

    it('lista los perfiles: el de Fuerza Publica solo trae la consulta y el Administrador esta protegido', async () => {
        const r = await pedir('GET', '/api/seguridad/perfiles', undefined, admin);
        assert.equal(r.estado, 200);
        const fp = r.cuerpo.find((p: any) => p.nombre === 'Fuerza Publica');
        assert.deepEqual(fp.permisos.map((p: any) => p.codigo), ['consultaFp']);
        const ad = r.cuerpo.find((p: any) => p.nombre === 'Administrador');
        assert.equal(ad.protegido, true);
        assert.ok(!ad.permisos.some((p: any) => p.codigo === 'consultaFp'));
        const guardar = await pedir('PUT', `/api/seguridad/perfiles/${ad.id}/permisos`, { permisos: [{ codigo: 'ciudadanos', ...nadie }] }, admin);
        assert.equal(guardar.estado, 409);
    });

    it('el administrador crea un rol, le da permisos y el menu del usuario cambia', async () => {
        const perfil = await pedir('POST', '/api/seguridad/perfiles', { nombre: 'zz_test_perfil_registrador', descripcion: 'prueba' }, admin);
        assert.equal(perfil.estado, 201);
        const dup = await pedir('POST', '/api/seguridad/perfiles', { nombre: 'zz_test_perfil_registrador' }, admin);
        assert.equal(dup.estado, 409);

        const cedula = cedulaNueva();
        const usuario = await pedir('POST', '/api/seguridad/usuarios', {
            cedula, nombres: 'zz_test_Registrador', correo: `zz_test_${cedula}@prueba.local`, contrasena: CLAVE_PRUEBA, perfilId: perfil.cuerpo.id,
        }, admin);
        assert.equal(usuario.estado, 201);
        assert.equal(usuario.cuerpo.passwordHash, undefined);

        const token = await tokenDe(cedula, CLAVE_PRUEBA);
        assert.deepEqual((await pedir('GET', '/api/auth/menu', undefined, token)).cuerpo, []);

        // "actualizar" sin "leer": el servidor activa leer para que la opcion aparezca en el menu
        const guardar = await pedir('PUT', `/api/seguridad/perfiles/${perfil.cuerpo.id}/permisos`, { permisos: [{ codigo: 'ciudadanos', ...nadie, actualizar: true }] }, admin);
        assert.equal(guardar.estado, 200);
        const menu = (await pedir('GET', '/api/auth/menu', undefined, token)).cuerpo;
        assert.equal(menu.length, 1);
        assert.equal(menu[0].codigo, 'ciudadanos');
        assert.deepEqual(menu[0].permisos, { crear: false, leer: true, actualizar: true, eliminar: false });
        assert.equal((await pedir('GET', '/api/ciudadanos', undefined, token)).estado, 200);
        assert.equal((await pedir('DELETE', '/api/ciudadanos/1234567', undefined, token)).estado, 403);

        // se le quita todo y la consulta deja de servir de inmediato
        await pedir('PUT', `/api/seguridad/perfiles/${perfil.cuerpo.id}/permisos`, { permisos: [{ codigo: 'ciudadanos', ...nadie }] }, admin);
        assert.equal((await pedir('GET', '/api/ciudadanos', undefined, token)).estado, 403);
    });

    it('rechaza opciones que no corresponden al perfil y datos invalidos', async () => {
        const perfiles = (await pedir('GET', '/api/seguridad/perfiles', undefined, admin)).cuerpo;
        const fp = perfiles.find((p: any) => p.nombre === 'Fuerza Publica');
        const web = perfiles.find((p: any) => p.nombre === 'zz_test_perfil_registrador');
        assert.equal((await pedir('PUT', `/api/seguridad/perfiles/${fp.id}/permisos`, { permisos: [{ codigo: 'ciudadanos', ...todos }] }, admin)).estado, 400);
        assert.equal((await pedir('PUT', `/api/seguridad/perfiles/${web.id}/permisos`, { permisos: [{ codigo: 'consultaFp', ...todos }] }, admin)).estado, 400);
        assert.equal((await pedir('PUT', '/api/seguridad/perfiles/xyz/permisos', { permisos: [] }, admin)).estado, 400);
        const datos = { cedula: cedulaNueva(), nombres: 'zz_test_X', correo: 'zz@prueba.local', perfilId: web.id };
        assert.equal((await pedir('POST', '/api/seguridad/usuarios', { ...datos, contrasena: 'corta' }, admin)).estado, 400);
        assert.equal((await pedir('POST', '/api/seguridad/usuarios', { ...datos, contrasena: CLAVE_PRUEBA, cedula: '12' }, admin)).estado, 400);
        assert.equal((await pedir('POST', '/api/seguridad/usuarios', { ...datos, contrasena: CLAVE_PRUEBA, perfilId: fp.id }, admin)).estado, 400);
    });

    it('no permite crear dos usuarios con la misma cedula', async () => {
        const web = (await Perfil.findOne({ nombre: 'zz_test_perfil_registrador' }))!;
        const cedula = cedulaNueva();
        const datos = { cedula, nombres: 'zz_test_Dup', correo: `zz_test_${cedula}@prueba.local`, contrasena: CLAVE_PRUEBA, perfilId: web.id };
        assert.equal((await pedir('POST', '/api/seguridad/usuarios', datos, admin)).estado, 201);
        const otra = await pedir('POST', '/api/seguridad/usuarios', { ...datos, correo: `zz_test_otro${cedula}@prueba.local` }, admin);
        assert.equal(otra.estado, 409);
        assert.equal(otra.cuerpo.error.codigo, 'CEDULA_DUPLICADA');
    });

    it('crea un usuario de Fuerza Publica que inicia sesion en la app movil', async () => {
        const rango = (await Rango.findOne())!;
        const cedula = cedulaNueva();
        const datos = {
            cedula, nombres: 'zz_test_Agente', apellidos: 'Prueba', correo: `zz_test_${cedula}@prueba.local`, contrasena: CLAVE_PRUEBA,
            fuerza: rango.fuerza, rango: rango.nombre, idFuerza: 'ZZ123',
        };
        assert.equal((await pedir('POST', '/api/seguridad/usuarios-fp', { ...datos, rango: 'Inventado' }, admin)).estado, 400);
        const r = await pedir('POST', '/api/seguridad/usuarios-fp', datos, admin);
        assert.equal(r.estado, 201);
        assert.equal(r.cuerpo.passwordHash, undefined);
        const login = await pedir('POST', '/api/fp/login', { cedula, contrasena: CLAVE_PRUEBA });
        assert.equal(login.estado, 200);
        assert.equal((await pedir('GET', '/api/consulta/1000000001', undefined, login.cuerpo.token)).estado, 200);
    });

    it('el administrador activa y quita el permiso de consulta del rol Fuerza Publica', async () => {
        const fp = await crearUsuarioFpPrueba();
        const token = (await pedir('POST', '/api/fp/login', { cedula: fp.cedula, contrasena: CLAVE_PRUEBA })).cuerpo.token;
        const idFp = (await pedir('GET', '/api/seguridad/perfiles', undefined, admin)).cuerpo.find((p: any) => p.nombre === 'Fuerza Publica').id;
        const poner = (leer: boolean) => pedir('PUT', `/api/seguridad/perfiles/${idFp}/permisos`, { permisos: [{ codigo: 'consultaFp', ...nadie, leer }] }, admin);
        try {
            assert.equal((await poner(false)).estado, 200);
            assert.equal((await pedir('GET', '/api/consulta/1000000001', undefined, token)).estado, 403);
        } finally {
            await poner(true);
        }
        assert.equal((await pedir('GET', '/api/consulta/1000000001', undefined, token)).estado, 200);
    });

    it('3 intentos fallidos bloquean 15 minutos (web y FP) y el administrador puede desbloquear', async () => {
        const u = await crearUsuarioPrueba((await crearPerfilPrueba())._id);
        for (let i = 0; i < 2; i++) assert.equal((await pedir('POST', '/api/auth/login', { cedula: u.cedula, contrasena: 'Mala_clave1' })).estado, 401);
        assert.equal((await pedir('POST', '/api/auth/login', { cedula: u.cedula, contrasena: 'Mala_clave1' })).estado, 423);
        // con el usuario bloqueado ni la clave correcta entra
        assert.equal((await pedir('POST', '/api/auth/login', { cedula: u.cedula, contrasena: CLAVE_PRUEBA })).estado, 423);
        assert.equal((await pedir('POST', `/api/seguridad/usuarios/web/${u.id}/desbloquear`, undefined, admin)).estado, 200);
        assert.equal((await pedir('POST', '/api/auth/login', { cedula: u.cedula, contrasena: CLAVE_PRUEBA })).estado, 200);

        const fp = await crearUsuarioFpPrueba();
        for (let i = 0; i < 3; i++) await pedir('POST', '/api/fp/login', { cedula: fp.cedula, contrasena: 'Mala_clave1' });
        assert.equal((await pedir('POST', '/api/fp/login', { cedula: fp.cedula, contrasena: CLAVE_PRUEBA })).estado, 423);
        assert.equal((await pedir('POST', `/api/seguridad/usuarios/fp/${fp.id}/desbloquear`, undefined, admin)).estado, 200);
        assert.equal((await pedir('POST', '/api/fp/login', { cedula: fp.cedula, contrasena: CLAVE_PRUEBA })).estado, 200);
    });

    it('lista los usuarios web y FP sin exponer contraseñas', async () => {
        const r = await pedir('GET', '/api/seguridad/usuarios', undefined, admin);
        assert.equal(r.estado, 200);
        assert.ok(r.cuerpo.some((u: any) => u.tipo === 'web') && r.cuerpo.some((u: any) => u.tipo === 'fp'));
        assert.ok(!JSON.stringify(r.cuerpo).includes('passwordHash'));
    });
});

// Prueba contra Atlas con datos zz_test_ (se borran al final). Las pruebas de bloqueo repiten el login web/FP a
// proposito: el profesor puede pedir ver que al 3er intento fallido la cuenta queda bloqueada 15 minutos.
