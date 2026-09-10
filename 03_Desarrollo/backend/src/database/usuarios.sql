
CREATE TABLE Usuarios (
    id       SERIAL PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL,
    gmail    VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, 
    rol      INTEGER NOT NULL
);
