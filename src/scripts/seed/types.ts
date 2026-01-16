/**
 * Interfaces para los datos de los CSVs de datos.gob.ar
 */

export interface ProvinciaCSV {
  categoria: string;
  centroide_lat: string;
  centroide_lon: string;
  fuente: string;
  id: string;
  iso_id: string;
  iso_nombre: string;
  nombre: string;
  nombre_completo: string;
}

export interface DepartamentoCSV {
  categoria: string;
  centroide_lat: string;
  centroide_lon: string;
  fuente: string;
  id: string;
  nombre: string;
  nombre_completo: string;
  provincia_id: string;
  provincia_interseccion: string;
  provincia_nombre: string;
}

export interface LocalidadCSV {
  categoria: string;
  centroide_lat: string;
  centroide_lon: string;
  departamento_id: string;
  departamento_nombre: string;
  fuente: string;
  id: string;
  localidad_censal_id: string;
  localidad_censal_nombre: string;
  municipio_id: string;
  municipio_nombre: string;
  nombre: string;
  provincia_id: string;
  provincia_nombre: string;
}

export interface AmbaConfig {
  description: string;
  source: string;
  updated: string;
  partidos: Array<{ id: string; nombre: string }>;
  comunas_caba: Array<{ id: string; nombre: string }>;
}

export interface SeedContext {
  ambaCodes: Set<string>;
  provinciaMap: Map<string, number>;  // indecCode -> entityId
  departamentoMap: Map<string, number>; // deptCode -> entityId
}
