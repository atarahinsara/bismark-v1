<?php

declare(strict_types=1);

namespace App\Modules\Party\Models;

use App\Modules\Party\Enums\PartyStatus;
use App\Modules\Party\Enums\PartyType;
use App\Shared\Kernel\Concerns\BelongsToTenant;
use App\Shared\Kernel\Concerns\HasAuditability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Party — aggregate root of the Party context.
 *
 * Carries a business_code (LAW-02). The `business_code` is unique within a
 * tenant; the BusinessCodeGenerator produces it inside PartyCommandService.
 */
final class Party extends Model
{
    use BelongsToTenant;
    use HasAuditability;
    use SoftDeletes;

    protected $table = 'parties';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'business_code',
        'party_type',
        'display_name',
        'status',
        'tax_id',
        'registration_no',
        'metadata',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'              => 'string',
        'tenant_id'       => 'string',
        'party_type'      => PartyType::class,
        'status'          => PartyStatus::class,
        'metadata'        => 'array',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
        'deleted_at'      => 'datetime',
    ];

    public function person(): HasOne
    {
        // Same context — REAL FK.
        return $this->hasOne(Person::class, 'party_id', 'id');
    }

    public function organization(): HasOne
    {
        return $this->hasOne(Organization::class, 'party_id', 'id');
    }
}
