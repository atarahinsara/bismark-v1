<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: create_tenants_table
 *
 * The root table for Multi-Tenant architecture (ADR-003).
 * In V1, only one tenant is active (Bismark itself).
 */
return new class extends Migration {
    public function up(): void
    {
        // UUID v7 function (for PostgreSQL < 18, or fallback)
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION uuid_v7()
            RETURNS UUID AS $$
            DECLARE
                unix_ts_ms BIGINT;
                uuid_bytes BYTEA;
            BEGIN
                unix_ts_ms := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
                uuid_bytes := decode(lpad(to_hex(unix_ts_ms), 12, '0'), 'hex')
                           || gen_random_bytes(10);
                uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
                uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
                RETURN encode(uuid_bytes, 'hex')::UUID;
            END;
            $$ LANGUAGE plpgsql VOLATILE;
        SQL);

        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('default_locale', 10)->default('fa-IR');
            $table->string('default_tz', 50)->default('Asia/Tehran');
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default('{}');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->timestampTz('deleted_at')->nullable();
        });

        DB::statement("ALTER TABLE tenants ALTER COLUMN id SET DEFAULT uuid_v7()");
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
        DB::statement("DROP FUNCTION IF EXISTS uuid_v7()");
    }
};
