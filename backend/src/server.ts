import {env} from './config/env';
import {conectarBasesDeDatos} from './config/database';
import {app} from './app';

async function iniciar():Promise<void> {
    await conectarBasesDeDatos(); // Conecta a las bases de datos
    app.listen(env.puerto, () => {
        console.log(`Servidor escuchando en el puerto ${env.puerto}`);
    }); // Inicia el servidor en el puerto especificado
}

iniciar().catch((error: Error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1); // Sale del proceso con un código de error
});

//si las bases de datos no se conectan, el servidor no se iniciara y se mostrara un mensaje de error en la consola. Esto ayuda a garantizar que la aplicación no se ejecute en un estado inconsistente si las dependencias críticas, como las bases de datos, no están disponibles.
//El bloque catch captura cualquier error que ocurra durante la conexión a las bases de datos o el inicio del servidor, y muestra un mensaje de error en la consola. Luego, el proceso se cierra con un código de salida 1, indicando que hubo un error. Esto es útil para la depuración y para asegurarse de que los problemas se detecten y manejen adecuadamente.

