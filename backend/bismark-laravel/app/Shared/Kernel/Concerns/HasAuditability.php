<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Concerns;

use Illuminate\Support\Facades\Auth;

/**
 * HasAuditability — auto-fill created_by / updated_by on Eloquent models.
 *
 * Columns expected on the table:
 *   - created_by uuid nullable
 *   - updated_by uuid nullable
 *
 * The actor is resolved from the authenticated user id; for system actions
 * (jobs, console), both columns remain NULL.
 */
trait HasAuditability
{
    protected static function bootHasAuditability(): void
    {
        static::creating(function (self $model): void {
            $actor = self::currentActorId();
            if ($actor !== null && $model->getAttribute('created_by') === null) {
                $model->setAttribute('created_by', $actor);
            }
            if ($actor !== null && $model->getAttribute('updated_by') === null) {
                $model->setAttribute('updated_by', $actor);
            }
        });

        static::updating(function (self $model): void {
            $actor = self::currentActorId();
            if ($actor !== null) {
                $model->setAttribute('updated_by', $actor);
            }
        });
    }

    protected static function currentActorId(): ?string
    {
        $user = Auth::user();
        return $user?->getAuthIdentifier() instanceof \BackedEnum
            ? (string) $user->getAuthIdentifier()
            : (string) $user?->getAuthIdentifier() ?: null;
    }
}
