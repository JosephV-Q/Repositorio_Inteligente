
CREATE TABLE Comparativas (
    id           SERIAL PRIMARY KEY,
    urls         TEXT[] NOT NULL DEFAULT '{}',
    titulo       VARCHAR(255) NOT NULL,
    comparativa  VARCHAR(255),
    descripcion  TEXT,
    categoria    VARCHAR(100), -- referencia lógica a Repositorios.categoria
    contexto     VARCHAR(255)
);