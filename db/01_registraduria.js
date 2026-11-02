const DB_NAME = "registraduria";
const rdb = db.getSiblingDB(DB_NAME);

//crea la coleccion de la base de datos
function ensureCollection(name, validator) {
    const exists = rdb.getCollectionInfos({ name }).length > 0;
    if (!exists) {
        rdb.createCollection(name, { validator, validationLevel: "strict", validationAction: "error" });
        print("creada       : " + name);
    }else {
        rdb.runCommand({ collMod: name, validator, validationLevel: "strict", validationAction: "error" });
        print("actualizada   : " + name);
    }
}

print("== " +DB_NAME + " ==");

//Este es un patrond de diseño que hemos investigado, recibe el nombre de
//idempotencia, que nos permite ejecutar el script varias veces sin que se generen errores
//el script verifica si la coleccion ya existe, si no existe la crea, si ya existe la actualiza

ensureCollection("ciudadanos", {
    $jsonSchema: {
        bsonType: "object",
        required:["cedula", "nombres", "apellidos", "fechaNacimiento", "lugarNacimiento",
            "genero", "fechaExpedicion", "lugarExpedicion", "grupoSanguineo", "estatura", "estado" ],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            cedula: { bsonType: "string", pattern: "^[0-9]{6,10}$", description: "Cedula, solo digitos" },
            nombres: { bsonType: "string", minLength: 1, maxLength: 80 },
            apellidos: { bsonType: "string", minLength: 1, maxLength: 80 },
            fechaNacimiento: { bsonType: "date" },
            genero: { enum: ["M", "F"] },
            fechaExpedicion: { bsonType: "date" },
            lugarExpedicion: { bsonType: "string", minLength: 1, maxLength: 80 },
            lugarNacimiento: { bsonType: "string", minLength: 1, maxLength: 80 },
            grupoSanguineo: { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
            estatura: { bsonType: ["int", "double"], minimum: 0.5, maximum: 2.5, description: "estatura en metros" },
            estado: { enum: ["Requerido", "No requerido"] },
            createdAt:       { bsonType: "date" },
            updatedAt:       { bsonType: "date" }
        }
    }
});
rdb.ciudadanos.createIndex({ cedula: 1 }, { unique: true, name: "uq_cedula" });
rdb.ciudadanos.createIndex({ estado: 1, apellidos: 1 }, { name: "ix_estado_apellidos" });

//En esta parte del codigo, definimos que cada campo sera tomado como un objeto que se convertira en un BSON, y que cada vez que se inserte un registro, se llenaran (por el servidor...) los campos createdAt y updatedAt con la fecha actual. Esto nos permite tener un control de cuando se creo y cuando se actualizo cada registro.
//El Back no podra añadir nuevos campos de los especificados en el script de la DB, se tendria que crear un nuevo objeto en este y re lanzar, creando una actualizacion de la DB y añadiendo el nuevo campo, para que el Back pueda añadirlo. Esto es una medida de seguridad para que no se añadan campos que no esten especificados en la DB y que puedan ser utilizados para vulnerar la seguridad de la aplicacion.
//no se permite que se guarde un registro sin todos los datos completos
//Creamos especificaciones para cada dato y en el final, IDs, para que la DB no repita a nadie y mejorar la velocidad de busqueda al recorrer al DB

ensureCollection("perfiles", {
    $jsonSchema: {
        bsonType: "object", required:["nombre"], additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            nombre: { bsonType: "string", minLength: 3, maxLength: 80 },
            descripcion: { bsonType: "string", maxLength: 200 },
            activo: { bsonType: "bool" },
        }
    }
});
rdb.perfiles.createIndex({ nombre: 1 }, { unique: true, name: "uq_perfil_nombre" });

ensureCollection("opciones",{
    $jsonSchema: {
        bsonType: "object", required:["codigo", "nombre", "ruta"], additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            codigo: { bsonType: "string", pattern: "^[A-Za-z0-9]{3,40}$"},
            nombre: { bsonType: "string", minLength: 3, maxLength: 60 },
            ruta: { bsonType: "string", maxLength: 120 },
            orden: { bsonType: ["int", "long"]},
        }
    }
});
rdb.opciones.createIndex({ codigo: 1 }, { unique: true, name: "uq_opcion_codigo" });

ensureCollection("usuarios",{
    $jsonSchema: {
        bsonType: "object",
        required: ["cedula", "nombres", "correo", "passwordHash", "perfilId", "activo"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            cedula: { bsonType: "string", pattern: "^[0-9]{6,10}$", description: "Cedula, solo digitos" },
            nombres:{ bsonType: "string", minLength: 1, maxLength: 120 },
            correo:           { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
            passwordHash:     { bsonType: "string", description: "Hash bcrypt; nunca la contrasena" },
            perfilId:         { bsonType: "objectId" },
            activo:           { bsonType: "bool" },
            intentosFallidos: { bsonType: ["int", "long"], minimum: 0 },
            bloqueadoHasta:   { bsonType: ["date", "null"] },
            createdAt:        { bsonType: "date" },
            updatedAt:        { bsonType: "date" }
        }
    }
});
rdb.usuarios.createIndex({ cedula: 1 }, { unique: true, name: "uq_usuario_cedula" });
rdb.usuarios.createIndex({ correo: 1 }, { unique: true, name: "uq_usuario_correo" });

//creadas colecciones = para Relacionales, lo que son tablas, donde se almacenan cada uno de los tipos de usuarios que revisaremos


ensureCollection("permisos",{
    $jsonSchema: {
        bsonType: "object", required:["perfilId", "opcionId"], additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            perfilId: { bsonType: "objectId" },
            opcionId: { bsonType: "objectId" },
            crear: { bsonType: "bool" }, leer: { bsonType: "bool" },
            actualizar: { bsonType: "bool" }, eliminar: { bsonType: "bool" }
        }
    }
});
rdb.permisos.createIndex({ perfilId: 1, opcionId: 1 }, { unique: true, name: "uq_perfil_opcion" });

//datos iniciales
function upsertOne(col, filtro, doc) {
    rdb.getCollection(col).updateOne(filtro, { $setOnInsert: doc }, { upsert: true });
}

upsertOne("perfiles", { nombre: "Administrador" },
    { nombre: "Administrador", descripcion: "Gestion de ciudadanos, reportes y seguridad", activo: true });

const opciones = [
    { codigo: "ciudadanos", nombre: "Gestion de ciudadanos", ruta: "/ciudadanos", orden: 1 },
    { codigo: "reportes",   nombre: "Reportes PDF",          ruta: "/reportes",   orden: 2 },
    { codigo: "seguridad",  nombre: "Seguridad",             ruta: "/seguridad",  orden: 3 }
];
opciones.forEach(o => upsertOne("opciones", { codigo: o.codigo }, o));

const admin = rdb.perfiles.findOne({ nombre: "Administrador" });
rdb.opciones.find().forEach(op => {
    upsertOne("permisos", { perfilId: admin._id, opcionId: op._id },
    { perfilId: admin._id, opcionId: op._id, crear: true, leer: true, actualizar: true, eliminar: true });
});

// DATOS DE PRUEBA: Borrarlos BORRARLOS BORRARLOS ANTES DEEEEEEEE
const ahora = new Date();
const prueba = [
    { cedula: "1000000001", nombres: "Ana Maria", apellidos: "Prueba Uno",    fechaNacimiento: ISODate("1990-03-12"), genero: "F", fechaExpedicion: ISODate("2008-04-01"), lugarExpedicion: "Bogota",    lugarNacimiento: "Bogota",    grupoSanguineo: "O+",  estatura: 1.65, estado: "No requerido" },
    { cedula: "1000000002", nombres: "Carlos",    apellidos: "Prueba Dos",    fechaNacimiento: ISODate("1985-07-30"), genero: "M", fechaExpedicion: ISODate("2003-08-15"), lugarExpedicion: "Medellin",  lugarNacimiento: "Medellin",  grupoSanguineo: "A-",  estatura: 1.78, estado: "Requerido" },
    { cedula: "1000000003", nombres: "Laura",     apellidos: "Prueba Tres",   fechaNacimiento: ISODate("1998-11-05"), genero: "F", fechaExpedicion: ISODate("2016-12-10"), lugarExpedicion: "Cali",      lugarNacimiento: "Cali",      grupoSanguineo: "B+",  estatura: 1.60, estado: "No requerido" },
    { cedula: "1000000004", nombres: "Jorge",     apellidos: "Prueba Cuatro", fechaNacimiento: ISODate("1979-01-22"), genero: "M", fechaExpedicion: ISODate("1997-02-03"), lugarExpedicion: "Cartagena", lugarNacimiento: "Cartagena", grupoSanguineo: "AB+", estatura: 1.82, estado: "Requerido" }
];
prueba.forEach(c => upsertOne("ciudadanos", { cedula: c.cedula }, { ...c, createdAt: ahora, updatedAt: ahora }));

print("Listo: " + DB_NAME + " | ciudadanos=" + rdb.ciudadanos.countDocuments() +
" perfiles=" + rdb.perfiles.countDocuments() + " opciones=" + rdb.opciones.countDocuments() +" permisos=" + rdb.permisos.countDocuments());