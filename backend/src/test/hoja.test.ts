import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { after, before, describe, it } from 'node:test';
import { Ciudadano } from '../models/Ciudadano';
import { arrancar, cerrar } from './ayudas';

const hoja = readFileSync(join(__dirname, '../../../docs/codigos_barras.html'), 'utf8');
const casos = [...hoja.matchAll(/cedula: '(\d+)', nombre: '[^']*', esperado: '([^']+)'/g)].map((m) => ({ cedula: m[1], esperado: m[2] }));

describe('hoja de codigos de barras (docs/codigos_barras.html)', () => {
    before(async () => void (await arrancar()));
    after(cerrar);

    it('tiene 4 ciudadanos de prueba y 2 inexistentes, con Code 128', () => {
        assert.equal(casos.length, 6);
        assert.equal(casos.filter((c) => c.esperado === 'No encontrado').length, 2);
        assert.ok(hoja.includes("format: 'CODE128'"));
        assert.ok(casos.every((c) => /^[0-9]{6,10}$/.test(c.cedula)));
    });

    it('la libreria incluida en docs/vendor codifica las 6 identificaciones en Code 128', () => {
        // la libreria es para navegador: se ejecuta en un contexto aislado que se hace pasar por la ventana
        const ventana: any = { document: {} };
        ventana.window = ventana.self = ventana;
        vm.runInNewContext(readFileSync(join(__dirname, '../../../docs/vendor/JsBarcode.all.min.js'), 'utf8'), ventana);
        const JsBarcode = ventana.JsBarcode;
        for (const { cedula } of casos) {
            const datos: any = {};
            JsBarcode(datos, cedula, { format: 'CODE128' });
            assert.equal(datos.encodings[0].text, cedula);
            assert.match(datos.encodings[0].data, /^[01]+$/);
        }
    });

    it('cada resultado esperado coincide con lo que hay en la base', async () => {
        for (const { cedula, esperado } of casos) {
            const c = await Ciudadano.findOne({ cedula });
            assert.equal(c?.estado ?? 'No encontrado', esperado, `la hoja dice ${esperado} para ${cedula}: actualicela si cambio la base`);
        }
    });
});

// Evita que la hoja impresa mienta: compara lo que promete cada tarjeta con la base real.
