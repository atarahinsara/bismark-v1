<?php

declare(strict_types=1);

namespace App\Modules\Identity\Policies;

use App\Modules\Identity\Models\Role;
use App\Modules\Identity\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class RolePolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?Response
    {
        if ($user->hasRole('super_admin')) {
            return Response::allow();
        }
        return null;
    }

    public function viewAny(User $user): Response
    {
        return $user->hasPermission('rbac.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function view(User $user, Role $role): Response
    {
        return $user->hasPermission('rbac.show') ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->hasPermission('rbac.create') ? Response::allow() : Response::deny();
    }

    public function update(User $user, Role $role): Response
    {
        if ($role->is_system) {
            return Response::deny('System roles are immutable.');
        }
        return $user->hasPermission('rbac.update') ? Response::allow() : Response::deny();
    }

    public function delete(User $user, Role $role): Response
    {
        if ($role->is_system) {
            return Response::deny('System roles cannot be deleted.');
        }
        return $user->hasPermission('rbac.delete') ? Response::allow() : Response::deny();
    }
}
