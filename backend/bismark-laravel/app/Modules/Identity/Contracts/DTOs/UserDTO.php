<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts\DTOs;

/**
 * User Data Transfer Object.
 *
 * Used for cross-context communication (LAW-03).
 * Other contexts receive this DTO — never the Eloquent Model.
 */
final class UserDTO
{
    public function __construct(
        public readonly string $id,
        public readonly string $tenantId,
        public readonly string $username,
        public readonly string $displayName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly string $userType,
        public readonly string $status,
        public readonly string $locale,
        public readonly bool $isActive,
        public readonly ?\DateTimeInterface $lastLoginAt,
        public readonly \DateTimeInterface $createdAt,
        public readonly \DateTimeInterface $updatedAt,
    ) {}

    /**
     * Create from Eloquent Model.
     */
    public static function fromModel(\App\Modules\Identity\Models\User $user): self
    {
        return new self(
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
            lastLoginAt: $user->last_login_at,
            createdAt: $user->created_at,
            updatedAt: $user->updated_at,
        );
    }

    /**
     * Convert to array (for JSON serialization).
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenantId,
            'username' => $this->username,
            'display_name' => $this->displayName,
            'email' => $this->email,
            'phone' => $this->phone,
            'user_type' => $this->userType,
            'status' => $this->status,
            'locale' => $this->locale,
            'is_active' => $this->isActive,
            'last_login_at' => $this->lastLoginAt?->toIso8601String(),
            'created_at' => $this->createdAt->toIso8601String(),
            'updated_at' => $this->updatedAt->toIso8601String(),
        ];
    }
}
