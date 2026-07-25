<?php

declare(strict_types=1);

namespace App\Modules\Identity\Controllers;

use App\Modules\Identity\Contracts\DTOs\RoleDTO;
use App\Modules\Identity\Contracts\RoleCommandServiceInterface;
use App\Modules\Identity\Contracts\RoleQueryServiceInterface;
use App\Modules\Identity\Requests\CreateRoleRequest;
use App\Modules\Identity\Requests\UpdateRoleRequest;
use App\Modules\Identity\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class RoleController extends Controller
{
    public function __construct(
        private readonly RoleQueryServiceInterface $queries,
        private readonly RoleCommandServiceInterface $commands,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $paginator = $this->queries->paginate(
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 20), 100),
            filters: $request->only(['search']),
        );

        return RoleResource::collection($paginator);
    }

    public function show(string $id): RoleResource
    {
        $role = $this->queries->find($id) ?? abort(404, 'Role not found.');
        return new RoleResource(\App\Modules\Identity\Models\Role::findOrFail($id));
    }

    public function store(CreateRoleRequest $request): JsonResponse
    {
        $data = $request->validated();

        $dto = new RoleDTO(
            id: null,
            tenantId: null,
            key: $data['key'],
            name: $data['name'],
            description: $data['description'] ?? null,
            isSystem: $data['is_system'] ?? false,
            createdAt: null,
            updatedAt: null,
        );

        $created = $this->commands->create($dto);

        return (new RoleResource(\App\Modules\Identity\Models\Role::findOrFail($created->id)))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateRoleRequest $request, string $id): RoleResource
    {
        $data = $request->validated();

        $dto = new RoleDTO(
            id: $id,
            tenantId: null,
            key: null,
            name: $data['name'] ?? null,
            description: $data['description'] ?? null,
            isSystem: null,
            createdAt: null,
            updatedAt: null,
        );

        $this->commands->update($id, $dto);

        return new RoleResource(\App\Modules\Identity\Models\Role::findOrFail($id));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->commands->delete($id);

        return response()->json(null, 204);
    }
}
