<?php

declare(strict_types=1);

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

/**
 * Authentication Controller.
 *
 * Handles login, logout, refresh, and 2FA challenge.
 * Uses JWT (ADR-001) with refresh token rotation (ADR-009).
 */
#[OA\Tag(name: 'Authentication', description: 'Login, logout, refresh, 2FA')]
final class AuthController extends Controller
{
    public function __construct(
        private readonly \App\Modules\Identity\Services\AuthService $authService,
    ) {}

    #[OA\Post(
        path: '/auth/login',
        tags: ['Authentication'],
        summary: 'Login with username/email and password',
    )]
    public function login(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'username' => 'required|string',
            'password' => 'required|string',
            'remember_me' => 'boolean',
            'device_fingerprint' => 'string|nullable',
        ]);

        $result = $this->authService->attemptLogin(
            $validated['username'],
            $validated['password'],
            $request->ip(),
            $request->userAgent(),
            $validated['device_fingerprint'] ?? null,
        );

        if (!$result['success']) {
            return response()->json([
                'type' => 'https://docs.bismark.api/errors/invalid-credentials',
                'title' => 'Invalid Credentials',
                'status' => 401,
                'detail' => $result['message'] ?? 'The provided credentials are incorrect.',
                'code' => $result['code'] ?? 'INVALID_CREDENTIALS',
                'correlation_id' => (string) \Illuminate\Support\Str::uuid(),
                'timestamp' => now()->toIso8601String(),
            ], 401);
        }

        // 2FA required?
        if (isset($result['challenge_required'])) {
            return response()->json([
                'data' => [
                    'challenge_required' => true,
                    'challenge_token' => $result['challenge_token'],
                    'methods' => $result['methods'],
                ],
            ]);
        }

        return response()->json([
            'data' => [
                'access_token' => $result['access_token'],
                'token_type' => 'bearer',
                'expires_in' => $result['expires_in'],
                'refresh_token' => $result['refresh_token'],
                'user' => $result['user'],
            ],
        ]);
    }

    #[OA\Post(path: '/auth/logout', tags: ['Authentication'], summary: 'Logout (revoke current session)')]
    public function logout(Request $request): JsonResponse
    {
        $sessionId = $request->attributes->get('session_id');
        $this->authService->logout($sessionId);

        return response()->json(null, 204);
    }

    #[OA\Post(path: '/auth/refresh', tags: ['Authentication'], summary: 'Refresh access token')]
    public function refresh(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'refresh_token' => 'required|string',
        ]);

        $result = $this->authService->refreshToken($validated['refresh_token']);

        return response()->json([
            'data' => [
                'access_token' => $result['access_token'],
                'token_type' => 'bearer',
                'expires_in' => $result['expires_in'],
                'refresh_token' => $result['refresh_token'],
            ],
        ]);
    }

    #[OA\Get(path: '/auth/me', tags: ['Authentication'], summary: 'Get current user + roles + permissions')]
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $this->authService->getCurrentUserInfo($user);

        return response()->json(['data' => $data]);
    }
}
