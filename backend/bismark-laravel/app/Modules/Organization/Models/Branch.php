<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Shared\Kernel\Concerns\BelongsToTenant;
use App\Shared\Kernel\Concerns\HasAuditability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Branch — sales branch / dealership.
 *
 * Owned by Organization context. Branches form a tree via `parent_id`.
 * The `parent_id` FK is REAL (same context, LAW-01 allows it).
 */
final class Branch extends Model
{
    use BelongsToTenant;
    use HasAuditability;
    use SoftDeletes;

    protected $table = 'branches';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'code',
        'parent_id',
        'address',
        'contact_phone',
        'is_active',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'tenant_id'  => 'string',
        'parent_id'  => 'string',
        'address'    => 'array',
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id', 'id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id', 'id');
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'branch_id', 'id');
    }
}
