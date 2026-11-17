import { Schema } from 'mongoose';
import { dbRegistraduria } from '../config/database';

export interface IOpcion {
    codigo: string;
    nombre: string;
    ruta: string;
    orden?: number;
}

//aqui se configuran las opciones que queremos crear dentro de web (crear eliminar actualizar)

const esquemaOpcion = new Schema<IOpcion>(
    {
        codigo: {
            type: String,
            required: [true, 'El código de la opción es obligatorio'],
            trim: true,
            match: [/^[A-Za-z0-9]{3,40}$/, 'El código debe tener entre 3 y 40 letras o dígitos, sin espacios'],
        },
        nombre: {
            type: String,
            required: [true, 'El nombre de la opción es obligatorio'],
            trim: true,
            minlength: [3, 'El nombre de la opción debe tener al menos 3 caracteres'],
            maxlength: [60, 'El nombre de la opción no puede superar 60 caracteres'],
        },
        ruta: {
            type: String,
            required: [true, 'La ruta de la opción es obligatoria'],
            trim: true,
            maxlength: [120, 'La ruta no puede superar 120 caracteres'],
        },
        orden: {
            type: Number,
            validate: {
                validator: Number.isInteger,
                message: 'El orden debe ser un número entero',
            },
        },
    },
    {
        collection: 'opciones',
        versionKey: false,
    },
);

export const Opcion = dbRegistraduria.model<IOpcion>('Opcion', esquemaOpcion);

// 1) collection: 'opciones' evita que Mongoose pluralice a 'opcions'.
// 2) orden es opcional, pero si llega debe ser entero: la base solo acepta tipos int o long, y un 1.5 la haria fallar.
// 3) Sin timestamps, por la misma razon que Perfil: el esquema de la base no declara esas fechas.
// 4) El codigo ('ciudadanos', 'reportes', 'seguridad') es el identificador estable que usaran los permisos y el menu.