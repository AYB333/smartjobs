<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        if ($user->role === 'recruteur') {
            $user->recruteurProfile()->create([
                'nom_etablissement' => null,
                'ville' => null,
                'type_etablissement' => null,
            ]);
        } else {
            $user->candidatProfile()->create([]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load($user->role . 'Profile')
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Invalid login credentials'
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;
        $profileRelation = $user->role . 'Profile';

        return response()->json([
            'message' => 'Login successful',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'profile' => $user->load($profileRelation)->$profileRelation
        ]);
    }

    public function logout(): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        if ($user && $user->currentAccessToken()) {
            /** @var \Laravel\Sanctum\PersonalAccessToken $token */
            $token = $user->currentAccessToken();
            $token->delete();
        }
        
        return response()->json([
            'message' => 'Successfully logged out'
        ]);
    }

    public function me(): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        if ($user) {
            $profileRelation = $user->role . 'Profile';
            return response()->json([
                'user' => $user->load($profileRelation)
            ]);
        }
        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
