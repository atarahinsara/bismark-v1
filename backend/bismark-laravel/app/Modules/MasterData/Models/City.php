<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class City extends Model
{
    protected $table = 'cities';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'province_id',
        'code',
        'name',
        'name_fa',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'id'          => 'string',
        'province_id' => 'string',
        'is_active'   => 'boolean',
        'created_at'  => 'datetime',
    ];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class, 'province_id', 'id');
    }
}
