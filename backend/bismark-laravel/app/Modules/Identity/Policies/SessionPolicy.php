<?php

declare(strict_types=1);

namespace App\Modules\Identity\Policies;

use App\Modules\Identity\Models\Session;
use App\Modules\Identity\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class SessionPolicy
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
        return $user->hasPermission('auth.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function revoke(User $user, Session $session): Response
    {
        if ($user->id === $session->user_id) {
            return Response::allow();
        }
        return $user->hasPermission('auth.revoke') ? Response::allow() : Response::deny();
    }
}
