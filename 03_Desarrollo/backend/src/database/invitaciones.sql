CREATE TABLE Invitaciones (
    id     SERIAL PRIMARY KEY,
    token  VARCHAR(255) NOT NULL UNIQUE,
    correo VARCHAR(150) NOT NULL,
    rol    INTEGER NOT NULL
);
