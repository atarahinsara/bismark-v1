<?php

declare(strict_types=1);

namespace App\Modules\Identity\Controllers;

use App\Modules\Identity\Contracts\SessionCommandServiceInterface;
use App\Modules\Identity\Contracts\SessionQueryServiceInterface;
use App\Modules\Identity\Requests\RevokeSessionRequest;
use App\Modules\Identity\Resources\SessionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class SessionController extends Controller
{
    public function __construct(
        private readonly SessionQueryServiceInterface $queries,
        private readonly SessionCommandServiceInterface $commands,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $userId = (string) $request->input('user_id', $request->user()?->getAuthIdentifier() ?? '');
        $paginator = $this->queries->paginateForUser(
            userId: $userId,
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 20), 100),
        );

        return SessionResource::collection($paginator);
    }

    public function revoke(RevokeSessionRequest $request, string $id): SessionResource
    {
        $dto = $this->commands->revoke($id, $request->input('reason'));

        return new SessionResource(\App\Modules\Identity\Models\Session::findOrFail($id));
    }
}
