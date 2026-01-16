import "reflect-metadata";
import { DataSource } from "typeorm";
import { CountryEntity } from "../entities/country.entity";
import { CountrySubdivisionEntity } from "../entities/country-subdivision.entity";
import { LocalityEntity } from "../entities/locality.entity";

export const AppDataSource = new DataSource({
  type: "sqljs",
  location: "./database.sqlite",
  autoSave: true,
  synchronize: false,
  logging: true,
  entities: [CountryEntity, CountrySubdivisionEntity, LocalityEntity],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});
