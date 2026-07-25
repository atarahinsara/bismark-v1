<?php

declare(strict_types=1);

namespace App\Modules\Identity\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Tenant — top-level isolation boundary.
 *
 * System table (declared in sprint-1-entities.yaml under `system_tables`).
 * Every tenant-scoped aggregate references this row via `tenant_id`.
 *
 * Note: This is a system model, NOT an aggregate root — no business code,
 * no event emission. It is owned by the Identity context but referenced
 * loosely (no FK constraint, per LAW-01) by every other context.
 */
final class Tenant extends Model
{
    use SoftDeletes;

    protected $table = 'tenants';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'key',
        'name',
        'locale',
        'timezone',
        'is_active',
        'metadata',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'is_active'  => 'boolean',
        'metadata'   => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id', 'id');
    }
}
