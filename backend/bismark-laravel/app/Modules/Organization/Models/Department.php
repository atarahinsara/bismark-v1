<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Shared\Kernel\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Department extends Model
{
    use BelongsToTenant;
    use SoftDeletes;

    protected $table = 'departments';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'code',
        'branch_id',
        'parent_id',
        'is_active',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'tenant_id'  => 'string',
        'branch_id'  => 'string',
        'parent_id'  => 'string',
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        // Same context (Organization) — REAL FK allowed by LAW-01.
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id', 'id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id', 'id');
    }
}
