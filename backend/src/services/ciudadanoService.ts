import { Ciudadano, type ICiudadano } from '../models/Ciudadano';
import { ErrorApp } from '../utils/errores';

export type DatosCiudadano = Omit<ICiudadano, 'createdAt' | 'updatedAt'>;
export type CambiosCiudadano = Omit<DatosCiudadano, 'cedula'>;

export interface FiltroLista {
    estado?: ICiudadano['estado'];
    q?: string;
    pagina: number;
    limite: number;
}

const noEncontrado = () => new ErrorApp(404, 'CIUDADANO_NO_ENCONTRADO', 'No existe un ciudadano con esa identificación');
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function crearCiudadano(datos: DatosCiudadano) {
    return Ciudadano.create(datos);
}

export async function listarCiudadanos({ estado, q, pagina, limite }: FiltroLista) {
    const filtro: Record<string, unknown> = {};
    if (estado) filtro.estado = estado;
    if (q) {
        const texto = new RegExp(escapar(q), 'i');
        filtro.$or = [{ cedula: texto }, { nombres: texto }, { apellidos: texto }];
    }
    const [datos, total] = await Promise.all([
        Ciudadano.find(filtro)
            .sort({ apellidos: 1, nombres: 1 })
            .skip((pagina - 1) * limite)
            .limit(limite),
        Ciudadano.countDocuments(filtro),
    ]);
    return { datos, total, pagina, limite };
}

export async function obtenerCiudadano(cedula: string) {
    const ciudadano = await Ciudadano.findOne({ cedula });
    if (!ciudadano) throw noEncontrado();
    return ciudadano;
}

export async function actualizarCiudadano(cedula: string, cambios: CambiosCiudadano) {
    const ciudadano = await Ciudadano.findOneAndUpdate({ cedula }, cambios, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!ciudadano) throw noEncontrado();
    return ciudadano;
}

export async function eliminarCiudadano(cedula: string): Promise<void> {
    const borrado = await Ciudadano.findOneAndDelete({ cedula });
    if (!borrado) throw noEncontrado();
}

// 1) El servicio no sabe nada de HTTP: recibe datos ya validados y lanza ErrorApp cuando algo falla.
// 2) La busqueda "q" mira cedula, nombres y apellidos sin distinguir mayusculas. Se escapan los caracteres
//    especiales de regex para que "a.b" o "(" se busquen como texto y nadie pueda mandar una expresion costosa.
// 3) La lista se pagina con skip/limit y devuelve el total para que la pantalla calcule las paginas.
//    Se ordena por apellidos y nombres, que coincide con el indice ix_estado_apellidos.
// 4) La cedula NO se puede cambiar en una actualizacion: es la llave del ciudadano (CambiosCiudadano la excluye).
// 5) Un duplicado de cedula lo detecta el indice unico y el manejador de errores lo convierte en 409 CEDULA_DUPLICADA.
