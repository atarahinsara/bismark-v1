<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: create_users_table
 *
 * Core Identity table for ALL users (Web + Mobile).
 * Implements: UUID v7 PK, tenant_id, soft delete, audit columns.
 */
return new class extends Migration {
    public function up(): void
    {
        // ENUM types (PostgreSQL-native)
        DB::statement("CREATE TYPE user_type_enum AS ENUM ('customer', 'representative', 'technician', 'service_center', 'staff')");
        DB::statement("CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'locked', 'deleted')");

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('username', 50);
            $table->string('display_name', 200);
            $table->string('email', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('user_type', 20)->default('staff');
            $table->string('status', 20)->default('active');
            $table->string('locale', 10)->default('fa-IR');
            $table->boolean('is_active')->default(true);
            $table->timestampTz('locked_until')->nullable();
            $table->timestampTz('last_login_at')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->timestampTz('deleted_at')->nullable();

            // Unique within tenant
            $table->unique(['tenant_id', 'username'], 'uq_users_tenant_username');

            // Indexes
            $table->index(['tenant_id', 'status'], 'idx_users_tenant_status');
            $table->index(['tenant_id', 'user_type'], 'idx_users_tenant_type');
        });

        // Cast columns to ENUM types
        DB::statement("ALTER TABLE users ALTER COLUMN user_type TYPE user_type_enum USING user_type::user_type_enum");
        DB::statement("ALTER TABLE users ALTER COLUMN status TYPE user_status_enum USING status::user_status_enum");

        // FK: tenant
        DB::statement("ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)");

        // UUID v7 default
        DB::statement("ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_v7()");

        // Partial index: only active users
        DB::statement("CREATE INDEX idx_users_active_partial ON users (tenant_id) WHERE deleted_at IS NULL AND is_active = TRUE");

        // GIN index on metadata
        DB::statement("CREATE INDEX idx_users_metadata_gin ON users USING GIN (metadata)");

        // Email unique within tenant (partial — only non-null)
        DB::statement("CREATE UNIQUE INDEX uq_users_tenant_email ON users (tenant_id, email) WHERE email IS NOT NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        DB::statement("DROP TYPE IF EXISTS user_status_enum");
        DB::statement("DROP TYPE IF EXISTS user_type_enum");
    }
};
