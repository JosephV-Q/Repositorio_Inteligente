
CREATE TABLE Configuracion (
    id              SERIAL PRIMARY KEY,
    categorias      TEXT[] NOT NULL DEFAULT '{}',
    nom_institucion VARCHAR(150) NOT NULL
);

