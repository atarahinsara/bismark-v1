<?php

declare(strict_types=1);

namespace App\Modules\Party\Controllers;

use App\Modules\Party\Contracts\DTOs\PartyDTO;
use App\Modules\Party\Contracts\PartyCommandServiceInterface;
use App\Modules\Party\Contracts\PartyQueryServiceInterface;
use App\Modules\Party\Enums\PartyStatus;
use App\Modules\Party\Enums\PartyType;
use App\Modules\Party\Models\Party;
use App\Modules\Party\Requests\CreatePartyRequest;
use App\Modules\Party\Requests\UpdatePartyRequest;
use App\Modules\Party\Resources\PartyResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

final class PartyController extends Controller
{
    public function __construct(
        private readonly PartyQueryServiceInterface $queries,
        private readonly PartyCommandServiceInterface $commands,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return PartyResource::collection($this->queries->paginate(
            page: (int) $request->input('page', 1),
            perPage: min((int) $request->input('per_page', 20), 100),
            filters: $request->only(['search', 'party_type', 'status']),
        ));
    }

    public function show(string $id): PartyResource
    {
        $this->queries->find($id) ?? abort(404, 'Party not found.');
        return new PartyResource(Party::findOrFail($id));
    }

    public function store(CreatePartyRequest $request): JsonResponse
    {
        $data = $request->validated();
        $dto = new PartyDTO(
            id: null, tenantId: null, businessCode: null,
            partyType: PartyType::from($data['party_type']),
            displayName: $data['display_name'],
            status: isset($data['status']) ? PartyStatus::from($data['status']) : null,
            taxId: $data['tax_id'] ?? null,
            registrationNo: $data['registration_no'] ?? null,
            metadata: $data['metadata'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $created = $this->commands->create($dto);
        return (new PartyResource(Party::findOrFail($created->id)))
            ->response()->setStatusCode(201);
    }

    public function update(UpdatePartyRequest $request, string $id): PartyResource
    {
        $data = $request->validated();
        $dto = new PartyDTO(
            id: $id, tenantId: null, businessCode: null, partyType: null,
            displayName: $data['display_name'] ?? null,
            status: isset($data['status']) ? PartyStatus::from($data['status']) : null,
            taxId: $data['tax_id'] ?? null,
            registrationNo: $data['registration_no'] ?? null,
            metadata: $data['metadata'] ?? null,
            createdAt: null, updatedAt: null,
        );
        $this->commands->update($id, $dto);
        return new PartyResource(Party::findOrFail($id));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->commands->delete($id);
        return response()->json(null, 204);
    }
}
