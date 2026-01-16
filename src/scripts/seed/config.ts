import * as path from "path";

/**
 * Configuración de rutas a archivos de datos
 */

export const DATA_DIR = path.join(__dirname, "../../../data");

export const DATA_FILES = {
  provincias: path.join(DATA_DIR, "provincias.csv"),
  departamentos: path.join(DATA_DIR, "departamentos.csv"),
  localidades: path.join(DATA_DIR, "localidades.csv"),
  ambaConfig: path.join(DATA_DIR, "amba-partidos.json"),
};

/**
 * Configuración del proceso de seed
 */
export const SEED_CONFIG = {
  /** Tamaño del batch para inserción de localidades */
  localidadesBatchSize: 500,
  
  /** Código INDEC de CABA */
  cabaProvinciaId: "02",
};
