import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { DATA_FILES } from "./config";
import type { ProvinciaCSV, DepartamentoCSV, LocalidadCSV, AmbaConfig } from "./types";

/**
 * Funciones para cargar datos desde archivos CSV y JSON
 */

/**
 * Lee y parsea un archivo CSV local
 */
export function readCSV<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo CSV no encontrado: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

/**
 * Carga las provincias desde el CSV
 */
export function loadProvincias(): ProvinciaCSV[] {
  return readCSV<ProvinciaCSV>(DATA_FILES.provincias);
}

/**
 * Carga los departamentos desde el CSV
 */
export function loadDepartamentos(): DepartamentoCSV[] {
  return readCSV<DepartamentoCSV>(DATA_FILES.departamentos);
}

/**
 * Carga las localidades desde el CSV
 */
export function loadLocalidades(): LocalidadCSV[] {
  return readCSV<LocalidadCSV>(DATA_FILES.localidades);
}

/**
 * Carga la configuración de partidos del AMBA desde JSON
 * Retorna un Set con los códigos INDEC de los partidos/comunas del AMBA
 */
export function loadAmbaConfig(): Set<string> {
  if (!fs.existsSync(DATA_FILES.ambaConfig)) {
    console.warn("⚠️  Archivo amba-partidos.json no encontrado. No se marcarán partidos como AMBA.");
    return new Set();
  }
  
  const content = fs.readFileSync(DATA_FILES.ambaConfig, "utf-8");
  const config: AmbaConfig = JSON.parse(content);
  
  // Combinar partidos del AMBA + comunas de CABA
  const ambaCodes = new Set<string>();
  
  for (const partido of config.partidos) {
    ambaCodes.add(partido.id);
  }
  
  for (const comuna of config.comunas_caba) {
    ambaCodes.add(comuna.id);
  }
  
  console.log(`   📍 Configuración AMBA cargada: ${config.partidos.length} partidos + ${config.comunas_caba.length} comunas`);
  return ambaCodes;
}

/**
 * Verifica que existan todos los archivos de datos necesarios
 */
export function verifyDataFiles(): boolean {
  console.log("📂 Verificando archivos de datos...");
  
  const requiredFiles = ["provincias", "departamentos", "localidades"] as const;
  
  for (const name of requiredFiles) {
    const filePath = DATA_FILES[name];
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      console.error(`   Ejecuta: pnpm data:download`);
      return false;
    }
    
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${name}: ${(stats.size / 1024).toFixed(1)} KB`);
  }
  
  return true;
}

/**
 * Agrupa y cuenta elementos por una propiedad
 */
export function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
