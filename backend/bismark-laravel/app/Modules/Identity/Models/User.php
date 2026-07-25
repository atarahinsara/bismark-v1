<?php

declare(strict_types=1);

namespace App\Modules\Identity\Models;

use App\Shared\Kernel\Concerns\BelongsToTenant;
use App\Shared\Kernel\Domain\AggregateRoot;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * User — Core Identity Aggregate Root.
 *
 * This is the central identity model for ALL users (Web + Mobile):
 * - Super Admin, IT Admin, CEO, Managers (Web)
 * - Customer, Representative, Technician, Service Center (Mobile)
 *
 * Each user belongs to exactly one Tenant (ADR-003: Multi-Tenant).
 */
final class User extends AggregateRoot
{
    use SoftDeletes;
    use BelongsToTenant;

    protected $table = 'users';

    /**
     * EXPLICIT fillable — never use $guarded = [] (Security Review finding).
     */
    protected $fillable = [
        'tenant_id',
        'username',
        'display_name',
        'email',
        'phone',
        'user_type',
        'status',
        'locale',
        'is_active',
        'locked_until',
        'last_login_at',
        'metadata',
        'created_by',
        'updated_by',
    ];

    protected $hidden = [
        'metadata',
    ];

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'user_type' => 'string',      // cast to enum at DB level
            'status' => 'string',
            'is_active' => 'boolean',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
            'metadata' => 'array',
        ]);
    }

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    /**
     * Roles assigned to this user (many-to-many via user_role_assignments).
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'user_role_assignments',
            'user_id',
            'role_id'
        )->wherePivotNull('revoked_at')
         ->withPivot(['scope_type', 'scope_id', 'assigned_at', 'assigned_by'])
         ->withTimestamps();
    }

    /**
     * Active sessions for this user.
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class);
    }

    // ============================================================
    // QUERY SCOPES
    // ============================================================

    /**
     * Scope: only active users.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
                     ->where('status', 'active')
                     ->whereNull('deleted_at');
    }

    /**
     * Scope: not locked.
     */
    public function scopeNotLocked(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('locked_until')->orWhere('locked_until', '<', now());
        });
    }

    /**
     * Scope: by user type.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('user_type', $type);
    }

    // ============================================================
    // DOMAIN METHODS (business logic on the aggregate)
    // ============================================================

    /**
     * Check if the user is currently locked.
     */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /**
     * Check if the user can log in.
     */
    public function canLogin(): bool
    {
        return $this->is_active
            && $this->status === 'active'
            && !$this->isLocked()
            && $this->deleted_at === null;
    }

    /**
     * Lock the account until a given time.
     */
    public function lock(\DateTimeInterface $until, ?string $reason = null): void
    {
        $this->locked_until = $until;
        $this->save();

        // Dispatch domain event (via Outbox) — handled in CommandService
    }

    /**
     * Unlock the account.
     */
    public function unlock(): void
    {
        $this->locked_until = null;
        $this->save();
    }

    /**
     * Suspend the user.
     */
    public function suspend(): void
    {
        $this->status = 'suspended';
        $this->is_active = false;
        $this->save();
    }

    /**
     * Unsuspend the user.
     */
    public function unsuspend(): void
    {
        $this->status = 'active';
        $this->is_active = true;
        $this->save();
    }

    /**
     * Record a successful login.
     */
    public function recordLogin(): void
    {
        $this->last_login_at = now();
        $this->save();
    }

    /**
     * Check if user has a specific permission (delegates to Authorization via Contract).
     * NOTE: This method does NOT query Authorization directly (LAW-03).
     * The Application Service layer injects AuthorizationServiceInterface.
     */
    public function hasRole(string $roleKey): bool
    {
        return $this->roles()->where('key', $roleKey)->exists();
    }
}
