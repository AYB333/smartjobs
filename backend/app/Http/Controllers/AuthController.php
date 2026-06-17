<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateMeRequest;
use App\Models\User;
use App\Support\AdminNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private function profileRelationFor(User $user): ?string
    {
        return match ($user->role) {
            'candidat' => 'candidatProfile',
            'recruteur' => 'recruteurProfile',
            default => null,
        };
    }

    private function loadUserProfile(User $user): User
    {
        $profileRelation = $this->profileRelationFor($user);

        if ($profileRelation) {
            $user->load($profileRelation);
        }

        return $user;
    }

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
            $user->candidatProfile()->create([
                'ville' => null,
                'experience' => null,
                'poste_recherche' => null,
                'disponibilite' => null,
                'contrat_prefere' => null,
            ]);
        }

        $isRecruiter = $user->role === 'recruteur';
        AdminNotifier::notify(
            $isRecruiter ? 'admin_recruiter_registered' : 'admin_candidate_registered',
            $isRecruiter ? 'Nouveau recruteur inscrit' : 'Nouveau candidat inscrit',
            sprintf('%s vient de creer un compte %s.', $user->name, $isRecruiter ? 'recruteur' : 'candidat'),
            [
                'user_id' => $user->id,
                'role' => $user->role,
                'action_url' => '/admin/dashboard',
            ],
        );

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->loadUserProfile($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;
        $profileRelation = $this->profileRelationFor($user);
        $this->loadUserProfile($user);
        $profile = $profileRelation ? $user->getRelation($profileRelation) : null;

        return response()->json([
            'message' => 'Login successful',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'profile' => $profile,
        ]);
    }

    public function logout(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        if ($user && $user->currentAccessToken()) {
            /** @var PersonalAccessToken $token */
            $token = $user->currentAccessToken();
            $token->delete();
        }

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function me(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        if ($user) {
            return response()->json([
                'user' => $this->loadUserProfile($user),
            ]);
        }

        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    public function updateMe(UpdateMeRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $user->update(['name' => $validated['name']]);
        }

        if ($user->role === 'candidat') {
            $profile = $user->candidatProfile()->firstOrCreate(['user_id' => $user->id]);

            $profileData = [];
            foreach (['ville', 'experience', 'poste_recherche', 'disponibilite', 'contrat_prefere'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $profileData[$field] = $validated[$field];
                }
            }

            if ($request->hasFile('cv')) {
                if ($profile->cv_path && Storage::disk('public')->exists($profile->cv_path)) {
                    Storage::disk('public')->delete($profile->cv_path);
                }
                $profileData['cv_path'] = $request->file('cv')->store('cvs', 'public');
            }

            if ($request->hasFile('photo')) {
                if ($profile->photo_path && Storage::disk('public')->exists($profile->photo_path)) {
                    Storage::disk('public')->delete($profile->photo_path);
                }
                $profileData['photo_path'] = $request->file('photo')->store('photos', 'public');
            }

            if (! empty($profileData)) {
                $profile->update($profileData);
            }
        }

        if ($user->role === 'recruteur') {
            $profile = $user->recruteurProfile()->firstOrCreate(['user_id' => $user->id]);

            $profileData = [];
            foreach (['ville', 'nom_etablissement', 'type_etablissement'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $profileData[$field] = $validated[$field];
                }
            }

            if (! empty($profileData)) {
                $profile->update($profileData);
            }
        }

        $user->refresh();

        return response()->json([
            'message' => 'Profil mis a jour avec succes.',
            'user' => $this->loadUserProfile($user),
        ]);
    }
}
