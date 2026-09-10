
CREATE TABLE Roles (
    id_roles     SERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50) NOT NULL UNIQUE,
    permisos_rol JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_nombre_rol ON Roles (nombre_rol);
