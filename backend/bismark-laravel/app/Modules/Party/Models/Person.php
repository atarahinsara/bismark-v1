<?php

declare(strict_types=1);

namespace App\Modules\Party\Models;

use App\Modules\Party\Enums\Gender;
use App\Shared\Kernel\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Person — child entity of Party (1:1 where party_type=person).
 *
 * Not an aggregate root — managed through PartyCommandService only.
 */
final class Person extends Model
{
    use BelongsToTenant;
    use SoftDeletes;

    protected $table = 'persons';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'party_id',
        'tenant_id',
        'first_name',
        'last_name',
        'national_id',
        'birth_date',
        'gender',
        'nationality',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'         => 'string',
        'party_id'   => 'string',
        'tenant_id'  => 'string',
        'birth_date' => 'date',
        'gender'     => Gender::class,
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'party_id', 'id');
    }
}
