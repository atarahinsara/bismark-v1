<?php

declare(strict_types=1);

namespace App\Modules\Identity\Policies;

use App\Modules\Identity\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class UserPolicy
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
        return $user->hasPermission('users.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function view(User $user, User $target): Response
    {
        if ($user->hasPermission('users.show')) {
            return Response::allow();
        }
        return $user->id === $target->id ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->hasPermission('users.create') ? Response::allow() : Response::deny();
    }

    public function update(User $user, User $target): Response
    {
        if ($user->hasPermission('users.update')) {
            return Response::allow();
        }
        return $user->id === $target->id ? Response::allow() : Response::deny();
    }

    public function delete(User $user, User $target): Response
    {
        if ($user->id === $target->id) {
            return Response::deny('Cannot delete self.');
        }
        return $user->hasPermission('users.delete') ? Response::allow() : Response::deny();
    }

    public function suspend(User $user, User $target): Response
    {
        if ($user->id === $target->id) {
            return Response::deny('Cannot suspend self.');
        }
        return $user->hasPermission('users.suspend') ? Response::allow() : Response::deny();
    }

    public function unsuspend(User $user, User $target): Response
    {
        return $user->hasPermission('users.unsuspend') ? Response::allow() : Response::deny();
    }

    public function lock(User $user, User $target): Response
    {
        if ($user->id === $target->id) {
            return Response::deny('Cannot lock self.');
        }
        return $user->hasPermission('users.lock') ? Response::allow() : Response::deny();
    }

    public function unlock(User $user, User $target): Response
    {
        return $user->hasPermission('users.unlock') ? Response::allow() : Response::deny();
    }
}
