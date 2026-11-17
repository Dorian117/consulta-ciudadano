import { Schema, type Types } from 'mongoose';
import { dbRegistraduria } from '../config/database';

export interface IPermiso {
    perfilId: Types.ObjectId;
    opcionId: Types.ObjectId;
    crear: boolean;
    leer: boolean;
    actualizar: boolean;
    eliminar: boolean;
}
//aqui asignamos que perfil tiene acceso a que botones de opcion
const esquemaPermiso = new Schema<IPermiso>(
    {
        perfilId: {
            type: Schema.Types.ObjectId,
            ref: 'Perfil',
            required: [true, 'El perfil es obligatorio'],
        },
        opcionId: {
            type: Schema.Types.ObjectId,
            ref: 'Opcion',
            required: [true, 'La opción es obligatoria'],
        },
        crear: { type: Boolean, default: false },
        leer: { type: Boolean, default: false },
        actualizar: { type: Boolean, default: false },
        eliminar: { type: Boolean, default: false },
    },
    {
        collection: 'permisos',
        versionKey: false,
    },
);

export const Permiso = dbRegistraduria.model<IPermiso>('Permiso', esquemaPermiso);

// 1) Esta coleccion es la relacion muchos a muchos entre perfiles y opciones: cada documento dice
//    "este perfil puede crear, leer, actualizar o eliminar en esta opcion".
// 2) Los cuatro permisos arrancan en false: si algo no se concede de forma explicita, queda denegado.
// 3) ref: 'Perfil' y ref: 'Opcion' permiten luego traer el nombre del perfil o de la opcion con populate.
//    Funciona porque los tres modelos viven en la misma conexion (dbRegistraduria).
// 4) El indice unico uq_perfil_opcion impide dos filas para el mismo perfil y la misma opcion.