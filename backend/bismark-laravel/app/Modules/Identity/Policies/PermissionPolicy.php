<?php

declare(strict_types=1);

namespace App\Modules\Identity\Policies;

use App\Modules\Identity\Models\Permission;
use App\Modules\Identity\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class PermissionPolicy
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

    public function view(User $user, Permission $permission): Response
    {
        return $user->hasPermission('rbac.show') ? Response::allow() : Response::denyAsNotFound();
    }
}
