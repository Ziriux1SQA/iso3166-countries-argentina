import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { AppDataSource } from "../config/data-source";
import { CountryEntity } from "../entities/country.entity";
import { CountrySubdivisionEntity } from "../entities/country-subdivision.entity";
import { LocalityEntity } from "../entities/locality.entity";
import { IsNull } from "typeorm";

/**
 * Script para exportar los datos de la base a archivos JSON
 * Estos archivos se pueden acceder directamente via GitHub Raw URL
 */

const EXPORT_DIR = path.join(process.cwd(), "exports");

interface ExportedProvince {
  code: string;
  name: string;
  type: string;
  isMetropolitanArea: boolean;
  metropolitanAreaCode?: string;
}

interface ExportedDepartment {
  code: string;
  name: string;
  type: string;
  provinceCode: string;
  provinceName: string;
  isMetropolitanArea: boolean;
  metropolitanAreaCode?: string;
}

interface ExportedLocality {
  name: string;
  type: string;
  censusCode?: string;
  latitude?: number;
  longitude?: number;
  departmentCode: string;
  departmentName: string;
  provinceCode: string;
  provinceName: string;
}

async function main() {
  console.log("📦 Exportando datos a JSON...\n");

  // Crear directorio de exports si no existe
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  await AppDataSource.initialize();
  console.log("✅ Conectado a la base de datos\n");

  const subdivisionRepo = AppDataSource.getRepository(CountrySubdivisionEntity);
  const localityRepo = AppDataSource.getRepository(LocalityEntity);

  // 1. Exportar provincias
  console.log("🏛️  Exportando provincias...");
  const provinces = await subdivisionRepo.find({
    where: { parentSubdivisionId: IsNull() },
    order: { name: "ASC" },
  });

  const exportedProvinces: ExportedProvince[] = provinces.map((p) => ({
    code: p.code,
    name: p.name,
    type: p.type,
    isMetropolitanArea: p.isMetropolitanArea,
    metropolitanAreaCode: p.metropolitanAreaCode || undefined,
  }));

  fs.writeFileSync(
    path.join(EXPORT_DIR, "provincias.json"),
    JSON.stringify(exportedProvinces, null, 2)
  );
  console.log(`   ✅ ${exportedProvinces.length} provincias exportadas`);

  // 2. Exportar departamentos/partidos
  console.log("\n🏘️  Exportando departamentos/partidos...");
  const departments = await subdivisionRepo.find({
    where: { parentSubdivisionId: IsNull() },
  });

  const provinceMap = new Map(provinces.map((p) => [p.id, p]));

  const allDepartments = await subdivisionRepo
    .createQueryBuilder("dept")
    .where("dept.parentSubdivisionId IS NOT NULL")
    .orderBy("dept.name", "ASC")
    .getMany();

  const exportedDepartments: ExportedDepartment[] = allDepartments.map((d) => {
    const province = provinceMap.get(d.parentSubdivisionId!);
    return {
      code: d.code,
      name: d.name,
      type: d.type,
      provinceCode: province?.code || "",
      provinceName: province?.name || "",
      isMetropolitanArea: d.isMetropolitanArea,
      metropolitanAreaCode: d.metropolitanAreaCode || undefined,
    };
  });

  fs.writeFileSync(
    path.join(EXPORT_DIR, "departamentos.json"),
    JSON.stringify(exportedDepartments, null, 2)
  );
  console.log(`   ✅ ${exportedDepartments.length} departamentos exportados`);

  // 3. Exportar AMBA
  console.log("\n📍 Exportando partidos del AMBA...");
  const ambaSubdivisions = exportedDepartments.filter((d) => d.isMetropolitanArea);
  // Incluir CABA también
  const cabaProvince = exportedProvinces.find((p) => p.code === "AR-C");
  const ambaExport = {
    description: "Área Metropolitana de Buenos Aires (AMBA)",
    count: ambaSubdivisions.length + (cabaProvince ? 1 : 0),
    caba: cabaProvince,
    partidos: ambaSubdivisions,
  };

  fs.writeFileSync(
    path.join(EXPORT_DIR, "amba.json"),
    JSON.stringify(ambaExport, null, 2)
  );
  console.log(`   ✅ ${ambaExport.count} subdivisiones del AMBA exportadas`);

  // 4. Exportar localidades
  console.log("\n🏠 Exportando localidades...");
  const deptMap = new Map(allDepartments.map((d) => [d.id, d]));

  const localities = await localityRepo.find({
    order: { name: "ASC" },
  });

  const exportedLocalities: ExportedLocality[] = localities.map((l) => {
    const dept = deptMap.get(l.subdivisionId);
    const province = dept ? provinceMap.get(dept.parentSubdivisionId!) : undefined;
    return {
      name: l.name,
      type: l.type,
      censusCode: l.censusCode || undefined,
      latitude: l.latitude ? Number(l.latitude) : undefined,
      longitude: l.longitude ? Number(l.longitude) : undefined,
      departmentCode: dept?.code || "",
      departmentName: dept?.name || "",
      provinceCode: province?.code || "",
      provinceName: province?.name || "",
    };
  });

  fs.writeFileSync(
    path.join(EXPORT_DIR, "localidades.json"),
    JSON.stringify(exportedLocalities, null, 2)
  );
  console.log(`   ✅ ${exportedLocalities.length} localidades exportadas`);

  // 5. Exportar barrios de CABA
  console.log("\n🏙️  Exportando barrios de CABA...");
  const cabaSubdivisions = allDepartments.filter((d) => {
    const province = provinceMap.get(d.parentSubdivisionId!);
    return province?.code === "AR-C";
  });
  const cabaSubIds = new Set(cabaSubdivisions.map((c) => c.id));

  const barriosCaba = exportedLocalities.filter((l) => {
    const dept = allDepartments.find((d) => d.code === l.departmentCode);
    return dept && cabaSubIds.has(dept.id);
  });

  fs.writeFileSync(
    path.join(EXPORT_DIR, "barrios-caba.json"),
    JSON.stringify(barriosCaba, null, 2)
  );
  console.log(`   ✅ ${barriosCaba.length} barrios de CABA exportados`);

  // 6. Crear archivo índice con URLs
  const indexFile = {
    description: "Datos geográficos de Argentina - ISO 3166-2",
    source: "https://datos.gob.ar",
    generated: new Date().toISOString(),
    files: {
      provincias: {
        description: "24 provincias de Argentina con códigos ISO 3166-2",
        count: exportedProvinces.length,
        url: "https://raw.githubusercontent.com/MacroxW/iso3166-countries-argentina/main/exports/provincias.json",
      },
      departamentos: {
        description: "Departamentos, partidos y comunas",
        count: exportedDepartments.length,
        url: "https://raw.githubusercontent.com/MacroxW/iso3166-countries-argentina/main/exports/departamentos.json",
      },
      localidades: {
        description: "Localidades con coordenadas lat/lon",
        count: exportedLocalities.length,
        url: "https://raw.githubusercontent.com/MacroxW/iso3166-countries-argentina/main/exports/localidades.json",
      },
      amba: {
        description: "Partidos del Área Metropolitana de Buenos Aires",
        count: ambaExport.count,
        url: "https://raw.githubusercontent.com/MacroxW/iso3166-countries-argentina/main/exports/amba.json",
      },
      barriosCaba: {
        description: "Barrios de la Ciudad de Buenos Aires",
        count: barriosCaba.length,
        url: "https://raw.githubusercontent.com/MacroxW/iso3166-countries-argentina/main/exports/barrios-caba.json",
      },
    },
  };

  fs.writeFileSync(
    path.join(EXPORT_DIR, "index.json"),
    JSON.stringify(indexFile, null, 2)
  );

  console.log("\n" + "═".repeat(50));
  console.log("📦 EXPORTACIÓN COMPLETADA");
  console.log("═".repeat(50));
  console.log(`\n📁 Archivos generados en: ${EXPORT_DIR}`);
  console.log("\n🔗 URLs de acceso (después de push a GitHub):");
  console.log("   • provincias.json");
  console.log("   • departamentos.json");
  console.log("   • localidades.json");
  console.log("   • amba.json");
  console.log("   • barrios-caba.json");
  console.log("   • index.json (índice con todas las URLs)");

  await AppDataSource.destroy();
}

main().catch(console.error);
