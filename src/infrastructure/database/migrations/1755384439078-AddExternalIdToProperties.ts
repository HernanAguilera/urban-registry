import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalIdToProperties1755384439078 implements MigrationInterface {
    name = 'AddExternalIdToProperties1755384439078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_token_hash_user_id"`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "external_id" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_ba53208da8ec606d80d52f089d" ON "refresh_tokens" ("token_hash", "user_id") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba53208da8ec606d80d52f089d"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "external_id"`);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_token_hash_user_id" ON "refresh_tokens" ("token_hash", "user_id") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
