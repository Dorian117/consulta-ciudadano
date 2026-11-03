const DB_NAME = "defensa";
const ddb = db.getSiblingDB(DB_NAME);

function upsertOne(collectionName, filter, data) {
    ddb.getCollection(collectionName).updateOne(filter, { $setOnInsert: data }, { upsert: true });
}

function ensureCollection(name, validator) {
    const exists = ddb.getCollectionInfos({ name }).length > 0;
    if (!exists) {
        ddb.createCollection(name, { validator, validationLevel: "strict", validationAction: "error" });
        print("creada       : " + name);
    }else {
        ddb.runCommand({ collMod: name, validator, validationLevel: "strict", validationAction: "error" });
        print("actualizada   : " + name);
    }
}

const FUERZAS =["Policia", "Ejercito", "Armada", "Fuerza Aerea"];

print("== " +DB_NAME + " ==");

//Apartado creado que valida si ya existe la coleccion, si no existe la crea, si ya existe la actualiza

//Coleccion de rangos que varia segun la fuerza a la que se pertenece.


ensureCollection("rangos", {
    $jsonSchema: {
        bsonType: "object", required:["fuerza", "nombre", "orden"], additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            fuerza: { enum: FUERZAS },
            nombre: { bsonType: "string", minLength: 3, maxLength: 80 },
            orden: { bsonType: ["int", "long"], minimum: 1},
        }
    }
});
ddb.rangos.createIndex({ fuerza: 1, nombre: 1 }, { unique: true, name: "uq_fuerza_rango" }); //No existiran dos rangos iguales

//Datos de cada miembro de cada fuerza que luego se clasifica en sus rangos respectivos
// ? HOLAAAAAAAAAAAAAAAAAAAAAAAAAA
// !IMPORTANTE, SI NO EXISTE AQUI LA PERSONA, NO SE PODRA REGISTRAR COMO FUERZA PUBLICA, ESTOS CAMPOS DEBEN CONTENER SU INFORMACION PREVIAMENTE!!!!!
// ? HOLAAAAAAAAAAAAAAAAAAAAAAAAAA

ensureCollection("personal_activo", {
    $jsonSchema: {
        bsonType: "object",
        required: ["cedula", "idFuerza", "nombres", "apellidos", "fuerza", "rango", "activo"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            cedula:{ bsonType: "string", pattern: "^[0-9]{6,10}$", description: "Cedula, solo digitos" },
            idFuerza: { bsonType: "string", minLength: 3, maxLength: 20 },
            nombres:{ bsonType: "string", minLength: 3, maxLength: 120 },
            apellidos:{ bsonType: "string", minLength: 3, maxLength: 120 },
            fuerza: { enum: FUERZAS },
            rango: { bsonType: "string", minLength: 3, maxLength: 80 },
            activo: { bsonType: "bool" },
        }
    }
});
ddb.personal_activo.createIndex({ cedula: 1 }, { unique: true, name: "uq_pa_cedula" });//No se repetira nada por cedula
ddb.personal_activo.createIndex({ idFuerza: 1 }, { unique: true, name: "uq_pa_idFuerza" }); //No se repetira nada por rango


//Coleccion de usuarios que pueden acceder al sistema (Se encuentran aprobados y activos en PERSONAL ACTIVO), con sus datos personales y de fuerza, ademas de su estado de cuenta y si debe cambiar la contraseña

ensureCollection("usuarios_fp", {
    $jsonSchema: {
        bsonType: "object",
        required: ["cedula", "nombres", "apellidos", "correo", "fuerza", "rango", "idFuerza","estadoCuenta", "debeCambiarPassword"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            cedula: { bsonType: "string", pattern: "^[0-9]{6,10}$" },
            nombres:        { bsonType: "string", minLength: 1, maxLength: 80 },
            apellidos:      { bsonType: "string", minLength: 1, maxLength: 80 },
            correo:         { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
            fuerza:         { enum: FUERZAS },
            rango:          { bsonType: "string", minLength: 3, maxLength: 60 },
            idFuerza:       { bsonType: "string", minLength: 3, maxLength: 20 },
            passwordHash:   { bsonType: ["string", "null"], description: "Hash bcrypt de la clave DEFINITIVA" },
            estadoCuenta:   { enum: ["pendiente", "activa", "bloqueada"] },
            debeCambiarPassword: { bsonType: "bool" },
            intentosFallidos:    { bsonType: ["int", "long"], minimum: 0 },
            bloqueadoHasta:      { bsonType: ["date", "null"] },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
        }
    }
});
ddb.usuarios_fp.createIndex({ cedula: 1 }, { unique: true, name: "uq_ufp_cedula" });
ddb.usuarios_fp.createIndex({ correo: 1 },         { unique: true, name: "uq_ufp_correo" });
ddb.usuarios_fp.createIndex({ idFuerza: 1 },       { unique: true, name: "uq_ufp_idfuerza" });//Solo puede existir un usuario por idFuerza, no se repite, si se repite es que hay un error en la base de datos y debe ser revisado

//Aqui se almacenan contraseñas encriptadas, permite que si alguien intenta entrar por fuerza bruta, entonces se bloquea ese usuario y confirma que usuario debe cambiar su contraseña y cual ya la cambio y valida que se vuelva a encriptar.




ensureCollection("claves_temporales", {
    $jsonSchema: {
        bsonType: "object", required: ["usuarioId", "hash", "expiraEn", "usada"], additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            usuarioId: { bsonType: "objectId" },
            hash:      { bsonType: "string", description: "Hash bcrypt de la clave temporal" },
            expiraEn:  { bsonType: "date" },
            usada:     { bsonType: "bool" },
            createdAt: { bsonType: "date" }
        }
    }
});
// El monitor TTL corre cada ~60 s: el backend SIEMPRE debe comprobar expiraEn, el indice solo limpia.
ddb.claves_temporales.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0, name: "ttl_expiraEn" });
ddb.claves_temporales.createIndex({ usuarioId: 1 }, { name: "ix_usuario" });
//Aqui se almacenan las contraseñas temporales que se generan y se eliminanb posteriormente :D

ensureCollection("consultas", {
    $jsonSchema: {
        bsonType: "object", required: ["usuarioId", "cedulaConsultada", "resultado", "fecha"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            usuarioId: { bsonType: "objectId" },
            cedulaConsultada: { bsonType: "string", pattern: "^[0-9]{6,10}$" },
            resultado: { enum: ["Requerido", "No requerido", "No encontrado"] },
            fecha: { bsonType: "date" }
        }
    }
});
ddb.consultas.createIndex({ usuarioId: 1, fecha: -1 }, { name: "ix_usuario_fecha" });
//Empleado para dejar un LOG que permita posteriormente imprimir en un PDF cada consulta realizada por un miembro de FP


const rangos = {
    "Policia":      ["Patrullero", "Subintendente", "Intendente", "Intendente Jefe", "Subcomisario", "Comisario",
            "Subteniente", "Teniente", "Capitan", "Mayor", "Teniente Coronel", "Coronel", "General"],
    "Ejercito":     ["Soldado Profesional", "Cabo Tercero", "Cabo Segundo", "Cabo Primero", "Sargento Segundo",
            "Sargento Viceprimero", "Sargento Primero", "Sargento Mayor",
            "Subteniente", "Teniente", "Capitan", "Mayor", "Teniente Coronel", "Coronel", "General"],
    "Armada":       ["Marinero", "Cabo Tercero", "Cabo Segundo", "Cabo Primero", "Sargento Segundo",
            "Teniente de Corbeta", "Teniente de Fragata", "Teniente de Navio",
            "Capitan de Corbeta", "Capitan de Fragata", "Capitan de Navio", "Almirante"],
    "Fuerza Aerea": ["Soldado", "Cabo Tercero", "Cabo Segundo", "Cabo Primero", "Sargento Segundo",
            "Subteniente", "Teniente", "Capitan", "Mayor", "Teniente Coronel", "Coronel", "General"]
};
Object.keys(rangos).forEach(f => rangos[f].forEach((n, i) =>
    upsertOne("rangos", { fuerza: f, nombre: n }, { fuerza: f, nombre: n, orden: i + 1 })));
//Funcion que permite insertar los rangos de cada fuerza, si ya existe no hace nada, si no existe lo crea, y le asigna un orden segun el array de rangos definido previamente

// Personal de PRUEBA (ficticio) para poder probar el registro y la validacion externa.
[
    { cedula: "2000000001", idFuerza: "PN-0001", nombres: "Diego",  apellidos: "Prueba Policia", fuerza: "Policia",      rango: "Patrullero", activo: true },
    { cedula: "2000000002", idFuerza: "EJ-0001", nombres: "Marta",  apellidos: "Prueba Ejercito",fuerza: "Ejercito",     rango: "Teniente",   activo: true },
    { cedula: "2000000003", idFuerza: "AR-0001", nombres: "Pablo",  apellidos: "Prueba Armada",  fuerza: "Armada",       rango: "Marinero",   activo: true },
    { cedula: "2000000004", idFuerza: "FA-0001", nombres: "Irene",  apellidos: "Prueba Aerea",   fuerza: "Fuerza Aerea", rango: "Capitan",    activo: false } // inactivo: debe ser rechazado
].forEach(p => upsertOne("personal_activo", { cedula: p.cedula }, p));

print("Listo: " + DB_NAME + " | rangos=" + ddb.rangos.countDocuments() +
" personal_activo=" + ddb.personal_activo.countDocuments());
