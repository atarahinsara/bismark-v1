<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\UserDTO;

/**
 * User Query Service Contract — Cross-Context Read Interface.
 *
 * OTHER Contexts (Sales, Service, etc.) use this interface to read User data
 * WITHOUT directly accessing the UserRepository (LAW-03).
 *
 * This interface is bound to UserQueryService in the Identity ModuleServiceProvider.
 */
interface UserQueryServiceInterface
{
    /**
     * Find a user by ID.
     */
    public function findUser(string $userId): ?UserDTO;

    /**
     * Find a user by ID or throw.
     */
    public function findUserOrFail(string $userId): UserDTO;

    /**
     * Find users by their role key.
     *
     * @return UserDTO[]
     */
    public function findUsersByRole(string $roleKey): array;

    /**
     * Get the display name for a user (for audit logs, notifications, etc.).
     */
    public function getDisplayName(string $userId): ?string;
}
