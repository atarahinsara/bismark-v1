<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Country — global master data (NOT tenant-scoped).
 *
 * Owned by MasterData context. Other contexts reference countries loosely
 * (LAW-01) — there is no FK constraint.
 */
final class Country extends Model
{
    protected $table = 'countries';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'iso_code',
        'iso3_code',
        'name',
        'name_fa',
        'phone_code',
        'currency_code',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
    ];

    public function provinces(): HasMany
    {
        return $this->hasMany(Province::class, 'country_id', 'id');
    }
}
