import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { datosAdminInicial } from '../config/env';
import { requiereSesion } from '../middlewares/autenticacion';
import { manejadorErrores } from '../middlewares/manejadorErrores';
import { requierePermiso } from '../middlewares/permisos';
import { Opcion } from '../models/Opcion';
import { Permiso } from '../models/Permiso';
import { arrancar, cerrar, CLAVE_PRUEBA, crearPerfilPrueba, crearUsuarioPrueba, pedir, tokenDe } from './ayudas';

describe('permisos y menu', () => {
    let tokenAdmin = '';
    let tokenSinPermiso = '';
    let tokenSoloLeer = '';
    let urlMini = '';
    let miniServidor: Server;

    before(async () => {
        await arrancar();
        const admin = datosAdminInicial();
        tokenAdmin = await tokenDe(admin.cedula, admin.clave);

        const sin = await crearPerfilPrueba();
        tokenSinPermiso = await tokenDe((await crearUsuarioPrueba(sin._id)).cedula, CLAVE_PRUEBA);

        const lector = await crearPerfilPrueba();
        const opcion = await Opcion.findOne({ codigo: 'ciudadanos' });
        await Permiso.create({ perfilId: lector._id, opcionId: opcion!._id, leer: true });
        const ul = await crearUsuarioPrueba(lector._id);
        tokenSoloLeer = await tokenDe(ul.cedula, CLAVE_PRUEBA);

        const mini = express();
        mini.get('/leer', requiereSesion, requierePermiso('ciudadanos', 'leer'), (_q, r) => void r.json({ ok: true }));
        mini.get('/crear', requiereSesion, requierePermiso('ciudadanos', 'crear'), (_q, r) => void r.json({ ok: true }));
        mini.use(manejadorErrores);
        miniServidor = mini.listen(0);
        await once(miniServidor, 'listening');
        urlMini = `http://127.0.0.1:${(miniServidor.address() as AddressInfo).port}`;
    });
    after(async () => {
        miniServidor.close();
        await cerrar();
    });

    const mini = async (ruta: string, token?: string) => {
        const r = await fetch(urlMini + ruta, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        return { estado: r.status, cuerpo: (await r.json()) as any };
    };

    it('menu del admin: todas sus opciones, ordenadas, con los 4 permisos', async () => {
        const r = await pedir('GET', '/api/auth/menu', undefined, tokenAdmin);
        assert.equal(r.estado, 200);
        assert.deepEqual(r.cuerpo.map((o: any) => o.codigo), ['ciudadanos', 'reportes', 'seguridad']);
        assert.deepEqual(r.cuerpo[0].permisos, { crear: true, leer: true, actualizar: true, eliminar: true });
    });

    it('/yo devuelve cedula, nombres y perfil', async () => {
        const r = await pedir('GET', '/api/auth/yo', undefined, tokenAdmin);
        assert.equal(r.estado, 200);
        assert.equal(r.cuerpo.cedula, datosAdminInicial().cedula);
        assert.equal(r.cuerpo.perfil, 'Administrador');
    });

    it('menu y yo sin sesion: 401', async () => {
        assert.equal((await pedir('GET', '/api/auth/menu')).estado, 401);
        assert.equal((await pedir('GET', '/api/auth/yo')).estado, 401);
    });

    it('perfil sin permisos: menu vacio y 403 SIN_PERMISO', async () => {
        assert.deepEqual((await pedir('GET', '/api/auth/menu', undefined, tokenSinPermiso)).cuerpo, []);
        const r = await mini('/leer', tokenSinPermiso);
        assert.equal(r.estado, 403);
        assert.equal(r.cuerpo.error.codigo, 'SIN_PERMISO');
    });

    it('permiso por accion: puede leer pero no crear', async () => {
        const rl = await mini('/leer', tokenSoloLeer);
        assert.equal(rl.estado, 200);
        assert.equal((await mini('/crear', tokenSoloLeer)).estado, 403);
    });

    it('sin sesion: 401', async () => {
        assert.equal((await mini('/leer')).estado, 401);
    });
});

// El middleware se prueba en una mini app con rutas de ejemplo para no depender de la API de ciudadanos (fase W2).
