import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokens1755307256364 implements MigrationInterface {
    name = 'AddRefreshTokens1755307256364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token_hash" character varying NOT NULL,
                "user_id" uuid NOT NULL,
                "tenant_id" character varying NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "revoked" boolean NOT NULL DEFAULT false,
                "revoked_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_refresh_tokens_token_hash_user_id" 
            ON "refresh_tokens" ("token_hash", "user_id")
        `);
        
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens" 
            ADD CONSTRAINT "FK_refresh_tokens_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`);
        await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_token_hash_user_id"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }

}
