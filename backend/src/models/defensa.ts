import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { dbDefensa } from '../config/database';

export const FUERZAS = ['Policia', 'Ejercito', 'Armada', 'Fuerza Aerea'] as const;
export const ESTADOS_CUENTA = ['pendiente', 'activa', 'bloqueada'] as const;
export const RESULTADOS_CONSULTA = ['Requerido', 'No requerido', 'No encontrado'] as const;

const cedula = {
    type: String,
    required: [true, 'La identificación es obligatoria'] as [true, string],
    trim: true,
    match: [/^[0-9]{6,10}$/, 'La identificación debe tener entre 6 y 10 dígitos'] as [RegExp, string],
};

// ---------- rangos: catalogo de rangos por fuerza ----------
export interface IRango { fuerza: (typeof FUERZAS)[number]; nombre: string; orden: number }
export const Rango = dbDefensa.model<IRango>(
    'Rango',
    new Schema<IRango>(
        {
            fuerza: { type: String, required: true, enum: FUERZAS },
            nombre: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
            orden: { type: Number, required: true, min: 1, validate: Number.isInteger },
        },
        { collection: 'rangos', versionKey: false },
    ),
);

// ---------- personal_activo: quien puede registrarse como Fuerza Publica ----------
export interface IPersonalActivo {
    cedula: string; idFuerza: string; nombres: string; apellidos: string;
    fuerza: (typeof FUERZAS)[number]; rango: string; activo: boolean;
}
export const PersonalActivo = dbDefensa.model<IPersonalActivo>(
    'PersonalActivo',
    new Schema<IPersonalActivo>(
        {
            cedula,
            idFuerza: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
            nombres: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
            apellidos: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
            fuerza: { type: String, required: true, enum: FUERZAS },
            rango: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
            activo: { type: Boolean, required: true },
        },
        { collection: 'personal_activo', versionKey: false },
    ),
);

// ---------- usuarios_fp: cuentas de Fuerza Publica ----------
export interface IUsuarioFp {
    cedula: string; nombres: string; apellidos: string; correo: string;
    fuerza: (typeof FUERZAS)[number]; rango: string; idFuerza: string;
    passwordHash: string | null;
    estadoCuenta: (typeof ESTADOS_CUENTA)[number];
    debeCambiarPassword: boolean;
    intentosFallidos: number;
    bloqueadoHasta: Date | null;
    createdAt: Date; updatedAt: Date;
}
export type UsuarioFpDocumento = HydratedDocument<IUsuarioFp>;
export const UsuarioFp = dbDefensa.model<IUsuarioFp>(
    'UsuarioFp',
    new Schema<IUsuarioFp>(
        {
            cedula,
            nombres: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
            apellidos: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
            correo: {
                type: String, required: true, trim: true, lowercase: true,
                match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'El correo no tiene un formato válido'],
            },
            fuerza: { type: String, required: true, enum: FUERZAS },
            rango: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
            idFuerza: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
            passwordHash: { type: String, default: null, select: false },
            estadoCuenta: { type: String, required: true, enum: ESTADOS_CUENTA, default: 'pendiente' },
            debeCambiarPassword: { type: Boolean, required: true, default: true },
            intentosFallidos: { type: Number, default: 0, min: 0, validate: Number.isInteger },
            bloqueadoHasta: { type: Date, default: null },
        },
        {
            collection: 'usuarios_fp', versionKey: false, timestamps: true,
            toJSON: { transform: (_d, o: Record<string, unknown>) => { delete o.passwordHash; return o; } },
        },
    ),
);

// ---------- claves_temporales: clave de primer ingreso (se borra sola por TTL, pero siempre se comprueba expiraEn) ----------
export interface IClaveTemporal { usuarioId: Types.ObjectId; hash: string; expiraEn: Date; usada: boolean; createdAt: Date }
export const ClaveTemporal = dbDefensa.model<IClaveTemporal>(
    'ClaveTemporal',
    new Schema<IClaveTemporal>(
        {
            usuarioId: { type: Schema.Types.ObjectId, required: true },
            hash: { type: String, required: true },
            expiraEn: { type: Date, required: true },
            usada: { type: Boolean, required: true, default: false },
        },
        { collection: 'claves_temporales', versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
    ),
);

// ---------- consultas: registro de cada consulta hecha por un miembro de Fuerza Publica ----------
export interface IConsulta {
    usuarioId: Types.ObjectId;
    cedulaConsultada: string;
    resultado: (typeof RESULTADOS_CONSULTA)[number];
    fecha: Date;
}
export const Consulta = dbDefensa.model<IConsulta>(
    'Consulta',
    new Schema<IConsulta>(
        {
            usuarioId: { type: Schema.Types.ObjectId, required: true },
            cedulaConsultada: { ...cedula },
            resultado: { type: String, required: true, enum: RESULTADOS_CONSULTA },
            fecha: { type: Date, required: true, default: Date.now },
        },
        { collection: 'consultas', versionKey: false },
    ),
);

// 1) Un modelo por coleccion que define db/02_defensa.js, todos sobre la conexion dbDefensa (la base "defensa").
//    collection: explicito en cada uno, porque Mongoose pluralizaria en ingles ("rangos" si, "consultas" si, pero
//    "personal_activo" y "claves_temporales" no).
// 2) Los campos y limites repiten el $jsonSchema del script: la base tiene additionalProperties: false, asi que un
//    campo de mas o un tipo distinto hace que la base rechace el documento. Por eso consultas NO lleva timestamps
//    (su esquema no declara createdAt) y claves_temporales solo createdAt.
// 3) passwordHash va con select: false y se borra en toJSON, igual que en el usuario web: el hash nunca sale en una respuesta.
// 4) estadoCuenta arranca "pendiente" y debeCambiarPassword en true: una cuenta nueva no sirve hasta activarse (M5).
// 5) shortcut: no existe coleccion "alertas" en db/02_defensa.js, asi que no hay modelo; se crea junto con M5 si se hace.
