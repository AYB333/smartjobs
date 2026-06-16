<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\ApplicationMessage;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApplicationMessageController extends Controller
{
    public function index(Application $application): JsonResponse
    {
        $authorization = $this->authorizeChat($application);

        if ($authorization) {
            return $authorization;
        }

        $messages = $application->messages()
            ->with('sender:id,name,role')
            ->oldest()
            ->get();

        ApplicationMessage::where('application_id', $application->id)
            ->where('sender_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    public function store(Request $request, Application $application): JsonResponse
    {
        $authorization = $this->authorizeChat($application);

        if ($authorization) {
            return $authorization;
        }

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        /** @var User $user */
        $user = Auth::user();

        $message = $application->messages()->create([
            'sender_id' => $user->id,
            'message' => trim($validated['message']),
        ]);

        $receiverId = $user->id === $application->candidat_id
            ? $application->jobOffer->recruteur_id
            : $application->candidat_id;

        UserNotification::create([
            'user_id' => $receiverId,
            'type' => 'chat_message',
            'title' => 'Nouveau message',
            'message' => sprintf('%s vous a envoye un message concernant "%s".', $user->name, $application->jobOffer->titre_poste),
            'data' => [
                'application_id' => $application->id,
                'offer_id' => $application->job_offer_id,
                'action_url' => $user->role === 'candidat' ? '/recruteur/candidatures' : '/candidat/dashboard',
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $message->load('sender:id,name,role'),
        ], 201);
    }

    private function authorizeChat(Application $application): ?JsonResponse
    {
        $application->loadMissing('jobOffer');

        /** @var User|null $user */
        $user = Auth::user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($application->status !== 'acceptee') {
            return response()->json([
                'success' => false,
                'message' => 'La discussion est disponible uniquement apres acceptation.',
            ], 403);
        }

        $isCandidate = $user->role === 'candidat' && $application->candidat_id === $user->id;
        $isRecruiter = $user->role === 'recruteur' && $application->jobOffer->recruteur_id === $user->id;

        if (! $isCandidate && ! $isRecruiter) {
            return response()->json(['success' => false, 'message' => 'Non autorise.'], 403);
        }

        return null;
    }
}
