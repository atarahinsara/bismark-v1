<?php

declare(strict_types=1);

namespace App\Modules\Organization;

use Illuminate\Support\ServiceProvider;

final class OrganizationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            \App\Modules\Organization\Repositories\BranchRepositoryInterface::class,
            \App\Modules\Organization\Repositories\BranchRepository::class,
        );
        $this->app->singleton(
            \App\Modules\Organization\Repositories\DepartmentRepositoryInterface::class,
            \App\Modules\Organization\Repositories\DepartmentRepository::class,
        );

        $this->app->singleton(
            \App\Modules\Organization\Contracts\BranchQueryServiceInterface::class,
            \App\Modules\Organization\Services\BranchQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Organization\Contracts\BranchCommandServiceInterface::class,
            \App\Modules\Organization\Services\BranchCommandService::class,
        );
        $this->app->singleton(
            \App\Modules\Organization\Contracts\DepartmentQueryServiceInterface::class,
            \App\Modules\Organization\Services\DepartmentQueryService::class,
        );
        $this->app->singleton(
            \App\Modules\Organization\Contracts\DepartmentCommandServiceInterface::class,
            \App\Modules\Organization\Services\DepartmentCommandService::class,
        );
    }
}
