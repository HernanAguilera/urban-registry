import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToProperties1755440906466 implements MigrationInterface {
    name = 'AddMetadataToProperties1755440906466'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" ADD "metadata" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "metadata"`);
    }

}
