<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Modules\Organization\Contracts\BranchCommandServiceInterface;
use App\Modules\Organization\Contracts\BranchQueryServiceInterface;
use App\Modules\Organization\Contracts\DTOs\BranchDTO;
use App\Modules\Organization\Models\Branch;
use App\Modules\Organization\Requests\CreateBranchRequest;
use App\Modules\Organization\Requests\UpdateBranchRequest;
use App\Modules\Organization\Resources\BranchResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class BranchController extends Controller
{
    public function __construct(
        private readonly BranchQueryServiceInterface $queries,
        private readonly BranchCommandServiceInterface $commands,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return BranchResource::collection($this->queries->paginate(
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 20), 100),
            filters: $request->only(['search', 'parent_id']),
        ));
    }

    public function show(string $id): BranchResource
    {
        $this->queries->find($id) ?? abort(404, 'Branch not found.');
        return new BranchResource(Branch::findOrFail($id));
    }

    public function store(CreateBranchRequest $request): JsonResponse
    {
        $data = $request->validated();
        $dto = new BranchDTO(
            id: null, tenantId: null,
            name: $data['name'], code: $data['code'],
            parentId: $data['parent_id'] ?? null,
            address: $data['address'] ?? null,
            contactPhone: $data['contact_phone'] ?? null,
            isActive: $data['is_active'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $created = $this->commands->create($dto);
        return (new BranchResource(Branch::findOrFail($created->id)))
            ->response()->setStatusCode(201);
    }

    public function update(UpdateBranchRequest $request, string $id): BranchResource
    {
        $data = $request->validated();
        $dto = new BranchDTO(
            id: $id, tenantId: null,
            name: $data['name'] ?? null, code: null,
            parentId: $data['parent_id'] ?? null,
            address: $data['address'] ?? null,
            contactPhone: $data['contact_phone'] ?? null,
            isActive: $data['is_active'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $this->commands->update($id, $dto);
        return new BranchResource(Branch::findOrFail($id));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->commands->delete($id);
        return response()->json(null, 204);
    }
}
