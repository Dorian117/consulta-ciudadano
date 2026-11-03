import mongoose from 'mongoose';
import {env} from './env'; //ruta donde encontrara el archivo.

//Creamos dos conexiones, ya que tenemos dos DBs

mongoose.set('autoIndex', false);// Desactiva la creación automática de índices
mongoose.set('autoCreate', false);// Desactiva la creación automática de colecciones

export const dbRegistraduria = mongoose.createConnection();
export const dbDefensa = mongoose.createConnection();

const opciones = {
    serverSelectionTimeoutMS: 5000, // Tiempo de espera para la selección del servidor
};

export async function conectarBasesDeDatos(): Promise<void> {
    await Promise.all([
        dbRegistraduria.openUri(env.mongoUrl, { ...opciones, dbName: 'registraduria' }),
        dbDefensa.openUri(env.mongoUrl, { ...opciones, dbName: 'defensa' }),
    ]);
} // Función asincrónica para conectar a las bases de datos

//Logramos dos conexiones bajo la misma cadena que tenemos en .env y un dbName distinto
//Autoindex y AutoCreate en false para evitar que se creen indices y colecciones de manera automatica, ya que esto puede afectar el rendimiento de la base de datos y generar problemas de seguridad.
//serverSelectionTimeoutMS se establece en 5000 milisegundos (5 segundos) para limitar el tiempo de espera al seleccionar un servidor de base de datos. Esto ayuda a evitar bloqueos prolongados en caso de problemas de conectividad o disponibilidad del servidor.