import { loadEnvFile } from 'node:process';

// Cargara el archivo . env  y verificara el mismo para iniciar el proceso

try {
    loadEnvFile();
}catch{
    //si no encuentra el archvio .env, se detendra el proceso y mostrara un mensaje de error
}

function requerida(nombre: string): string {
    const valor = process.env[nombre];
    if (!valor) {
        throw new Error(`La variable de entorno ${nombre} es requerida`);
    }
    return valor;
}
//solicitara la variable de entorno y si no la encuentra, lanzara un error

export const env = {
    puerto:Number(process.env.PORT ?? 3000),
    mongoUrl: requerida('MONGO_URI'),
};

//encargado de leer la el archivo .env con una funcion incluida en NODE, de esta forma
//evitamos tener que instalar mas paquetes que puedan afectar funciones, debido a las noticias recientes de vulnerabilidades
//En la funcion requerida(), el codigo verifica si la variable de entorno existe, y si no, lanza un error con un mensaje que indica que la variable es requerida. Esto ayuda a garantizar que todas las variables de entorno necesarias estén presentes antes de que la aplicación se ejecute.
//En este caso se usa ?? para proporcionar un valor predeterminado de 3000 si la variable de entorno PORT no está definida. Esto asegura que la aplicación tenga un puerto en el que pueda ejecutarse incluso si no se ha configurado explícitamente.