import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1755291275031 implements MigrationInterface {
    name = 'InitialSchema1755291275031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."listings_type_enum" AS ENUM('sale', 'rent')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_status_enum" AS ENUM('active', 'inactive', 'sold', 'rented', 'expired')`);
        await queryRunner.query(`CREATE TABLE "listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."listings_type_enum" NOT NULL, "status" "public"."listings_status_enum" NOT NULL DEFAULT 'active', "price" numeric(10,2) NOT NULL, "description" text, "property_id" uuid NOT NULL, "tenant_id" character varying NOT NULL, "listed_date" date NOT NULL, "expiry_date" date, "views" integer NOT NULL DEFAULT '0', "inquiries" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('sale', 'rent', 'lease')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'cancelled', 'failed')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."transactions_type_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(12,2) NOT NULL, "commissionRate" numeric(5,2), "commissionAmount" numeric(10,2), "property_id" uuid NOT NULL, "buyer_id" uuid, "seller_id" uuid, "tenant_id" character varying NOT NULL, "transaction_date" date NOT NULL, "completion_date" date, "notes" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."properties_type_enum" AS ENUM('house', 'apartment', 'commercial', 'land', 'warehouse')`);
        await queryRunner.query(`CREATE TYPE "public"."properties_status_enum" AS ENUM('active', 'inactive', 'sold', 'rented')`);
        await queryRunner.query(`CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "address" character varying NOT NULL, "sector" character varying NOT NULL, "type" "public"."properties_type_enum" NOT NULL, "status" "public"."properties_status_enum" NOT NULL DEFAULT 'active', "price" numeric(10,2) NOT NULL, "area" numeric(8,2), "bedrooms" integer, "bathrooms" integer, "parkingSpaces" integer, "coordinates" geography(Point,4326) NOT NULL, "valuation" numeric(10,2), "tenant_id" character varying NOT NULL, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "tenant_id" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_9eef913a9013d6e3d09a92ec075" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a8f616508eb6137c4ed3f26c939" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_8c9b301d18f4ed8cacff33664c6" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_214e8e26a3bc13250ef55e9a1af" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "properties" ADD CONSTRAINT "FK_797b76e2d11a5bf755127d1aa67" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" DROP CONSTRAINT "FK_797b76e2d11a5bf755127d1aa67"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_214e8e26a3bc13250ef55e9a1af"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_8c9b301d18f4ed8cacff33664c6"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a8f616508eb6137c4ed3f26c939"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_9eef913a9013d6e3d09a92ec075"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "properties"`);
        await queryRunner.query(`DROP TYPE "public"."properties_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."properties_type_enum"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "listings"`);
        await queryRunner.query(`DROP TYPE "public"."listings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_type_enum"`);
    }

}
