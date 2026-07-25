<?php

declare(strict_types=1);

namespace App\Modules\Identity\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Permission — global catalog (NOT tenant-scoped).
 *
 * Schema: `module.action`, e.g. `users.create`, `parties.update`.
 * Seeded by RolePermissionSeeder; permissions are system-managed and never
 * mutated from the API (read-only endpoints).
 */
final class Permission extends Model
{
    protected $table = 'permissions';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false; // only created_at, no updated_at

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'key',
        'module',
        'action',
        'description',
        'is_system',
        'created_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'is_system'  => 'boolean',
        'created_at' => 'datetime',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'role_permissions',
            'permission_id',
            'role_id',
        )->withPivot(['created_at']);
    }
}
