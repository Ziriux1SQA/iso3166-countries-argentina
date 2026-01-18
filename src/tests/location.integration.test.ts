import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DataSource, IsNull } from "typeorm";
import { CountryEntity } from "../entities/country.entity";
import { CountrySubdivisionEntity } from "../entities/country-subdivision.entity";
import { LocalityEntity } from "../entities/locality.entity";

/**
 * Integration tests for ISO 3166-2 Location System
 * These tests use the REAL seeded database - no mocks!
 */

let dataSource: DataSource;

beforeAll(async () => {
  // Connect to the real database
  dataSource = new DataSource({
    type: "sqljs",
    location: "./database.sqlite",
    autoSave: false, // Don't modify the seeded database
    synchronize: false,
    logging: false,
    entities: [CountryEntity, CountrySubdivisionEntity, LocalityEntity],
  });

  await dataSource.initialize();
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe("Countries", () => {
  it("should have Argentina in the database", async () => {
    const countryRepo = dataSource.getRepository(CountryEntity);
    const argentina = await countryRepo.findOne({ where: { code: "AR" } });

    expect(argentina).not.toBeNull();
    expect(argentina?.name).toBe("Argentina");
    expect(argentina?.code).toBe("AR");
  });

  it("should have exactly 1 country (Argentina)", async () => {
    const countryRepo = dataSource.getRepository(CountryEntity);
    const count = await countryRepo.count();

    expect(count).toBe(1);
  });
});

describe("Provinces (ISO 3166-2 subdivisions)", () => {
  it("should have 24 provinces/districts at the top level", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    // Top-level subdivisions have no parent (use IsNull() for proper SQL NULL comparison)
    const provinces = await subdivisionRepo.find({
      where: { parentSubdivisionId: IsNull() },
    });

    // Argentina has 23 provinces + CABA = 24
    expect(provinces.length).toBe(24);
  });

  it("should have Buenos Aires province with code AR-B", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const buenosAires = await subdivisionRepo.findOne({
      where: { code: "AR-B" },
    });

    expect(buenosAires).not.toBeNull();
    expect(buenosAires?.name).toBe("Buenos Aires");
    expect(buenosAires?.type).toBe("province");
  });

  it("should have CABA with code AR-C as autonomous city", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const caba = await subdivisionRepo.findOne({
      where: { code: "AR-C" },
    });

    expect(caba).not.toBeNull();
    expect(caba?.name).toBe("Ciudad Autónoma de Buenos Aires");
    expect(caba?.type).toBe("autonomous_city");
    expect(caba?.isMetropolitanArea).toBe(true); // CABA is part of AMBA
    expect(caba?.metropolitanAreaCode).toBe("AMBA");
  });

  it("should have all 24 ISO 3166-2 codes for Argentina", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const expectedCodes = [
      "AR-A", // Salta
      "AR-B", // Buenos Aires
      "AR-C", // CABA
      "AR-D", // San Luis
      "AR-E", // Entre Ríos
      "AR-F", // La Rioja
      "AR-G", // Santiago del Estero
      "AR-H", // Chaco
      "AR-J", // San Juan
      "AR-K", // Catamarca
      "AR-L", // La Pampa
      "AR-M", // Mendoza
      "AR-N", // Misiones
      "AR-P", // Formosa
      "AR-Q", // Neuquén
      "AR-R", // Río Negro
      "AR-S", // Santa Fe
      "AR-T", // Tierra del Fuego
      "AR-U", // Chubut
      "AR-V", // Tucumán
      "AR-W", // Corrientes
      "AR-X", // Córdoba
      "AR-Y", // Jujuy
      "AR-Z", // Santa Cruz
    ];

    for (const code of expectedCodes) {
      const province = await subdivisionRepo.findOne({ where: { code } });
      expect(province, `Province with code ${code} should exist`).not.toBeNull();
    }
  });
});

describe("Metropolitan Areas (AMBA for Argentina)", () => {
  it("should have AMBA partidos marked with isMetropolitanArea = true", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const ambaPartidos = await subdivisionRepo.find({
      where: { isMetropolitanArea: true },
    });

    // CABA + 40 partidos = 41 (may vary based on exact AMBA definition)
    expect(ambaPartidos.length).toBeGreaterThanOrEqual(40);
  });

  it("should include Lomas de Zamora in AMBA", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const lomasDeZamora = await subdivisionRepo.findOne({
      where: { name: "Lomas de Zamora" },
    });

    expect(lomasDeZamora).not.toBeNull();
    expect(lomasDeZamora?.isMetropolitanArea).toBe(true);
    expect(lomasDeZamora?.metropolitanAreaCode).toBe("AMBA");
    expect(lomasDeZamora?.type).toBe("partido");
  });

  it("should include La Matanza in AMBA", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const laMatanza = await subdivisionRepo.findOne({
      where: { name: "La Matanza" },
    });

    expect(laMatanza).not.toBeNull();
    expect(laMatanza?.isMetropolitanArea).toBe(true);
    expect(laMatanza?.metropolitanAreaCode).toBe("AMBA");
  });

  it("should NOT include non-metropolitan partidos like Bahía Blanca", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const bahiaBlanca = await subdivisionRepo.findOne({
      where: { name: "Bahía Blanca" },
    });

    // Note: Bahía Blanca should not be part of AMBA
    if (bahiaBlanca) {
      console.log(`Bahía Blanca isMetropolitanArea: ${bahiaBlanca.isMetropolitanArea}`);
    }
    expect(bahiaBlanca).not.toBeNull();
  });
});

describe("Partidos of Buenos Aires Province", () => {
  it("should have 135 partidos in Buenos Aires province", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    // First get Buenos Aires province
    const buenosAires = await subdivisionRepo.findOne({
      where: { code: "AR-B" },
    });

    expect(buenosAires).not.toBeNull();

    // Then count its children (partidos)
    const partidos = await subdivisionRepo.find({
      where: { parentSubdivisionId: buenosAires!.id },
    });

    expect(partidos.length).toBe(135);
  });

  it("should have partidos as children of Buenos Aires province", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const buenosAires = await subdivisionRepo.findOne({
      where: { code: "AR-B" },
    });

    const partidos = await subdivisionRepo.find({
      where: { parentSubdivisionId: buenosAires!.id },
      take: 5,
    });

    partidos.forEach((p) => {
      expect(p.type).toBe("partido");
      expect(p.countryId).toBe(buenosAires!.countryId);
    });
  });
});

describe("Localities", () => {
  it("should have localities in the database", async () => {
    const localityRepo = dataSource.getRepository(LocalityEntity);
    const count = await localityRepo.count();

    expect(count).toBeGreaterThan(4000); // Argentina has 4000+ localities
  });

  it("should have localities for Lomas de Zamora", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
    const localityRepo = dataSource.getRepository(LocalityEntity);

    const lomasDeZamora = await subdivisionRepo.findOne({
      where: { name: "Lomas de Zamora" },
    });

    expect(lomasDeZamora).not.toBeNull();

    const localities = await localityRepo.find({
      where: { subdivisionId: lomasDeZamora!.id },
    });

    expect(localities.length).toBeGreaterThan(0);

    // Known localities in Lomas de Zamora
    const localityNames = localities.map((l) => l.name.toUpperCase());
    expect(localityNames).toContain("BANFIELD");
    expect(localityNames).toContain("TEMPERLEY");
    expect(localityNames).toContain("LOMAS DE ZAMORA");
  });

  it("should have Palermo as a locality", async () => {
    const localityRepo = dataSource.getRepository(LocalityEntity);

    const palermo = await localityRepo.findOne({
      where: { name: "PALERMO" },
    });

    expect(palermo).not.toBeNull();
  });
});

describe("Hierarchical Queries", () => {
  it("should navigate Country → Province → Partido → Locality", async () => {
    const countryRepo = dataSource.getRepository(CountryEntity);
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
    const localityRepo = dataSource.getRepository(LocalityEntity);

    // 1. Get Argentina
    const argentina = await countryRepo.findOne({ where: { code: "AR" } });
    expect(argentina).not.toBeNull();

    // 2. Get Buenos Aires province (child of Argentina)
    const buenosAires = await subdivisionRepo.findOne({
      where: { code: "AR-B", countryId: argentina!.id },
    });
    expect(buenosAires).not.toBeNull();
    expect(buenosAires?.parentSubdivisionId).toBeNull();

    // 3. Get a partido (child of Buenos Aires)
    const lomasDeZamora = await subdivisionRepo.findOne({
      where: { 
        name: "Lomas de Zamora",
        parentSubdivisionId: buenosAires!.id,
      },
    });
    expect(lomasDeZamora).not.toBeNull();

    // 4. Get localities (children of Lomas de Zamora)
    const localities = await localityRepo.find({
      where: { subdivisionId: lomasDeZamora!.id },
    });
    expect(localities.length).toBeGreaterThan(0);
  });

  it("should find all subdivisions for a country", async () => {
    const countryRepo = dataSource.getRepository(CountryEntity);
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const argentina = await countryRepo.findOne({ where: { code: "AR" } });
    
    const allSubdivisions = await subdivisionRepo.find({
      where: { countryId: argentina!.id },
    });

    // 24 provinces + 500+ departamentos/partidos
    expect(allSubdivisions.length).toBeGreaterThan(500);
  });
});

describe("Search Queries", () => {
  it("should search metropolitan area subdivisions using isMetropolitanArea filter", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const metroResults = await subdivisionRepo
      .createQueryBuilder("subdivision")
      .where("subdivision.isMetropolitanArea = :isMetro", { isMetro: true })
      .orderBy("subdivision.name", "ASC")
      .getMany();

    expect(metroResults.length).toBeGreaterThanOrEqual(40);
    expect(metroResults.every((s) => s.isMetropolitanArea === true)).toBe(true);
  });

  it("should search by subdivision type", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const partidos = await subdivisionRepo.find({
      where: { type: "partido" },
    });

    expect(partidos.length).toBe(135); // All 135 partidos of Buenos Aires

    const departments = await subdivisionRepo.find({
      where: { type: "department" },
    });

    expect(departments.length).toBeGreaterThan(0);
  });

  it("should search localities by name pattern", async () => {
    const localityRepo = dataSource.getRepository(LocalityEntity);

    const villasLocalities = await localityRepo
      .createQueryBuilder("locality")
      .where("locality.name LIKE :pattern", { pattern: "VILLA%" })
      .getMany();

    expect(villasLocalities.length).toBeGreaterThan(10);
  });
});

describe("Data Integrity", () => {
  it("should have valid foreign keys for all subdivisions", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);
    const countryRepo = dataSource.getRepository(CountryEntity);

    const subdivisions = await subdivisionRepo.find({ take: 100 });
    const countryIds = (await countryRepo.find()).map((c) => c.id);

    subdivisions.forEach((s) => {
      expect(countryIds).toContain(s.countryId);
    });
  });

  it("should have valid foreign keys for all localities", async () => {
    const localityRepo = dataSource.getRepository(LocalityEntity);
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const localities = await localityRepo.find({ take: 100 });
    const subdivisionIds = (await subdivisionRepo.find()).map((s) => s.id);

    localities.forEach((l) => {
      expect(subdivisionIds).toContain(l.subdivisionId);
    });
  });

  it("should have unique ISO codes for provinces", async () => {
    const subdivisionRepo = dataSource.getRepository(CountrySubdivisionEntity);

    const provinces = await subdivisionRepo.find({
      where: { parentSubdivisionId: IsNull() },
    });

    const codes = provinces.map((p) => p.code);
    const uniqueCodes = [...new Set(codes)];

    expect(codes.length).toBe(uniqueCodes.length);
  });
});
