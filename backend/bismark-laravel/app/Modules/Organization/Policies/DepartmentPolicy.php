<?php

declare(strict_types=1);

namespace App\Modules\Organization\Policies;

use App\Modules\Identity\Models\User;
use App\Modules\Organization\Models\Department;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class DepartmentPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?Response
    {
        return $user->hasRole('super_admin') ? Response::allow() : null;
    }

    public function viewAny(User $user): Response
    {
        return $user->hasPermission('organization.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function view(User $user, Department $department): Response
    {
        return $user->hasPermission('organization.show') ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->hasPermission('organization.create') ? Response::allow() : Response::deny();
    }

    public function update(User $user, Department $department): Response
    {
        return $user->hasPermission('organization.update') ? Response::allow() : Response::deny();
    }

    public function delete(User $user, Department $department): Response
    {
        return $user->hasPermission('organization.delete') ? Response::allow() : Response::deny();
    }
}
