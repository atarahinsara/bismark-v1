<?php

declare(strict_types=1);

namespace App\Modules\Organization\Policies;

use App\Modules\Identity\Models\User;
use App\Modules\Organization\Models\Branch;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class BranchPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?Response
    {
        return $user->hasRole('super_admin') ? Response::allow() : null;
    }

    public function viewAny(User $user): Response
    {
        return $user->hasPermission('branches.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function view(User $user, Branch $branch): Response
    {
        return $user->hasPermission('branches.show') ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->hasPermission('branches.create') ? Response::allow() : Response::deny();
    }

    public function update(User $user, Branch $branch): Response
    {
        return $user->hasPermission('branches.update') ? Response::allow() : Response::deny();
    }

    public function delete(User $user, Branch $branch): Response
    {
        return $user->hasPermission('branches.delete') ? Response::allow() : Response::deny();
    }
}
