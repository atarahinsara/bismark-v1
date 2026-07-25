<?php

declare(strict_types=1);

namespace App\Modules\Identity\Models;

use App\Modules\Identity\Enums\SessionStatus;
use App\Shared\Kernel\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Session — represents an active login session (Sanctum token + metadata).
 *
 * Note: In production this is backed by the Sanctum `personal_access_tokens`
 * table extended with a wrapper record here for richer audit/metadata. Sprint 1
 * keeps it as a stand-alone table for clarity.
 */
final class Session extends Model
{
    use BelongsToTenant;

    protected $table = 'sessions';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false; // uses issued_at / last_activity_at only

    protected $fillable = [
        'id',
        'user_id',
        'tenant_id',
        'status',
        'ip_address',
        'user_agent',
        'device_fingerprint',
        'issued_at',
        'last_activity_at',
        'expires_at',
        'absolute_expires_at',
        'revoked_at',
        'revoked_reason',
        'metadata',
    ];

    protected $casts = [
        'id'                  => 'string',
        'user_id'             => 'string',
        'tenant_id'           => 'string',
        'status'              => SessionStatus::class,
        'issued_at'           => 'datetime',
        'last_activity_at'    => 'datetime',
        'expires_at'          => 'datetime',
        'absolute_expires_at' => 'datetime',
        'revoked_at'          => 'datetime',
        'metadata'            => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function tenant(): BelongsTo
    {
        // LOOSE FK (LAW-01)
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    public function isActive(): bool
    {
        return $this->status === SessionStatus::Active
            && $this->expires_at?->isFuture()
            && $this->absolute_expires_at?->isFuture()
            && $this->revoked_at === null;
    }
}
