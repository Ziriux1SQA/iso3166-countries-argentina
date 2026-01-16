import "reflect-metadata";
import { AppDataSource } from "../../config/data-source";
import { verifyDataFiles, loadAmbaConfig } from "./data-loader";
import {
  seedCountry,
  seedProvincias,
  seedDepartamentos,
  seedLocalidades,
  printFinalStats,
} from "./seeders";

/**
 * Script principal para hacer seed de datos de ubicaciones de Argentina
 * 
 * Uso: pnpm seed
 * 
 * Prerrequisitos:
 * - Archivos CSV en data/ (ejecutar: pnpm data:download)
 * - Archivo amba-partidos.json en data/ (opcional)
 */
export async function runSeed(): Promise<void> {
  console.log("🚀 Argentina Location Data Seed");
  console.log("================================\n");
  
  // Verificar archivos de datos
  if (!verifyDataFiles()) {
    process.exit(1);
  }
  
  // Cargar configuración AMBA
  console.log("\n📍 Cargando configuración AMBA...");
  const ambaCodes = loadAmbaConfig();
  
  try {
    // Conectar a la base de datos
    console.log("\n📦 Conectando a la base de datos...");
    await AppDataSource.initialize();
    console.log("   ✅ Conexión establecida");
    
    // Ejecutar migraciones
    console.log("\n🔧 Ejecutando migraciones...");
    await AppDataSource.runMigrations();
    console.log("   ✅ Migraciones completadas");
    
    // Seed de datos
    const country = await seedCountry(AppDataSource);
    const provinciaMap = await seedProvincias(AppDataSource, country);
    const departamentoMap = await seedDepartamentos(AppDataSource, country, provinciaMap, ambaCodes);
    await seedLocalidades(AppDataSource, departamentoMap);
    
    // Resumen final
    console.log("\n" + "=".repeat(50));
    console.log("🎉 SEED COMPLETADO EXITOSAMENTE");
    console.log("=".repeat(50));
    
    await printFinalStats(AppDataSource, provinciaMap.size, departamentoMap.size);
    
  } catch (error) {
    console.error("\n❌ Error durante el seed:", error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log("\n📦 Conexión cerrada");
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  runSeed();
}
