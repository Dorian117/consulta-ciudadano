import { conectarBasesDeDatos, dbDefensa, dbRegistraduria }  from "../config/database";
import { datosAdminInicial } from "../config/env";
import { Perfil } from "../models/Perfil";
import { Usuario } from "../models/Usuario";
import { asegurarPerfilFp } from "../services/seguridadService";
import { hashearContraseña } from "../utils/contraseña";

const NOMBRE_PERFIL_ADMIN = 'Administrador';

async function crearAdmin(): Promise<void> {
    const datos = datosAdminInicial();
    await conectarBasesDeDatos();

    const perfil = await Perfil.findOne ({nombre: NOMBRE_PERFIL_ADMIN});
    if (!perfil){
        throw new Error(`No existe el perfil ${NOMBRE_PERFIL_ADMIN}; ejecute primero db/01_registraduria.js`);
    }
    await asegurarPerfilFp();
    if (await Usuario.exists({ cedula: datos.cedula })) {
        console.log(`Ya existe un usuario con la cédula ${datos.cedula}; no se modificó nada`);
        return;
    }

    const passwordHash = await hashearContraseña(datos.clave);
    try {
        await Usuario.create({
            cedula: datos.cedula,
            nombres: datos.nombres,
            correo: datos.correo,
            passwordHash,
            perfilId: perfil._id,
        });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) {
            throw new Error('Ya existe un usuario con ese correo');
        }
        throw error;
    }
    console.log(`Administrador creado con la cédula ${datos.cedula}`);
}

crearAdmin()
    .catch((error: Error) => {
        console.error('No se pudo crear el administrador:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await Promise.all([dbRegistraduria.close(), dbDefensa.close()]);
    });

    
