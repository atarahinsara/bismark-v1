<?php

declare(strict_types=1);

namespace App\Modules\Party\Policies;

use App\Modules\Identity\Models\User;
use App\Modules\Party\Models\Party;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

final class PartyPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?Response
    {
        return $user->hasRole('super_admin') ? Response::allow() : null;
    }

    public function viewAny(User $user): Response
    {
        return $user->hasPermission('parties.list') ? Response::allow() : Response::denyAsNotFound();
    }

    public function view(User $user, Party $party): Response
    {
        return $user->hasPermission('parties.show') ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): Response
    {
        return $user->hasPermission('parties.create') ? Response::allow() : Response::deny();
    }

    public function update(User $user, Party $party): Response
    {
        return $user->hasPermission('parties.update') ? Response::allow() : Response::deny();
    }

    public function delete(User $user, Party $party): Response
    {
        return $user->hasPermission('parties.delete') ? Response::allow() : Response::deny();
    }
}
