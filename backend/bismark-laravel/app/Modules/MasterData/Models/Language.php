<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Models;

use App\Modules\MasterData\Enums\TextDirection;
use Illuminate\Database\Eloquent\Model;

final class Language extends Model
{
    protected $table = 'languages';

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
        'direction',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'direction'  => TextDirection::class,
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
    ];
}
