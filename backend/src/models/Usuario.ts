import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { dbRegistraduria } from '../config/database';

export interface IUsuario {
    cedula: string;
    nombres: string;
    correo: string;
    passwordHash: string;
    perfilId: Types.ObjectId;
    activo: boolean;
    intentosFallidos: number;
    bloqueadoHasta: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type UsuarioDocumento = HydratedDocument<IUsuario>;

//aqui estan los datos de la persona que tendre un perfil, con determinados Permisos para poder acceder a distintas opciones (el administrador sergio  puede leer los datos)

const esquemaUsuario = new Schema<IUsuario>(
    {
        cedula: {
            type: String,
            required: [true, 'La identificación es obligatoria'],
            trim: true,
            match: [/^[0-9]{6,10}$/, 'La identificación debe tener entre 6 y 10 dígitos'],
        },
        nombres: {
            type: String,
            required: [true, 'Los nombres son obligatorios'],
            trim: true,
            minlength: [1, 'Los nombres son obligatorios'],
            maxlength: [120, 'Los nombres no pueden superar 120 caracteres'],
        },
        correo: {
            type: String,
            required: [true, 'El correo es obligatorio'],
            trim: true,
            lowercase: true,
            match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'El correo no tiene un formato válido'],
        },
        passwordHash: {
            type: String,
            required: [true, 'La contraseña es obligatoria'],
            select: false,
        },
        perfilId: {
            type: Schema.Types.ObjectId,
            ref: 'Perfil',
            required: [true, 'El perfil es obligatorio'],
        },
        activo: {
            type: Boolean,
            required: true,
            default: true,
        },
        intentosFallidos: {
            type: Number,
            default: 0,
            min: [0, 'Los intentos fallidos no pueden ser negativos'],
            validate: {
                validator: Number.isInteger,
                message: 'Los intentos fallidos deben ser un número entero',
            },
        },
        bloqueadoHasta: {
            type: Date,
            default: null,
        },
    },
    {
        collection: 'usuarios',
        versionKey: false,
        timestamps: true,
        toJSON: {
            transform: (_documento, objeto: Record<string, unknown>) => {
                delete objeto.passwordHash;
                return objeto;
            },
        },
    },
);

export const Usuario = dbRegistraduria.model<IUsuario>('Usuario', esquemaUsuario);

// 1) passwordHash lleva select: false: ninguna consulta lo trae por defecto. En el login se pide a proposito
//    con .select('+passwordHash'). Asi un descuido en un controlador no filtra el hash.
// 2) toJSON borra passwordHash como segunda barrera: select: false solo protege las consultas, no el documento
//    que devuelve create(). Sin esto, res.json(usuarioRecienCreado) incluiria el hash.
// 3) correo se guarda en minusculas: el indice unico de la base distingue mayusculas, y sin esto
//    "Ana@x.com" y "ana@x.com" contarian como correos distintos.
// 4) intentosFallidos y bloqueadoHasta sostienen la regla de 3 intentos y 15 minutos: el contador
//    arranca en 0 y bloqueadoHasta en null (la base acepta fecha o null).
// 5) timestamps: true si aplica aqui, porque el esquema de usuarios declara createdAt y updatedAt.
// 6) cedula y correo llegaran como error 11000 si se repiten: uq_usuario_cedula y uq_usuario_correo los crea el script 01.