import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CountrySubdivisionEntity } from "./country-subdivision.entity";

/**
 * Locality Entity - Cities, towns, neighborhoods
 * Reference table (read-only in production)
 */
@Entity("localities")
export class LocalityEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column({ type: "integer" })
  subdivisionId!: number;

  @Column({ type: "varchar" })
  name!: string; // "Lomas de Zamora", "Palermo", "Banfield"

  @Column({ type: "varchar" })
  type!: string; // "city", "neighborhood", "town", "village"

  @Column({ type: "varchar", nullable: true })
  censusCode?: string; // Código INDEC de localidad censal

  // Relations
  @ManyToOne(() => CountrySubdivisionEntity, (subdivision) => subdivision.localities)
  @JoinColumn({ name: "subdivisionId" })
  subdivision!: CountrySubdivisionEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
