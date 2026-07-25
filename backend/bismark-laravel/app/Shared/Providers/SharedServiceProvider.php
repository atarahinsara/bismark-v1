<?php

declare(strict_types=1);

namespace App\Shared\Providers;

use App\Shared\Infrastructure\Law\EnforceLaw03;
use App\Shared\Infrastructure\Outbox\OutboxEventBus;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\ServiceProvider;

/**
 * SharedServiceProvider — registers cross-cutting services:
 *   - EventBusInterface (Outbox implementation)
 *   - Tenant singleton ('bismark.tenant') — replaced per-request by middleware
 *   - LAW-03 enforcement configuration
 *   - Repository → context map for LAW-03
 */
final class SharedServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(EventBusInterface::class, OutboxEventBus::class);

        // The tenant id is set per-request by EnsureTenantResolved middleware.
        $this->app->singleton('bismark.tenant', fn () => null);

        // UuidV7 generator is stateless — bind as singleton.
        $this->app->singleton(UuidV7Generator::class);
    }

    public function boot(): void
    {
        EnforceLaw03::configure();

        $this->registerRepositoryContextMap();
    }

    /**
     * Register every repository under its owning context so LAW-03 can
     * verify caller-vs-owner at runtime.
     */
    private function registerRepositoryContextMap(): void
    {
        $map = [
            // Identity
            \App\Modules\Identity\Repositories\UserRepository::class       => 'Identity',
            \App\Modules\Identity\Repositories\RoleRepository::class       => 'Identity',
            \App\Modules\Identity\Repositories\PermissionRepository::class => 'Identity',
            \App\Modules\Identity\Repositories\SessionRepository::class    => 'Identity',
            \App\Modules\Identity\Repositories\TenantRepository::class     => 'Identity',

            // Organization
            \App\Modules\Organization\Repositories\BranchRepository::class     => 'Organization',
            \App\Modules\Organization\Repositories\DepartmentRepository::class => 'Organization',

            // Party
            \App\Modules\Party\Repositories\PartyRepository::class         => 'Party',
            \App\Modules\Party\Repositories\PersonRepository::class        => 'Party',
            \App\Modules\Party\Repositories\OrganizationRepository::class  => 'Party',

            // MasterData
            \App\Modules\MasterData\Repositories\CountryRepository::class  => 'MasterData',
            \App\Modules\MasterData\Repositories\ProvinceRepository::class => 'MasterData',
            \App\Modules\MasterData\Repositories\CityRepository::class     => 'MasterData',
            \App\Modules\MasterData\Repositories\CurrencyRepository::class=> 'MasterData',
            \App\Modules\MasterData\Repositories\LanguageRepository::class=> 'MasterData',
        ];

        foreach ($map as $repo => $context) {
            EnforceLaw03::registerRepository($repo, $context);
        }
    }
}
