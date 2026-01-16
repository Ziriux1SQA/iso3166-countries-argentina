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
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  countryId!: number;

  @Column({ nullable: true })
  parentSubdivisionId?: number;

  @Column({ unique: true })
  code!: string; // ISO 3166-2: "AR-B", "AR-C", "US-CA"

  @Column()
  name!: string; // "Buenos Aires", "CABA", "California"

  @Column()
  type!: string; // "province", "autonomous_city", "partido", "state", "department"

  @Column({ default: false })
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
