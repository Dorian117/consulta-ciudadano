import { Schema } from 'mongoose';
import { dbRegistraduria } from '../config/database';

export interface IPerfil {
    nombre: string;
    descripcion?: string;
    activo: boolean;
}

//aqui creamos los rangos permitidos dentro del perfil web

const esquemaPerfil = new Schema<IPerfil>(
    {
        nombre: {
            type: String,
            required: [true, 'El nombre del perfil es obligatorio'],
            trim: true,
            minlength: [3, 'El nombre del perfil debe tener al menos 3 caracteres'],
            maxlength: [80, 'El nombre del perfil no puede superar 80 caracteres'],
        },
        descripcion: {
            type: String,
            trim: true,
            maxlength: [200, 'La descripción no puede superar 200 caracteres'],
        },
        activo: {
            type: Boolean,
            default: true,
        },
    },
    {
        collection: 'perfiles',
        versionKey: false,
    },
);

export const Perfil = dbRegistraduria.model<IPerfil>('Perfil', esquemaPerfil);

// 1) collection: 'perfiles' es obligatorio: Mongoose pluralizaria en ingles y buscaria 'perfils'.
// 2) Sin timestamps: el esquema de la base de 'perfiles' no declara createdAt ni updatedAt, y con
//    additionalProperties: false la base rechazaria un documento que los traiga porque estrictamente acepta los ya definidos.
// 3) activo tiene default true: un perfil nuevo queda habilitado si no se indica otra cosa.
// 4) El indice unico uq_perfil_nombre lo crea el script 01; un nombre repetido llegara como error 11000.