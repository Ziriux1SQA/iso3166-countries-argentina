import { DataSource } from "typeorm";
import { CountryEntity } from "../../entities/country.entity";
import { CountrySubdivisionEntity } from "../../entities/country-subdivision.entity";
import { LocalityEntity } from "../../entities/locality.entity";
import { SEED_CONFIG } from "./config";
import { loadProvincias, loadDepartamentos, loadLocalidades, countBy } from "./data-loader";
import {
  normalizarTipoSubdivision,
  normalizarTipoLocalidad,
  normalizarCodigoProvincia,
  generarCodigoDepartamento,
} from "./normalizers";

/**
 * Funciones de seed para cada entidad
 */

/**
 * Inserta el país Argentina
 */
export async function seedCountry(dataSource: DataSource): Promise<CountryEntity> {
  console.log("🌍 Insertando país Argentina...");
  
  const countryRepo = dataSource.getRepository(CountryEntity);
  
  const argentina = countryRepo.create({
    code: "AR",
    name: "Argentina",
  });
  
  const saved = await countryRepo.save(argentina);
  console.log(`   ✅ Argentina insertada (id: ${saved.id})`);
  
  return saved;
}

/**
 * Inserta las provincias desde el CSV
 * Retorna un Map de código INDEC -> entidad guardada
 */
export async function seedProvincias(
  dataSource: DataSource,
  country: CountryEntity
): Promise<Map<string, CountrySubdivisionEntity>> {
  console.log("\n🏛️  Cargando provincias desde CSV local...");
  
  const provincias = loadProvincias();
  console.log(`   📄 ${provincias.length} provincias encontradas en CSV`);
  
  const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
  const provinciaMap = new Map<string, CountrySubdivisionEntity>();
  
  for (const prov of provincias) {
    const tipo = normalizarTipoSubdivision(prov.categoria);
    const codigoNormalizado = normalizarCodigoProvincia(prov.id);
    
    // CABA es parte del AMBA (área metropolitana)
    const isMetro = codigoNormalizado === SEED_CONFIG.cabaProvinciaId;
    
    const subdivision = subdivisionRepo.create({
      countryId: country.id,
      code: prov.iso_id,
      name: prov.nombre,
      type: tipo,
      isMetropolitanArea: isMetro,
      metropolitanAreaCode: isMetro ? "AMBA" : undefined,
    });
    
    const saved = await subdivisionRepo.save(subdivision);
    provinciaMap.set(codigoNormalizado, saved);
  }
  
  console.log(`   ✅ ${provinciaMap.size} provincias/distritos insertados`);
  
  // Mostrar resumen por tipo
  const tiposCount = countBy(provincias, (p) => p.categoria);
  for (const [tipo, count] of Object.entries(tiposCount)) {
    console.log(`      - ${tipo}: ${count}`);
  }
  
  return provinciaMap;
}

/**
 * Inserta los departamentos/partidos desde el CSV
 * Retorna un Map de código INDEC -> entidad guardada
 */
export async function seedDepartamentos(
  dataSource: DataSource,
  country: CountryEntity,
  provinciaMap: Map<string, CountrySubdivisionEntity>,
  ambaCodes: Set<string>
): Promise<Map<string, CountrySubdivisionEntity>> {
  console.log("\n🏘️  Cargando departamentos/partidos desde CSV local...");
  
  const departamentos = loadDepartamentos();
  console.log(`   📄 ${departamentos.length} departamentos encontrados en CSV`);
  
  const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
  const departamentoMap = new Map<string, CountrySubdivisionEntity>();
  
  let ambaCount = 0;
  
  for (const dept of departamentos) {
    const provinciaId = normalizarCodigoProvincia(dept.provincia_id);
    const parentProvince = provinciaMap.get(provinciaId);
    
    if (!parentProvince) {
      console.warn(`   ⚠️  Provincia ${provinciaId} no encontrada para departamento ${dept.nombre}`);
      continue;
    }
    
    const tipo = normalizarTipoSubdivision(dept.categoria);
    const isMetro = ambaCodes.has(dept.id);
    if (isMetro) ambaCount++;
    
    const deptCode = generarCodigoDepartamento(parentProvince.code, dept.id);
    
    const subdivision = subdivisionRepo.create({
      countryId: country.id,
      parentSubdivisionId: parentProvince.id,
      code: deptCode,
      name: dept.nombre,
      type: tipo,
      isMetropolitanArea: isMetro,
      metropolitanAreaCode: isMetro ? "AMBA" : undefined,
    });
    
    const saved = await subdivisionRepo.save(subdivision);
    departamentoMap.set(dept.id, saved);
  }
  
  console.log(`   ✅ ${departamentoMap.size} departamentos/partidos insertados`);
  console.log(`   📍 ${ambaCount} marcados como AMBA`);
  
  // Mostrar resumen por tipo
  const tiposCount = countBy(departamentos, (d) => d.categoria);
  for (const [tipo, count] of Object.entries(tiposCount)) {
    console.log(`      - ${tipo}: ${count}`);
  }
  
  return departamentoMap;
}

/**
 * Inserta las localidades desde el CSV
 * Retorna el número de localidades insertadas
 */
export async function seedLocalidades(
  dataSource: DataSource,
  departamentoMap: Map<string, CountrySubdivisionEntity>
): Promise<number> {
  console.log("\n🏠 Cargando localidades desde CSV local...");
  
  const localidades = loadLocalidades();
  console.log(`   📄 ${localidades.length} localidades encontradas en CSV`);
  
  const localityRepo = dataSource.getRepository(LocalityEntity);
  
  const batchSize = SEED_CONFIG.localidadesBatchSize;
  let batch: LocalityEntity[] = [];
  let insertedCount = 0;
  let skippedCount = 0;
  
  const categoriaCount: Record<string, number> = {};
  
  for (const loc of localidades) {
    const parentDept = departamentoMap.get(loc.departamento_id);
    
    if (!parentDept) {
      skippedCount++;
      continue;
    }
    
    const tipo = normalizarTipoLocalidad(loc.categoria);
    categoriaCount[loc.categoria] = (categoriaCount[loc.categoria] || 0) + 1;
    
    // Parsear coordenadas del centroide
    const latitude = loc.centroide_lat ? parseFloat(loc.centroide_lat) : undefined;
    const longitude = loc.centroide_lon ? parseFloat(loc.centroide_lon) : undefined;
    
    const locality = localityRepo.create({
      subdivisionId: parentDept.id,
      name: loc.nombre,
      type: tipo,
      censusCode: loc.id,
      latitude: !isNaN(latitude as number) ? latitude : undefined,
      longitude: !isNaN(longitude as number) ? longitude : undefined,
    });
    
    batch.push(locality);
    
    if (batch.length >= batchSize) {
      await localityRepo.save(batch);
      insertedCount += batch.length;
      batch = [];
      process.stdout.write(`\r   Insertando... ${insertedCount}/${localidades.length}`);
    }
  }
  
  // Guardar batch restante
  if (batch.length > 0) {
    await localityRepo.save(batch);
    insertedCount += batch.length;
  }
  
  console.log(`\n   ✅ ${insertedCount} localidades insertadas`);
  
  if (skippedCount > 0) {
    console.log(`   ⚠️  ${skippedCount} localidades omitidas (departamento no encontrado)`);
  }
  
  // Mostrar resumen por categoría
  console.log("   📊 Distribución por categoría:");
  const sortedCategories = Object.entries(categoriaCount).sort((a, b) => b[1] - a[1]);
  for (const [categoria, count] of sortedCategories) {
    console.log(`      - ${categoria}: ${count}`);
  }
  
  return insertedCount;
}

/**
 * Obtiene y muestra estadísticas finales de la base de datos
 */
export async function printFinalStats(
  dataSource: DataSource,
  provinciaCount: number,
  departamentoCount: number
): Promise<void> {
  const countryCount = await dataSource.getRepository(CountryEntity).count();
  const subdivisionCount = await dataSource.getRepository(CountrySubdivisionEntity).count();
  const localityCount = await dataSource.getRepository(LocalityEntity).count();
  const metroSubdivisionCount = await dataSource.getRepository(CountrySubdivisionEntity).count({
    where: { isMetropolitanArea: true },
  });
  
  console.log("\n📊 RESUMEN FINAL:");
  console.log(`   • Países: ${countryCount}`);
  console.log(`   • Subdivisiones: ${subdivisionCount}`);
  console.log(`     - Provincias/Distritos: ${provinciaCount}`);
  console.log(`     - Departamentos/Partidos: ${departamentoCount}`);
  console.log(`   • Localidades: ${localityCount}`);
  console.log(`   • Subdivisiones en Áreas Metropolitanas: ${metroSubdivisionCount}`);
}
