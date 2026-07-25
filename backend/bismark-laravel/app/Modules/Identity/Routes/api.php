<?php

declare(strict_types=1);

/**
 * Identity module routes — mounted by routes/api.php loader.
 */

use App\Modules\Identity\Controllers\AuthController;
use App\Modules\Identity\Controllers\PermissionController;
use App\Modules\Identity\Controllers\RoleController;
use App\Modules\Identity\Controllers\SessionController;
use App\Modules\Identity\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['tenant.resolve'])->group(function (): void {
    // Public auth — still requires tenant header.
    Route::post('auth/login', [AuthController::class, 'login'])
        ->name('auth.login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        // Users
        Route::apiResource('users', UserController::class)
            ->only(['index', 'show', 'store', 'update', 'destroy'])
            ->names([
                'index'   => 'users.list',
                'show'    => 'users.show',
                'store'   => 'users.create',
                'update'  => 'users.update',
                'destroy' => 'users.delete',
            ]);
        Route::post('users/{id}/suspend', [UserController::class, 'suspend'])->name('users.suspend');
        Route::post('users/{id}/unsuspend', [UserController::class, 'unsuspend'])->name('users.unsuspend');
        Route::post('users/{id}/lock', [UserController::class, 'lock'])->name('users.lock');
        Route::post('users/{id}/unlock', [UserController::class, 'unlock'])->name('users.unlock');

        // Roles
        Route::apiResource('roles', RoleController::class)
            ->only(['index', 'show', 'store', 'update', 'destroy'])
            ->names([
                'index'   => 'rbac.list',
                'show'    => 'rbac.show',
                'store'   => 'rbac.create',
                'update'  => 'rbac.update',
                'destroy' => 'rbac.delete',
            ]);

        // Permissions (read-only)
        Route::apiResource('permissions', PermissionController::class)
            ->only(['index', 'show'])
            ->names([
                'index' => 'rbac.list',
                'show'  => 'rbac.show',
            ]);

        // Sessions
        Route::get('auth/sessions', [SessionController::class, 'index'])->name('auth.list');
        Route::post('auth/sessions/{id}/revoke', [SessionController::class, 'revoke'])->name('auth.revoke');
    });
});
