<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\UserDTO;
use App\Modules\Identity\Contracts\UserCommandServiceInterface;
use App\Modules\Identity\Enums\UserStatus;
use App\Modules\Identity\Events\UserCreated;
use App\Modules\Identity\Events\UserDeleted;
use App\Modules\Identity\Events\UserLocked;
use App\Modules\Identity\Events\UserSuspended;
use App\Modules\Identity\Events\UserUnlocked;
use App\Modules\Identity\Events\UserUnsuspended;
use App\Modules\Identity\Events\UserUpdated;
use App\Modules\Identity\Models\User;
use App\Modules\Identity\Repositories\UserRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;

final class UserCommandService implements UserCommandServiceInterface
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly EventBusInterface $bus,
    ) {
    }

    public function create(UserDTO $payload): UserDTO
    {
        $tenantId = $payload->tenantId ?? (string) App::make('bismark.tenant');

        return DB::transaction(function () use ($payload, $tenantId): UserDTO {
            $user = new User();
            $user->id           = UuidV7Generator::generateString();
            $user->tenant_id    = $tenantId;
            $user->username     = $payload->username ?? throw new \InvalidArgumentException('username required');
            $user->display_name = $payload->displayName ?? throw new \InvalidArgumentException('displayName required');
            $user->email        = $payload->email;
            $user->phone        = $payload->phone;
            $user->user_type    = $payload->userType?->value ?? 'staff';
            $user->status       = $payload->status ?? UserStatus::Active;
            $user->locale       = $payload->locale ?? 'fa-IR';
            $user->is_active    = $payload->isActive ?? true;
            $user->metadata     = $payload->metadata ?? [];

            $this->users->save($user);

            $this->bus->flush([new UserCreated($user->id, $tenantId)]);

            return $this->toDTO($user);
        });
    }

    public function update(string $id, UserDTO $payload): UserDTO
    {
        return DB::transaction(function () use ($id, $payload): UserDTO {
            $user = $this->users->findOrFail($id);

            if ($payload->displayName !== null) {
                $user->display_name = $payload->displayName;
            }
            if ($payload->email !== null) {
                $user->email = $payload->email;
            }
            if ($payload->phone !== null) {
                $user->phone = $payload->phone;
            }
            if ($payload->userType !== null) {
                $user->user_type = $payload->userType;
            }
            if ($payload->locale !== null) {
                $user->locale = $payload->locale;
            }
            if ($payload->isActive !== null) {
                $user->is_active = $payload->isActive;
            }
            if ($payload->metadata !== null) {
                $user->metadata = $payload->metadata;
            }

            $this->users->save($user);

            $this->bus->flush([new UserUpdated($user->id, $user->tenant_id)]);

            return $this->toDTO($user);
        });
    }

    public function delete(string $id): void
    {
        DB::transaction(function () use ($id): void {
            $user = $this->users->findOrFail($id);
            $this->users->delete($user);
            $this->bus->flush([new UserDeleted($user->id, $user->tenant_id)]);
        });
    }

    public function suspend(string $id, ?string $reason = null): UserDTO
    {
        return DB::transaction(function () use ($id): UserDTO {
            $user = $this->users->findOrFail($id);
            $user->status = UserStatus::Suspended;
            $user->is_active = false;
            $this->users->save($user);

            $this->bus->flush([new UserSuspended($user->id, $user->tenant_id)]);

            return $this->toDTO($user);
        });
    }

    public function unsuspend(string $id): UserDTO
    {
        return DB::transaction(function () use ($id): UserDTO {
            $user = $this->users->findOrFail($id);
            $user->status = UserStatus::Active;
            $user->is_active = true;
            $this->users->save($user);

            $this->bus->flush([new UserUnsuspended($user->id, $user->tenant_id)]);

            return $this->toDTO($user);
        });
    }

    public function lock(string $id, \DateTimeImmutable $until): UserDTO
    {
        return DB::transaction(function () use ($id, $until): UserDTO {
            $user = $this->users->findOrFail($id);
            $user->status = UserStatus::Locked;
            $user->locked_until = \Carbon\CarbonImmutable::instance($until);
            $this->users->save($user);

            $this->bus->flush([new UserLocked($user->id, $user->tenant_id)]);

            return $this->toDTO($user);
        });
    }

    public function unlock(string $id): UserDTO
    {
        return DB::transaction(function () use ($id): UserDTO {
            $user = $this->users->findOrFail($id);
            $user->status = UserStatus::Active;
            $user->locked_until = null;
            $this->users->save($user);

            $this->bus->flush([new UserUnlocked($user->id, $user->tenant_id)]);

            return $this->toDTO($user);
        });
    }

    private function toDTO(User $user): UserDTO
    {
        return new UserDTO(
            id: $user->id,
            tenantId: $user->tenant_id,
            username: $user->username,
            displayName: $user->display_name,
            email: $user->email,
            phone: $user->phone,
            userType: $user->user_type,
            status: $user->status,
            locale: $user->locale,
            isActive: $user->is_active,
            lockedUntil: $user->locked_until?->toImmutable(),
            lastLoginAt: $user->last_login_at?->toImmutable(),
            metadata: $user->metadata,
            createdAt: $user->created_at?->toImmutable(),
            updatedAt: $user->updated_at?->toImmutable(),
        );
    }
}
