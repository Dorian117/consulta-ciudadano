import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { dbRegistraduria, dbDefensa} from './config/database';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/manejadorErrores';
import { rutasAuth } from './routes/authRoutes';
import { rutasCiudadanos } from './routes/ciudadanoRoutes';
import { rutasReportes } from './routes/reporteRoutes';
import { rutasConsulta, rutasFp } from './routes/fpRoutes';
import { rutasSeguridad } from './routes/seguridadRoutes';

export const app = express();


app.use(helmet());
app.use(express.json()); // Middleware para parsear el cuerpo de las solicitudes como JSON

app.get('/api/salud', (_req, res) => {
    res.json({
        estado: 'OK',
        registraduria: dbRegistraduria.readyState === 1,
        defensa: dbDefensa.readyState === 1,
        
    }); // Endpoint de prueba para verificar el estado del servidor
});

app.use('/api/auth', rutasAuth);
app.use('/api/ciudadanos', rutasCiudadanos);
app.use('/api/reportes', rutasReportes);
app.use('/api/fp', rutasFp);
app.use('/api/consulta', rutasConsulta);
app.use('/api/seguridad', rutasSeguridad);

// Si la web ya esta compilada (frontend/dist), la misma API la sirve: asi se publica todo en una sola direccion.
const webCompilada = join(__dirname, '../../frontend/dist/consulta/browser');
if (existsSync(webCompilada)) {
    app.use(express.static(webCompilada));
    // cualquier ruta de la web (que no sea /api) devuelve index.html: Angular resuelve la ruta en el navegador
    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
        res.sendFile(join(webCompilada, 'index.html'));
    });
}

// Apartado para declarar e identificar errores (siempre al final y en este orden)
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

//apartado para conectar con el proceso de declarar e identificar errores

//app es la aplicacion de Express  que permite leer cuerpos en formato JSON y tiene un endpoint de prueba para verificar el estado del servidor y las conexiones a las bases de datos.
// api/salud devuelve un objeto JSON con el estado del servidor y el estado de las conexiones a las bases de datos. El estado de la conexión se verifica mediante la propiedad readyState de cada conexión, que devuelve 1 si la conexión está abierta y lista para usarse.
//separaremos app.ts de server.ts para poder probar la app sin abrir un puerto :D