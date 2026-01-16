import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { CountryEntity } from "./entities/country.entity";
import { CountrySubdivisionEntity } from "./entities/country-subdivision.entity";
import { LocalityEntity } from "./entities/locality.entity";

/**
 * Example queries demonstrating the ISO 3166-2 location system
 */
async function main() {
  console.log("🌍 ISO 3166-2 Argentina Location System\n");
  
  try {
    await AppDataSource.initialize();
    console.log("📦 Database connected\n");
    
    const countryRepo = AppDataSource.getRepository(CountryEntity);
    const subdivisionRepo = AppDataSource.getRepository(CountrySubdivisionEntity);
    const localityRepo = AppDataSource.getRepository(LocalityEntity);
    
    // Example 1: Get all countries
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 1: List all countries");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const countries = await countryRepo.find();
    countries.forEach((c) => console.log(`   ${c.code}: ${c.name}`));
    
    // Example 2: Get all provinces of Argentina
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 2: List provinces (top-level subdivisions)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const provinces = await subdivisionRepo.find({
      where: { parentSubdivisionId: undefined },
      order: { name: "ASC" },
      take: 10,
    });
    provinces.forEach((p) => console.log(`   ${p.code}: ${p.name} (${p.type})`));
    console.log("   ... and more");
    
    // Example 3: Get AMBA partidos
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 3: List AMBA partidos (isAmbaParty = true)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const ambaPartidos = await subdivisionRepo.find({
      where: { isAmbaParty: true },
      order: { name: "ASC" },
      take: 10,
    });
    console.log(`   Found ${await subdivisionRepo.count({ where: { isAmbaParty: true } })} AMBA partidos:`);
    ambaPartidos.forEach((p) => console.log(`   • ${p.name} (${p.type})`));
    console.log("   ... and more");
    
    // Example 4: Get partidos of Buenos Aires province
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 4: Hierarchical query - Partidos of Buenos Aires");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const buenosAires = await subdivisionRepo.findOne({
      where: { code: "AR-B" },
    });
    if (buenosAires) {
      const partidos = await subdivisionRepo.find({
        where: { parentSubdivisionId: buenosAires.id },
        order: { name: "ASC" },
        take: 10,
      });
      console.log(`   Province: ${buenosAires.name} (${buenosAires.code})`);
      console.log(`   Partidos (showing 10 of ${await subdivisionRepo.count({ where: { parentSubdivisionId: buenosAires.id } })}):`);
      partidos.forEach((p) => console.log(`   • ${p.name}${p.isAmbaParty ? " 🏙️ AMBA" : ""}`));
    }
    
    // Example 5: Get localities of a partido
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 5: Localities in Lomas de Zamora");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const lomasDeZamora = await subdivisionRepo.findOne({
      where: { name: "Lomas de Zamora" },
    });
    if (lomasDeZamora) {
      const localities = await localityRepo.find({
        where: { subdivisionId: lomasDeZamora.id },
        order: { name: "ASC" },
        take: 10,
      });
      console.log(`   Partido: ${lomasDeZamora.name} (AMBA: ${lomasDeZamora.isAmbaParty})`);
      console.log(`   Localities:`);
      localities.forEach((l) => console.log(`   • ${l.name} (${l.type})`));
    } else {
      console.log("   No data found. Run 'pnpm seed' first.");
    }
    
    // Example 6: Search query simulation
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Example 6: Search simulation - Find all in AMBA");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const ambaQuery = subdivisionRepo
      .createQueryBuilder("subdivision")
      .where("subdivision.isAmbaParty = :isAmba", { isAmba: true })
      .orderBy("subdivision.name", "ASC");
    
    const [ambaResults, ambaTotal] = await ambaQuery.getManyAndCount();
    console.log(`   Query: WHERE isAmbaParty = true`);
    console.log(`   Results: ${ambaTotal} subdivisions in AMBA`);
    console.log(`   First 5:`);
    ambaResults.slice(0, 5).forEach((s) => console.log(`   • ${s.name}`));
    
    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Database Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const countryCount = await countryRepo.count();
    const subdivisionCount = await subdivisionRepo.count();
    const localityCount = await localityRepo.count();
    const ambaCount = await subdivisionRepo.count({ where: { isAmbaParty: true } });
    
    console.log(`   Countries: ${countryCount}`);
    console.log(`   Subdivisions: ${subdivisionCount}`);
    console.log(`   Localities: ${localityCount}`);
    console.log(`   AMBA partidos: ${ambaCount}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
