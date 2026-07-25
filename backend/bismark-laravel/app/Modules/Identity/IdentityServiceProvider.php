<?php

declare(strict_types=1);

namespace App\Modules\Identity;

use Illuminate\Support\ServiceProvider;

final class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind repository interfaces to implementations.
        $this->app->singleton(
            \App\Modules\Identity\Repositories\TenantRepositoryInterface::class,
            \App\Modules\Identity\Repositories\TenantRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Repositories\UserRepositoryInterface::class,
            \App\Modules\Identity\Repositories\UserRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Repositories\RoleRepositoryInterface::class,
            \App\Modules\Identity\Repositories\RoleRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Repositories\PermissionRepositoryInterface::class,
            \App\Modules\Identity\Repositories\PermissionRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Repositories\SessionRepositoryInterface::class,
            \App\Modules\Identity\Repositories\SessionRepository::class,
        );

        // Bind service contracts.
        $this->app->singleton(
            \App\Modules\Identity\Contracts\UserQueryServiceInterface::class,
            \App\Modules\Identity\Services\UserQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\UserCommandServiceInterface::class,
            \App\Modules\Identity\Services\UserCommandService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\RoleQueryServiceInterface::class,
            \App\Modules\Identity\Services\RoleQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\RoleCommandServiceInterface::class,
            \App\Modules\Identity\Services\RoleCommandService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\PermissionQueryServiceInterface::class,
            \App\Modules\Identity\Services\PermissionQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\SessionQueryServiceInterface::class,
            \App\Modules\Identity\Services\SessionQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Identity\Contracts\SessionCommandServiceInterface::class,
            \App\Modules\Identity\Services\SessionCommandService::class,
        );
    }

    public function boot(): void
    {
        // Register policies — Laravel auto-discovers by convention, but we
        // bind explicitly so the route-name → permission-key mapping is clear.
    }
}
