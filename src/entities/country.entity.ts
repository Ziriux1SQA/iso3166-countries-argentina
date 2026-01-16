import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { CountrySubdivisionEntity } from "./country-subdivision.entity";

/**
 * Country Entity - ISO 3166-1 alpha-2 country codes
 * Reference table (read-only in production)
 */
@Entity("countries")
export class CountryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 2 })
  code!: string; // ISO 3166-1 alpha-2: "AR", "US"

  @Column()
  name!: string; // "Argentina", "United States"

  @OneToMany(() => CountrySubdivisionEntity, (subdivision) => subdivision.country)
  subdivisions!: CountrySubdivisionEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
