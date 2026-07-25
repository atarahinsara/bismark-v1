<?php

declare(strict_types=1);

namespace App\Modules\Party\Events;

final class PartyCreated extends AbstractPartyEvent
{
    public function eventType(): string { return 'party.created'; }
}
