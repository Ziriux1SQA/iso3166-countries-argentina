import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { CountryEntity } from "./country.entity";
import { LocalityEntity } from "./locality.entity";

/**
 * CountrySubdivision Entity - ISO 3166-2 administrative divisions
 * Supports hierarchical structure: Province -> Partido/Department
 * Reference table (read-only in production)
 */
@Entity("country_subdivisions")
export class CountrySubdivisionEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "integer" })
  countryId!: number;

  @Column({ type: "integer", nullable: true })
  parentSubdivisionId?: number;

  @Column({ type: "varchar", unique: true })
  code!: string; // ISO 3166-2: "AR-B", "AR-C", "US-CA"

  @Column({ type: "varchar" })
  name!: string; // "Buenos Aires", "CABA", "California"

  @Column({ type: "varchar" })
  type!: string; // "province", "autonomous_city", "partido", "state", "department"

  @Column({ type: "boolean", default: false })
  isAmbaParty!: boolean; // TRUE for CABA + 40 AMBA partidos

  // Relations
  @ManyToOne(() => CountryEntity, (country) => country.subdivisions)
  @JoinColumn({ name: "countryId" })
  country!: CountryEntity;

  @ManyToOne(() => CountrySubdivisionEntity, (subdivision) => subdivision.children, {
    nullable: true,
  })
  @JoinColumn({ name: "parentSubdivisionId" })
  parent?: CountrySubdivisionEntity;

  @OneToMany(() => CountrySubdivisionEntity, (subdivision) => subdivision.parent)
  children!: CountrySubdivisionEntity[];

  @OneToMany(() => LocalityEntity, (locality) => locality.subdivision)
  localities!: LocalityEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
