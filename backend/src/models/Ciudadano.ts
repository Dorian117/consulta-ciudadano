import { Schema, type HydratedDocument} from 'mongoose';
import { dbRegistraduria } from '../config/database';

//estamos importando la DB para que podamos crear nuevos datos

export const GENEROS = ['M', 'F'] as const;
export const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const ESTADOS_CIUDADANO = ['Requerido', 'No requerido'] as const;
//Estas constantes le indican al codigo que solamente admitimos estos datos, no existen datos como "Fugitivo"
export type Genero = (typeof GENEROS)[number];
export type GrupoSanguineo = (typeof GRUPOS_SANGUINEOS)[number];
export type EstadoCiudadano = (typeof ESTADOS_CIUDADANO)[number];

export interface ICiudadano {
    cedula: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: Date;
    lugarNacimiento: string;
    genero: Genero;
    fechaExpedicion: Date;
    lugarExpedicion: string;
    grupoSanguineo: GrupoSanguineo;
    estatura: number;
    estado: EstadoCiudadano;
    createdAt: Date; //fecha de creacion automatica
    updatedAt: Date; //fecha de actualizacion automatica

    //Aqui definimos mejor las reglas que si o si se deben seguir antes de permitir el registro de un nuevo ciudadano
}

export type CiudadanoDocumento = HydratedDocument<ICiudadano>;
//Aqui encontramos lo que aparecera en pantalla si la persona se equivoca, Ej, si no ingresa numeros, entonces
const esquemaCiudadano = new Schema<ICiudadano>(
    {
        cedula: {
            type: String,
            required: [true, 'La cedula es obligatoria'], //Esto avisara si esta bien o mal
            trim: true,//Esto limpia los espacios extra
            match: [/^[0-9]{6,10}$/, 'La cedula debe tener entre 6 y 10 dígitos'], //Es un scanner que verifica que sea lo que se pide
        },

        nombres: {
            type: String,
            required: [true, 'Los nombres son obligatorios'],
            trim: true,
            minlength: [2, 'Los nombres deben tener al menos 2 caracteres'],
            maxlength: [80, 'Los nombres no pueden tener más de 80 caracteres'],
        },

        apellidos: {
            type: String,
            required: [true, 'Los apellidos son obligatorios'],
            trim: true,
            minlength: [1, 'Los apellidos son obligatorios'],
            maxlength: [80, 'Los apellidos no pueden superar 80 caracteres'],
        },
        fechaNacimiento: {
            type: Date,
            required: [true, 'La fecha de nacimiento es obligatoria'],
        },
        lugarNacimiento: {
            type: String,
            required: [true, 'El lugar de nacimiento es obligatorio'],
            trim: true,
            minlength: [1, 'El lugar de nacimiento es obligatorio'],
            maxlength: [80, 'El lugar de nacimiento no puede superar 80 caracteres'],
        },
        genero: {
            type: String,
            required: [true, 'El género es obligatorio'],
            enum: { values: GENEROS, message: 'El género debe ser M o F' },
        },
        fechaExpedicion: {
            type: Date,
            required: [true, 'La fecha de expedición es obligatoria'],
        },
        lugarExpedicion: {
            type: String,
            required: [true, 'El lugar de expedición es obligatorio'],
            trim: true,
            minlength: [1, 'El lugar de expedición es obligatorio'],
            maxlength: [80, 'El lugar de expedición no puede superar 80 caracteres'],
        },
        grupoSanguineo: {
            type: String,
            required: [true, 'El grupo sanguíneo es obligatorio'],
            enum: { values: GRUPOS_SANGUINEOS, message: 'El grupo sanguíneo no es válido' },
        },
        estatura: {
            type: Number,
            required: [true, 'La estatura es obligatoria'],
            min: [0.5, 'La estatura mínima es 0,5 m'],
            max: [2.5, 'La estatura máxima es 2,5 m'],
        },
        estado: {
            type: String,
            required: [true, 'El estado es obligatorio'],
            enum: { values: ESTADOS_CIUDADANO, message: 'El estado debe ser Requerido o No requerido' },
        },
    },

    {
        collection: 'ciudadanos',
        versionKey: false,
        timestamps: true,
    }
);

export const Ciudadano = dbRegistraduria.model<ICiudadano>('Ciudadano', esquemaCiudadano); //La informacion se redirigira directamente a la coleccion ciudadanos

// se conecta a la base registraduria  //ICiudadano indica que campos se completaran  // 'Ciudadano' es el nombre interno  // 'esquema' son las reglas
// export const, guarda todo enb una constante que lyuego se usara