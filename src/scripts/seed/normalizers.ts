/**
 * Funciones para normalizar datos de los CSVs a formatos estandarizados
 */

/**
 * Mapeo de categorías de subdivisiones del CSV a tipos estandarizados
 */
const SUBDIVISION_TYPE_MAP: Record<string, string> = {
  "provincia": "province",
  "ciudad autónoma": "autonomous_city",
  "partido": "partido",
  "departamento": "department",
  "comuna": "comuna",
};

/**
 * Normaliza la categoría del CSV de provincias/departamentos a un tipo estandarizado
 * 
 * @example
 * normalizarTipoSubdivision("Provincia") // "province"
 * normalizarTipoSubdivision("Ciudad Autónoma") // "autonomous_city"
 * normalizarTipoSubdivision("Partido") // "partido"
 */
export function normalizarTipoSubdivision(categoria: string): string {
  const categoriaLower = categoria.toLowerCase();
  return SUBDIVISION_TYPE_MAP[categoriaLower] || categoriaLower;
}

/**
 * Normaliza la categoría de localidad del CSV a un tipo estandarizado
 * 
 * Las categorías del CSV de datos.gob.ar incluyen:
 * - "Localidad simple"
 * - "Entidad" (barrios/entidades de grandes ciudades)
 * - "Componente de localidad compuesta"
 * 
 * @example
 * normalizarTipoLocalidad("Localidad simple") // "locality"
 * normalizarTipoLocalidad("Entidad") // "entity"
 */
export function normalizarTipoLocalidad(categoria: string): string {
  const categoriaLower = categoria.toLowerCase();
  
  if (categoriaLower.includes("ciudad")) return "city";
  if (categoriaLower.includes("entidad")) return "entity";
  if (categoriaLower.includes("componente")) return "component";
  if (categoriaLower.includes("localidad simple")) return "locality";
  if (categoriaLower.includes("pueblo")) return "town";
  if (categoriaLower.includes("barrio")) return "neighborhood";
  if (categoriaLower.includes("paraje")) return "village";
  
  return "locality"; // Default
}

/**
 * Normaliza el código de provincia INDEC a formato de 2 dígitos
 * 
 * @example
 * normalizarCodigoProvincia("6") // "06"
 * normalizarCodigoProvincia("02") // "02"
 */
export function normalizarCodigoProvincia(codigo: string): string {
  return codigo.padStart(2, "0");
}

/**
 * Genera el código único para un departamento/partido
 * Formato: {ISO_PROVINCIA}-{ULTIMOS_3_DIGITOS_INDEC}
 * 
 * @example
 * generarCodigoDepartamento("AR-B", "06028") // "AR-B-028"
 */
export function generarCodigoDepartamento(codigoIsoProvincia: string, codigoIndecDept: string): string {
  return `${codigoIsoProvincia}-${codigoIndecDept.slice(-3)}`;
}
