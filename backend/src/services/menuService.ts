import { Opcion } from '../models/Opcion';
import { Permiso } from '../models/Permiso';

export const ACCIONES = ['crear', 'leer', 'actualizar', 'eliminar'] as const;
export type Accion = (typeof ACCIONES)[number];

export interface ItemMenu {
    codigo: string;
    nombre: string;
    ruta: string;
    orden: number;
    permisos: Record<Accion, boolean>;
}

export async function obtenerMenu(perfilId: string): Promise<ItemMenu[]> {
    const permisos = await Permiso.find({ perfilId, leer: true });
    // consultaFp es el permiso de la app movil de Fuerza Publica: no es una pantalla de la web
    const opciones = await Opcion.find({ _id: { $in: permisos.map((p) => p.opcionId) }, codigo: { $ne: 'consultaFp' } });
    const porId = new Map(permisos.map((p) => [p.opcionId.toString(), p]));
    return opciones
        .map((o) => {
            const p = porId.get(o.id)!;
            return {
                codigo: o.codigo,
                nombre: o.nombre,
                ruta: o.ruta,
                orden: o.orden ?? 999,
                permisos: { crear: p.crear, leer: p.leer, actualizar: p.actualizar, eliminar: p.eliminar },
            };
        })
        .sort((a, b) => a.orden - b.orden);
}

// 1) El menu es lo que el frontend dibuja: solo aparecen las opciones donde el perfil tiene leer: true.
// 2) Cada item lleva los cuatro permisos para que la pantalla muestre u oculte botones (crear, editar, eliminar).
//    Es solo comodidad visual: la seguridad real la aplica requierePermiso en cada ruta del servidor.
// 3) Se ordena por "orden"; una opcion sin orden va al final (999).
