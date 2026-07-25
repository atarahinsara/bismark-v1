<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\UserDTO;
use App\Modules\Identity\Contracts\UserQueryServiceInterface;
use App\Modules\Identity\Models\User;
use App\Modules\Identity\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * User Query Service — Read-side application service.
 *
 * Implements UserQueryServiceInterface for cross-context access (LAW-03).
 * Other contexts inject this interface — never the UserRepository.
 */
final class UserQueryService implements UserQueryServiceInterface
{
    public function __construct(
        private readonly UserRepository $repository,
    ) {}

    public function findUser(string $userId): ?UserDTO
    {
        $tenantId = $this->currentTenantId();
        $user = $this->repository->find($tenantId, $userId);

        return $user ? UserDTO::fromModel($user) : null;
    }

    public function findUserOrFail(string $userId): UserDTO
    {
        $tenantId = $this->currentTenantId();
        $user = $this->repository->findOrFail($tenantId, $userId);

        return UserDTO::fromModel($user);
    }

    public function findUsersByRole(string $roleKey): array
    {
        $tenantId = $this->currentTenantId();
        $users = $this->repository->getByRole($tenantId, $roleKey);

        return $users->map(fn (User $u) => UserDTO::fromModel($u))->all();
    }

    public function getDisplayName(string $userId): ?string
    {
        $dto = $this->findUser($userId);
        return $dto?->displayName;
    }

    /**
     * Paginated list (for internal Identity Context use — not in the Contract).
     */
    public function paginate(
        array $filters = [],
        int $perPage = 20,
        int $page = 1,
        string $sort = '-created_at',
    ): LengthAwarePaginator {
        return $this->repository->paginate(
            $this->currentTenantId(),
            $filters,
            $perPage,
            $page,
            $sort,
        );
    }

    private function currentTenantId(): string
    {
        return app(\App\Shared\Kernel\Contracts\TenantContextInterface::class)->getTenantId()
            ?? throw new \RuntimeException('No tenant context');
    }
}
