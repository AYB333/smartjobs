<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\JobOffer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function stats(): JsonResponse
    {
        $activeOffers = JobOffer::where('status', 'active')
            ->whereDate('expires_at', '>=', Carbon::today())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_offres' => $activeOffers,
                'total_offres_actives' => $activeOffers,
                'total_offres_all' => JobOffer::count(),
                'total_candidats' => User::where('role', 'candidat')->count(),
                'total_recruteurs' => User::where('role', 'recruteur')->count(),
                'total_candidatures' => Application::count(),
                'total_premium' => User::where('role', 'recruteur')->where('is_premium', true)->count(),
            ],
        ]);
    }

    public function users(): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at', 'is_premium')
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function updateOfferStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:active,suspended',
        ]);

        $offer = JobOffer::findOrFail($id);
        $offer->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Statut de l offre mis a jour.',
            'data' => $offer,
        ]);
    }
}
