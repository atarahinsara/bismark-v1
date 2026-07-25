<?php

declare(strict_types=1);

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Requests\CreateUserRequest;
use App\Modules\Identity\Requests\UpdateUserRequest;
use App\Modules\Identity\Resources\UserResource;
use App\Modules\Identity\Services\UserCommandService;
use App\Modules\Identity\Services\UserQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

/**
 * User Controller — thin HTTP layer.
 *
 * Delegates ALL business logic to UserCommandService / UserQueryService.
 * Pattern: Controller → Service → Repository (LAW-03 compliant).
 */
#[OA\Tag(name: 'Users', description: 'User management')]
final class UserController extends Controller
{
    public function __construct(
        private readonly UserQueryService $queryService,
        private readonly UserCommandService $commandService,
    ) {}

    #[OA\Get(
        path: '/users',
        tags: ['Users'],
        summary: 'List users (paginated, filterable)',
        security: [['bearerAuth' => []]],
    )]
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('users.view');

        $users = $this->queryService->paginate(
            filters: $request->only(['status', 'user_type', 'search']),
            perPage: min((int) $request->input('per_page', 20), 100),
            page: (int) $request->input('page', 1),
            sort: $request->input('sort', '-created_at'),
        );

        return UserResource::collection($users);
    }

    #[OA\Post(
        path: '/users',
        tags: ['Users'],
        summary: 'Create a new user',
        security: [['bearerAuth' => []]],
    )]
    public function store(CreateUserRequest $request): JsonResponse
    {
        $this->authorize('users.create');

        $user = $this->commandService->createUser($request->toCommand());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201)
            ->header('Location', "/api/v1/users/{$user->id}");
    }

    #[OA\Get(
        path: '/users/{id}',
        tags: ['Users'],
        summary: 'Get a user by ID',
        security: [['bearerAuth' => []]],
    )]
    public function show(string $id): UserResource
    {
        $this->authorize('users.view');

        $user = $this->commandService->findById($id);

        return new UserResource($user);
    }

    #[OA\Patch(
        path: '/users/{id}',
        tags: ['Users'],
        summary: 'Update a user',
        security: [['bearerAuth' => []]],
    )]
    public function update(UpdateUserRequest $request, string $id): UserResource
    {
        $this->authorize('users.update');

        $user = $this->commandService->updateUser($id, $request->toCommand());

        return new UserResource($user);
    }

    #[OA\Delete(
        path: '/users/{id}',
        tags: ['Users'],
        summary: 'Soft delete a user',
        security: [['bearerAuth' => []]],
    )]
    public function destroy(string $id): JsonResponse
    {
        $this->authorize('users.delete');

        $this->commandService->deleteUser($id);

        return response()->json(null, 204);
    }

    #[OA\Post(
        path: '/users/{id}/suspend',
        tags: ['Users'],
        summary: 'Suspend a user',
        security: [['bearerAuth' => []]],
    )]
    public function suspend(string $id): JsonResponse
    {
        $this->authorize('users.suspend');

        $this->commandService->suspend($id);

        return response()->json(null, 204);
    }

    #[OA\Post(
        path: '/users/{id}/unsuspend',
        tags: ['Users'],
        summary: 'Unsuspend a user',
        security: [['bearerAuth' => []]],
    )]
    public function unsuspend(string $id): JsonResponse
    {
        $this->authorize('users.unsuspend');

        $this->commandService->unsuspend($id);

        return response()->json(null, 204);
    }

    #[OA\Post(
        path: '/users/{id}/lock',
        tags: ['Users'],
        summary: 'Lock a user account',
        security: [['bearerAuth' => []]],
    )]
    public function lock(string $id): JsonResponse
    {
        $this->authorize('users.lock');

        $this->commandService->lock($id);

        return response()->json(null, 204);
    }

    #[OA\Post(
        path: '/users/{id}/unlock',
        tags: ['Users'],
        summary: 'Unlock a user account',
        security: [['bearerAuth' => []]],
    )]
    public function unlock(string $id): JsonResponse
    {
        $this->authorize('users.unlock');

        $this->commandService->unlock($id);

        return response()->json(null, 204);
    }
}
