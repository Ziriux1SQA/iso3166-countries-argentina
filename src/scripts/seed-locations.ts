import "reflect-metadata";
import { AppDataSource } from "../config/data-source";
import { CountryEntity } from "../entities/country.entity";
import { CountrySubdivisionEntity } from "../entities/country-subdivision.entity";
import { LocalityEntity } from "../entities/locality.entity";
import * as https from "https";
import * as http from "http";
import { parse } from "csv-parse/sync";

// URLs de datos oficiales de Argentina
const DATA_URLS = {
  provincias: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.7/download/provincias.csv",
  departamentos: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.8/download/departamentos.csv",
  localidades: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.10/download/localidades.csv",
};

// 40 Partidos del AMBA (Área Metropolitana de Buenos Aires) + CABA
// Códigos de departamento INDEC
const AMBA_PARTIDO_CODES = [
  "06028", // Almirante Brown
  "06035", // Avellaneda
  "06056", // Berazategui
  "06091", // Berisso
  "06119", // Brandsen (parcial)
  "06134", // Campana (parcial)
  "06147", // Cañuelas (parcial)
  "06252", // Ensenada
  "06260", // Escobar
  "06270", // Esteban Echeverría
  "06274", // Exaltación de la Cruz (parcial)
  "06277", // Ezeiza
  "06280", // Florencio Varela
  "06329", // General Las Heras (parcial)
  "06364", // General Rodríguez
  "06371", // General San Martín
  "06408", // Hurlingham
  "06410", // Ituzaingó
  "06412", // José C. Paz
  "06427", // La Matanza
  "06434", // Lanús
  "06441", // La Plata
  "06490", // Lomas de Zamora
  "06515", // Luján (parcial)
  "06525", // Malvinas Argentinas
  "06539", // Marcos Paz (parcial)
  "06560", // Merlo
  "06568", // Moreno
  "06574", // Morón
  "06638", // Pilar
  "06648", // Presidente Perón
  "06658", // Quilmes
  "06749", // San Fernando
  "06756", // San Isidro
  "06760", // San Miguel
  "06778", // San Vicente (parcial)
  "06805", // Tigre
  "06840", // Tres de Febrero
  "06861", // Vicente López
  "06882", // Zárate (parcial)
];

// Mapping de códigos ISO 3166-2 para provincias argentinas
const PROVINCE_ISO_CODES: Record<string, string> = {
  "02": "AR-C",  // CABA
  "06": "AR-B",  // Buenos Aires
  "10": "AR-K",  // Catamarca
  "14": "AR-X",  // Córdoba
  "18": "AR-W",  // Corrientes
  "22": "AR-H",  // Chaco
  "26": "AR-U",  // Chubut
  "30": "AR-E",  // Entre Ríos
  "34": "AR-P",  // Formosa
  "38": "AR-Y",  // Jujuy
  "42": "AR-L",  // La Pampa
  "46": "AR-F",  // La Rioja
  "50": "AR-M",  // Mendoza
  "54": "AR-N",  // Misiones
  "58": "AR-Q",  // Neuquén
  "62": "AR-R",  // Río Negro
  "66": "AR-A",  // Salta
  "70": "AR-J",  // San Juan
  "74": "AR-D",  // San Luis
  "78": "AR-Z",  // Santa Cruz
  "82": "AR-S",  // Santa Fe
  "86": "AR-G",  // Santiago del Estero
  "90": "AR-V",  // Tucumán
  "94": "AR-T",  // Tierra del Fuego
};

async function downloadCSV(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadCSV(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => resolve(data));
      response.on("error", reject);
    });

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

function parseCSV(csvContent: string): Record<string, string>[] {
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

async function seedCountries(dataSource: typeof AppDataSource) {
  console.log("🌍 Seeding countries...");
  
  const countryRepo = dataSource.getRepository(CountryEntity);
  
  // Insert Argentina
  const argentina = countryRepo.create({
    code: "AR",
    name: "Argentina",
  });
  
  await countryRepo.save(argentina);
  console.log("✅ Argentina inserted");
  
  return argentina;
}

async function seedProvinces(
  dataSource: typeof AppDataSource,
  country: CountryEntity
): Promise<Map<string, CountrySubdivisionEntity>> {
  console.log("🏛️  Downloading and seeding provinces...");
  
  const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
  const provinceMap = new Map<string, CountrySubdivisionEntity>();
  
  try {
    const csvContent = await downloadCSV(DATA_URLS.provincias);
    const provinces = parseCSV(csvContent);
    
    for (const prov of provinces) {
      const indecCode = prov.id?.padStart(2, "0") || prov.provincia_id?.padStart(2, "0");
      const isoCode = PROVINCE_ISO_CODES[indecCode] || `AR-${indecCode}`;
      const name = prov.nombre || prov.provincia_nombre;
      
      // Determine type
      let type = "province";
      if (indecCode === "02") {
        type = "autonomous_city";
      }
      
      // CABA is part of AMBA
      const isAmbaParty = indecCode === "02";
      
      const subdivision = subdivisionRepo.create({
        countryId: country.id,
        code: isoCode,
        name: name,
        type: type,
        isAmbaParty: isAmbaParty,
      });
      
      const saved = await subdivisionRepo.save(subdivision);
      provinceMap.set(indecCode, saved);
    }
    
    console.log(`✅ ${provinceMap.size} provinces/districts inserted`);
  } catch (error) {
    console.error("⚠️  Error downloading provinces, using fallback data...");
    
    // Fallback: Insert main provinces manually
    const fallbackProvinces = [
      { code: "02", name: "Ciudad Autónoma de Buenos Aires", type: "autonomous_city", isAmba: true },
      { code: "06", name: "Buenos Aires", type: "province", isAmba: false },
    ];
    
    for (const prov of fallbackProvinces) {
      const subdivision = subdivisionRepo.create({
        countryId: country.id,
        code: PROVINCE_ISO_CODES[prov.code],
        name: prov.name,
        type: prov.type,
        isAmbaParty: prov.isAmba,
      });
      
      const saved = await subdivisionRepo.save(subdivision);
      provinceMap.set(prov.code, saved);
    }
    
    console.log(`✅ ${provinceMap.size} provinces inserted (fallback)`);
  }
  
  return provinceMap;
}

async function seedDepartamentos(
  dataSource: typeof AppDataSource,
  country: CountryEntity,
  provinceMap: Map<string, CountrySubdivisionEntity>
): Promise<Map<string, CountrySubdivisionEntity>> {
  console.log("🏘️  Downloading and seeding departamentos/partidos...");
  
  const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
  const departamentoMap = new Map<string, CountrySubdivisionEntity>();
  
  try {
    const csvContent = await downloadCSV(DATA_URLS.departamentos);
    const departamentos = parseCSV(csvContent);
    
    let count = 0;
    for (const dept of departamentos) {
      const deptId = dept.id || dept.departamento_id;
      const provinciaId = dept.provincia_id?.padStart(2, "0");
      const name = dept.nombre || dept.departamento_nombre;
      
      // Get parent province
      const parentProvince = provinceMap.get(provinciaId);
      if (!parentProvince) {
        continue;
      }
      
      // Generate code for partido/departamento
      const deptCode = `${parentProvince.code}-${deptId.slice(-3)}`;
      
      // Determine type based on province
      let type = "department";
      if (provinciaId === "06") {
        type = "partido";
      } else if (provinciaId === "02") {
        type = "comuna";
      }
      
      // Check if it's an AMBA partido
      const isAmbaParty = AMBA_PARTIDO_CODES.includes(deptId);
      
      const subdivision = subdivisionRepo.create({
        countryId: country.id,
        parentSubdivisionId: parentProvince.id,
        code: deptCode,
        name: name,
        type: type,
        isAmbaParty: isAmbaParty,
      });
      
      const saved = await subdivisionRepo.save(subdivision);
      departamentoMap.set(deptId, saved);
      count++;
    }
    
    console.log(`✅ ${count} departamentos/partidos inserted`);
    console.log(`   📍 ${AMBA_PARTIDO_CODES.length} marked as AMBA partidos`);
  } catch (error) {
    console.error("⚠️  Error downloading departamentos:", error);
  }
  
  return departamentoMap;
}

async function seedLocalidades(
  dataSource: typeof AppDataSource,
  departamentoMap: Map<string, CountrySubdivisionEntity>
): Promise<void> {
  console.log("🏠 Downloading and seeding localities...");
  
  const localityRepo = dataSource.getRepository(LocalityEntity);
  
  try {
    const csvContent = await downloadCSV(DATA_URLS.localidades);
    const localidades = parseCSV(csvContent);
    
    let count = 0;
    const batchSize = 100;
    let batch: LocalityEntity[] = [];
    
    for (const loc of localidades) {
      const departamentoId = loc.departamento_id;
      const name = loc.nombre || loc.localidad_nombre;
      const censusCode = loc.id || loc.localidad_id;
      
      // Get parent departamento
      const parentDept = departamentoMap.get(departamentoId);
      if (!parentDept) {
        continue;
      }
      
      // Determine type
      let type = "locality";
      const categoria = loc.categoria?.toLowerCase() || "";
      if (categoria.includes("ciudad")) {
        type = "city";
      } else if (categoria.includes("pueblo")) {
        type = "town";
      } else if (categoria.includes("barrio")) {
        type = "neighborhood";
      } else if (categoria.includes("paraje")) {
        type = "village";
      }
      
      const locality = localityRepo.create({
        subdivisionId: parentDept.id,
        name: name,
        type: type,
        censusCode: censusCode,
      });
      
      batch.push(locality);
      
      if (batch.length >= batchSize) {
        await localityRepo.save(batch);
        count += batch.length;
        batch = [];
        process.stdout.write(`\r   Inserted ${count} localities...`);
      }
    }
    
    // Save remaining
    if (batch.length > 0) {
      await localityRepo.save(batch);
      count += batch.length;
    }
    
    console.log(`\n✅ ${count} localities inserted`);
  } catch (error) {
    console.error("⚠️  Error downloading localities:", error);
  }
}

async function main() {
  console.log("🚀 Starting location data seed...\n");
  
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("📦 Database connected\n");
    
    // Run migrations
    await AppDataSource.runMigrations();
    console.log("🔧 Migrations completed\n");
    
    // Seed data
    const country = await seedCountries(AppDataSource);
    const provinceMap = await seedProvinces(AppDataSource, country);
    const departamentoMap = await seedDepartamentos(AppDataSource, country, provinceMap);
    await seedLocalidades(AppDataSource, departamentoMap);
    
    console.log("\n🎉 Seed completed successfully!");
    
    // Print summary
    const countryCount = await AppDataSource.getRepository(CountryEntity).count();
    const subdivisionCount = await AppDataSource.getRepository(CountrySubdivisionEntity).count();
    const localityCount = await AppDataSource.getRepository(LocalityEntity).count();
    const ambaCount = await AppDataSource.getRepository(CountrySubdivisionEntity).count({
      where: { isAmbaParty: true },
    });
    
    console.log("\n📊 Summary:");
    console.log(`   Countries: ${countryCount}`);
    console.log(`   Subdivisions: ${subdivisionCount}`);
    console.log(`   Localities: ${localityCount}`);
    console.log(`   AMBA partidos: ${ambaCount}`);
    
  } catch (error) {
    console.error("❌ Error during seed:", error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
