<?php

declare(strict_types=1);

namespace App\Modules\Party;

use Illuminate\Support\ServiceProvider;

final class PartyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            \App\Modules\Party\Repositories\PartyRepositoryInterface::class,
            \App\Modules\Party\Repositories\PartyRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Party\Repositories\PersonRepositoryInterface::class,
            \App\Modules\Party\Repositories\PersonRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Party\Repositories\OrganizationRepositoryInterface::class,
            \App\Modules\Party\Repositories\OrganizationRepository::class,
        );

        $this->app->singleton(
            \App\Modules\Party\Contracts\PartyQueryServiceInterface::class,
            \App\Modules\Party\Services\PartyQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Party\Contracts\PartyCommandServiceInterface::class,
            \App\Modules\Party\Services\PartyCommandService::class,
        );
    }
}
