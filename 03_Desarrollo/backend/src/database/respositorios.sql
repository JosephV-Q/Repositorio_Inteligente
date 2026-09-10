
CREATE TABLE Repositorios (
    id             SERIAL PRIMARY KEY,
    nom_arch       VARCHAR(255) NOT NULL,
    ruta_arch      TEXT NOT NULL, 
    categoria      VARCHAR(100), 
    descripcion    TEXT,
    resumen        TEXT,
    palabras_clave TEXT[], 
    contexto       VARCHAR(255)
);