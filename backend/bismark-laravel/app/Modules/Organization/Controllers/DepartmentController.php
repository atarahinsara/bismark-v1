<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Modules\Organization\Contracts\DTOs\DepartmentDTO;
use App\Modules\Organization\Contracts\DepartmentCommandServiceInterface;
use App\Modules\Organization\Contracts\DepartmentQueryServiceInterface;
use App\Modules\Organization\Models\Department;
use App\Modules\Organization\Requests\CreateDepartmentRequest;
use App\Modules\Organization\Requests\UpdateDepartmentRequest;
use App\Modules\Organization\Resources\DepartmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class DepartmentController extends Controller
{
    public function __construct(
        private readonly DepartmentQueryServiceInterface $queries,
        private readonly DepartmentCommandServiceInterface $commands,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return DepartmentResource::collection($this->queries->paginate(
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 20), 100),
            filters: $request->only(['search', 'branch_id']),
        ));
    }

    public function show(string $id): DepartmentResource
    {
        $this->queries->find($id) ?? abort(404, 'Department not found.');
        return new DepartmentResource(Department::findOrFail($id));
    }

    public function store(CreateDepartmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $dto = new DepartmentDTO(
            id: null, tenantId: null,
            name: $data['name'], code: $data['code'],
            branchId: $data['branch_id'] ?? null,
            parentId: $data['parent_id'] ?? null,
            isActive: $data['is_active'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $created = $this->commands->create($dto);
        return (new DepartmentResource(Department::findOrFail($created->id)))
            ->response()->setStatusCode(201);
    }

    public function update(UpdateDepartmentRequest $request, string $id): DepartmentResource
    {
        $data = $request->validated();
        $dto = new DepartmentDTO(
            id: $id, tenantId: null,
            name: $data['name'] ?? null, code: null,
            branchId: $data['branch_id'] ?? null,
            parentId: $data['parent_id'] ?? null,
            isActive: $data['is_active'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $this->commands->update($id, $dto);
        return new DepartmentResource(Department::findOrFail($id));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->commands->delete($id);
        return response()->json(null, 204);
    }
}
