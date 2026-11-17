import { loadEnvFile } from 'node:process';

// Cargara el archivo .env  y verificara el mismo para iniciar el proceso

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


function secretoJwt(): string {
    const secreto = requerida('JWT_SECRET');
    if (secreto.length < 32) {
        throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
    }
    return secreto;
}
//un secreto corto se adivina por fuerza bruta y permitiria falsificar tokens, por eso se exige un minimo

function duracionJwt(): string {
    const duracion = process.env.JWT_EXPIRA_EN ?? '2h';
    if (!/^[0-9]+[smhd]$/.test(duracion)) {
        throw new Error('JWT_EXPIRA_EN debe ser un numero seguido de s, m, h o d (por ejemplo 2h)');
    }
    return duracion;
}
//validar el formato al arrancar evita que el error aparezca recien en el primer login

export const env = {
    puerto:Number(process.env.PORT ?? 3000),
    mongoUrl: requerida('MONGO_URI'),
    jwtSecreto: secretoJwt(),
    jwtExpiraEn: duracionJwt(),
};

//encargado de leer la el archivo .env con una funcion incluida en NODE, de esta forma
//evitamos tener que instalar mas paquetes que puedan afectar funciones, debido a las noticias recientes de vulnerabilidades
//En la funcion requerida(), el codigo verifica si la variable de entorno existe, y si no, lanza un error con un mensaje que indica que la variable es requerida. Esto ayuda a garantizar que todas las variables de entorno necesarias estén presentes antes de que la aplicación se ejecute.
//En este caso se usa ?? para proporcionar un valor predeterminado de 3000 si la variable de entorno PORT no está definida. Esto asegura que la aplicación tenga un puerto en el que pueda ejecutarse incluso si no se ha configurado explícitamente.

