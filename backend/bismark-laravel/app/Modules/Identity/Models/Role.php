<?php

declare(strict_types=1);

namespace App\Modules\Identity\Models;

use App\Shared\Kernel\Concerns\BelongsToTenant;
use App\Shared\Kernel\Concerns\HasAuditability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Role extends Model
{
    use BelongsToTenant;
    use HasAuditability;
    use SoftDeletes;

    protected $table = 'roles';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'key',
        'name',
        'description',
        'is_system',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'tenant_id'  => 'string',
        'is_system'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        // LOOSE FK (LAW-01)
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'role_permissions',
            'role_id',
            'permission_id',
        )->withPivot(['created_at']);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'user_role_assignments',
            'role_id',
            'user_id',
        )->withPivot(['tenant_id', 'assigned_by', 'assigned_at', 'expires_at'])
         ->withTimestamps();
    }
}
