import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintExternalIdTenant1755478354570 implements MigrationInterface {
    name = 'AddUniqueConstraintExternalIdTenant1755478354570'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "external_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "properties" ADD CONSTRAINT "UQ_property_external_tenant" UNIQUE ("external_id", "tenant_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" DROP CONSTRAINT "UQ_property_external_tenant"`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "external_id" DROP NOT NULL`);
    }

}
