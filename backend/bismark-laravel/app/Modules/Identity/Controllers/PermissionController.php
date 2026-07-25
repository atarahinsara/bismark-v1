<?php

declare(strict_types=1);

namespace App\Modules\Identity\Controllers;

use App\Modules\Identity\Contracts\PermissionQueryServiceInterface;
use App\Modules\Identity\Resources\PermissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class PermissionController extends Controller
{
    public function __construct(
        private readonly PermissionQueryServiceInterface $queries,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $paginator = $this->queries->paginate(
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 50), 200),
            filters: $request->only(['module', 'search']),
        );

        return PermissionResource::collection($paginator);
    }

    public function show(string $id): PermissionResource
    {
        $permission = $this->queries->find($id) ?? abort(404, 'Permission not found.');
        return new PermissionResource(\App\Modules\Identity\Models\Permission::findOrFail($id));
    }
}
