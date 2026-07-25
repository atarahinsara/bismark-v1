<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Models;

use Illuminate\Database\Eloquent\Model;

final class Currency extends Model
{
    protected $table = 'currencies';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'code',
        'name',
        'name_fa',
        'symbol',
        'decimal_places',
        'exchange_rate',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'id'             => 'string',
        'decimal_places' => 'integer',
        'exchange_rate'  => 'decimal:6',
        'is_active'      => 'boolean',
        'created_at'     => 'datetime',
    ];
}
