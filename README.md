# ISO 3166-2 Argentina Location Database

Mini proyecto de ejemplo para crear tablas de base de datos siguiendo el estándar ISO 3166-2 con datos oficiales de Argentina.

## 📋 Descripción

Este proyecto implementa un sistema de ubicaciones normalizado basado en el estándar ISO 3166-2, específicamente diseñado para Argentina. Incluye:

- **Countries**: Países con códigos ISO 3166-1 alpha-2 (`AR`, `US`, etc.)
- **Country Subdivisions**: Divisiones administrativas jerárquicas
  - Provincias (nivel 1)
  - Departamentos/Partidos (nivel 2)
- **Localities**: Ciudades, pueblos, barrios y parajes

### Características especiales

- ✅ Códigos ISO 3166-2 oficiales para todas las provincias argentinas
- ✅ Soporte para estructura jerárquica (Provincia → Partido → Localidad)
- ✅ Flag `isAmbaParty` para identificar los 40 partidos del AMBA + CABA
- ✅ Datos descargados desde [datos.gob.ar](https://datos.gob.ar/) (INDEC)

## 🗃️ Estructura de Tablas

```
┌─────────────────┐
│    countries    │
├─────────────────┤
│ id              │
│ code (AR, US)   │
│ name            │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐
│  country_subdivisions   │
├─────────────────────────┤
│ id                      │
│ countryId (FK)          │
│ parentSubdivisionId (FK)│  ◄── Self-reference para jerarquía
│ code (AR-B, AR-C)       │
│ name                    │
│ type                    │
│ isAmbaParty             │  ◄── TRUE para CABA + 40 partidos AMBA
└────────┬────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│   localities    │
├─────────────────┤
│ id              │
│ subdivisionId   │
│ name            │
│ type            │
│ censusCode      │
└─────────────────┘
```

## 🚀 Instalación

```bash
# Instalar dependencias con pnpm
pnpm install

# Ejecutar migraciones y seed de datos de Argentina
pnpm seed

# Ver ejemplos de consultas
pnpm dev
```

## 📦 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm seed` | Descarga datos de Argentina y puebla la BD |
| `pnpm dev` | Ejecuta ejemplos de consultas |
| `pnpm build` | Compila TypeScript |
| `pnpm start` | Ejecuta versión compilada |

## 📊 Datos de Argentina

### Fuentes oficiales (datos.gob.ar)

| Archivo | URL |
|---------|-----|
| Provincias | https://infra.datos.gob.ar/.../provincias.csv |
| Departamentos | https://infra.datos.gob.ar/.../departamentos.csv |
| Localidades | https://infra.datos.gob.ar/.../localidades.csv |

### Códigos ISO 3166-2 de Argentina

| Código | Provincia |
|--------|-----------|
| AR-C | Ciudad Autónoma de Buenos Aires |
| AR-B | Buenos Aires |
| AR-K | Catamarca |
| AR-X | Córdoba |
| AR-W | Corrientes |
| AR-H | Chaco |
| AR-U | Chubut |
| AR-E | Entre Ríos |
| AR-P | Formosa |
| AR-Y | Jujuy |
| AR-L | La Pampa |
| AR-F | La Rioja |
| AR-M | Mendoza |
| AR-N | Misiones |
| AR-Q | Neuquén |
| AR-R | Río Negro |
| AR-A | Salta |
| AR-J | San Juan |
| AR-D | San Luis |
| AR-Z | Santa Cruz |
| AR-S | Santa Fe |
| AR-G | Santiago del Estero |
| AR-V | Tucumán |
| AR-T | Tierra del Fuego |

### AMBA (Área Metropolitana de Buenos Aires)

El campo `isAmbaParty` está marcado como `true` para:
- CABA (Ciudad Autónoma de Buenos Aires)
- 40 partidos del conurbano bonaerense

## 💡 Ejemplos de uso

### Obtener todas las provincias

```typescript
const provinces = await subdivisionRepo.find({
  where: { parentSubdivisionId: IsNull() },
  order: { name: "ASC" },
});
```

### Obtener partidos del AMBA

```typescript
const ambaPartidos = await subdivisionRepo.find({
  where: { isAmbaParty: true },
  order: { name: "ASC" },
});
```

### Obtener partidos de Buenos Aires

```typescript
const bsAs = await subdivisionRepo.findOne({ where: { code: "AR-B" } });
const partidos = await subdivisionRepo.find({
  where: { parentSubdivisionId: bsAs.id },
});
```

### Obtener localidades de un partido

```typescript
const lomasDeZamora = await subdivisionRepo.findOne({ 
  where: { name: "Lomas de Zamora" } 
});
const localities = await localityRepo.find({
  where: { subdivisionId: lomasDeZamora.id },
});
```

## 🔍 Flujo Frontend (ejemplo)

```
1. País:      GET /locations/countries 
              → Select "Argentina" (id: 1)

2. Provincia: GET /locations/subdivisions?countryId=1 
              → Select "Buenos Aires" (id: 2, code: AR-B)

3. Partido:   GET /locations/subdivisions?parentId=2 
              → Select "Lomas de Zamora" (id: 102)

4. Localidad: GET /locations/localities?subdivisionId=102 
              → Select "Banfield" (id: 1020)

5. Submit:    { countryId: 1, subdivisionId: 102, localityId: 1020 }
```

## 📁 Estructura del proyecto

```
src/
├── config/
│   └── data-source.ts      # Configuración TypeORM
├── entities/
│   ├── country.entity.ts
│   ├── country-subdivision.entity.ts
│   └── locality.entity.ts
├── migrations/
│   └── 1705000000000-CreateLocationTables.ts
├── scripts/
│   └── seed-locations.ts   # Descarga y puebla datos
└── index.ts                # Ejemplos de consultas
```

## 📄 Licencia

MIT
