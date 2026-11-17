import bcrypt from 'bcrypt';
const RONDAS_BCRYPT = 12; //este tiempo es minusculo para una persona pero para alguien que intente ingresar, es un tiempo que lo frena bastante
const LONGITUD_MINIMA = 6;
const BYTES_MAXIMOS = 72;

export const MENSAJE_POLITICA_CONTRASEÑA =
    'La contraseña debe tener al menos 6 caracteres, con una mayúscula, una minúscula y un dígito';

export function cumplePolitica(contraseña: string): boolean {
    return(
        contraseña.length >= LONGITUD_MINIMA &&
        Buffer.byteLength(contraseña, 'utf8') <= BYTES_MAXIMOS &&
        /[a-z]/.test(contraseña) &&
        /[A-Z]/.test(contraseña) &&
        /[0-9]/.test(contraseña)
    );
}
//aqui se deben validar absolutamente todos estos parametros, de otra forma, sera false
//funcion encargada de revisar que se cumplan los parametros establecidos previamente en env.ts

export async function hashearContraseña(contraseña: string): Promise<string> {
    if (!cumplePolitica(contraseña)){
        throw new Error (MENSAJE_POLITICA_CONTRASEÑA);
    }
    return bcrypt.hash(contraseña, RONDAS_BCRYPT);
}

export async function compararContraseña(contraseña: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contraseña, hash);
}

//si la contraseña ingresada cumple con los datos solicitados, entonces, la convierte en un hash
//compara la contraseña ingresada con el hash asignado para permitir el paso

// 1) bcrypt agrega una "sal" aleatoria a cada hash: dos usuarios con la misma contraseña tienen hashes distintos.
// 2) RONDAS_BCRYPT = 12 hace que cada hash tarde cerca de un cuarto de segundo: lo bastante lento para frenar
//    el ataque por fuerza bruta y lo bastante rapido para que el login no se sienta lento.
// 3) bcrypt solo lee los primeros 72 bytes: sin el limite, dos contraseñas largas que difieren despues de ese
//    punto se guardarian como la misma. Se cuentan bytes y no letras porque una "ñ" o un acento ocupan 2.
// 4) hashearContrasena exige la politica aunque el servicio ya la haya validado: asi nunca se guarda una clave debil.
// 5) compararContrasena NO exige la politica: en el login solo se compara, y asi no se revela como es una clave valida.