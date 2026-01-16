import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateLocationTables1705000000000 implements MigrationInterface {
  name = "CreateLocationTables1705000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create countries table
    await queryRunner.createTable(
      new Table({
        name: "countries",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "code",
            type: "varchar",
            length: "2",
            isUnique: true,
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "createdAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Create country_subdivisions table
    await queryRunner.createTable(
      new Table({
        name: "country_subdivisions",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "countryId",
            type: "integer",
          },
          {
            name: "parentSubdivisionId",
            type: "integer",
            isNullable: true,
          },
          {
            name: "code",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "type",
            type: "varchar",
          },
          {
            name: "isAmbaParty",
            type: "boolean",
            default: false,
          },
          {
            name: "createdAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Create localities table
    await queryRunner.createTable(
      new Table({
        name: "localities",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "subdivisionId",
            type: "integer",
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "type",
            type: "varchar",
          },
          {
            name: "censusCode",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      "country_subdivisions",
      new TableForeignKey({
        columnNames: ["countryId"],
        referencedColumnNames: ["id"],
        referencedTableName: "countries",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "country_subdivisions",
      new TableForeignKey({
        columnNames: ["parentSubdivisionId"],
        referencedColumnNames: ["id"],
        referencedTableName: "country_subdivisions",
        onDelete: "SET NULL",
      })
    );

    await queryRunner.createForeignKey(
      "localities",
      new TableForeignKey({
        columnNames: ["subdivisionId"],
        referencedColumnNames: ["id"],
        referencedTableName: "country_subdivisions",
        onDelete: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable("localities");
    await queryRunner.dropTable("country_subdivisions");
    await queryRunner.dropTable("countries");
  }
}
