import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

/**
 * Script para descargar los CSVs oficiales de datos.gob.ar
 * 
 * Uso: npx ts-node src/scripts/download-data.ts
 * 
 * Fuente oficial: Portal de Datos Abiertos de Argentina
 * https://datos.gob.ar/dataset/modernizacion-unidades-territoriales
 */

const DATA_DIR = path.join(__dirname, "../../data");

const DATA_SOURCES = {
  provincias: {
    url: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.7/download/provincias.csv",
    file: "provincias.csv",
    description: "24 provincias y CABA con códigos ISO 3166-2",
  },
  departamentos: {
    url: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.8/download/departamentos.csv",
    file: "departamentos.csv",
    description: "~530 departamentos, partidos y comunas",
  },
  localidades: {
    url: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/7/distribution/7.10/download/localidades.csv",
    file: "localidades.csv",
    description: "~4000 localidades con coordenadas y municipios",
  },
};

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`   ↪ Redirigiendo a ${redirectUrl.substring(0, 50)}...`);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);
      
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on("error", (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error("Timeout después de 60 segundos"));
    });
  });
}

async function main() {
  console.log("📥 Descargador de Datos de Argentina");
  console.log("=====================================\n");
  console.log("Fuente: Portal de Datos Abiertos (datos.gob.ar)\n");
  
  // Crear directorio si no existe
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`📁 Creando directorio ${DATA_DIR}...`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  for (const [name, source] of Object.entries(DATA_SOURCES)) {
    const destPath = path.join(DATA_DIR, source.file);
    
    console.log(`📄 ${name}`);
    console.log(`   ${source.description}`);
    
    // Verificar si ya existe y mostrar fecha
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      const modified = stats.mtime.toLocaleString();
      console.log(`   ⚠️  Archivo existente (${(stats.size / 1024).toFixed(1)} KB, modificado: ${modified})`);
    }
    
    console.log(`   ⬇️  Descargando...`);
    
    try {
      await downloadFile(source.url, destPath);
      const stats = fs.statSync(destPath);
      console.log(`   ✅ Guardado: ${source.file} (${(stats.size / 1024).toFixed(1)} KB)\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }
  
  console.log("=====================================");
  console.log("✅ Descarga completada\n");
  console.log("Archivos guardados en:", DATA_DIR);
  console.log("\nPróximo paso: npx ts-node src/scripts/seed-locations.ts");
}

main().catch(console.error);
