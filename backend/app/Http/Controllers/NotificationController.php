<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(max($request->integer('limit', 12), 1), 30);

        $notifications = UserNotification::where('user_id', Auth::id())
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $this->unreadCountValue(),
        ]);
    }

    public function unreadCount(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'unread_count' => $this->unreadCountValue(),
        ]);
    }

    public function markRead(UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorise.',
            ], 403);
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'data' => $notification->fresh(),
            'unread_count' => $this->unreadCountValue(),
        ]);
    }

    public function markAllRead(): JsonResponse
    {
        UserNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'unread_count' => 0,
        ]);
    }

    private function unreadCountValue(): int
    {
        return UserNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->count();
    }
}
