<?php

declare(strict_types=1);

namespace App\Modules\Party\Models;

use App\Shared\Kernel\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Organization — child entity of Party (1:1 where party_type=organization).
 */
final class Organization extends Model
{
    use BelongsToTenant;
    use SoftDeletes;

    protected $table = 'organizations';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'party_id',
        'tenant_id',
        'legal_name',
        'legal_name_en',
        'organization_type',
        'established_date',
        'parent_org_id',
        'industry_code',
        'employee_count',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'                => 'string',
        'party_id'          => 'string',
        'tenant_id'         => 'string',
        'parent_org_id'     => 'string',
        'established_date'  => 'date',
        'employee_count'    => 'integer',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
        'deleted_at'        => 'datetime',
    ];

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'party_id', 'id');
    }

    /**
     * Parent organization (self-ref through Party). REAL FK — same context.
     */
    public function parentOrg(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'parent_org_id', 'id');
    }
}
