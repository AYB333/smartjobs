<?php

namespace App\Support;

use App\Models\User;
use App\Models\UserNotification;

class AdminNotifier
{
    /**
     * @param array<string, mixed> $data
     */
    public static function notify(string $type, string $title, string $message, array $data = []): void
    {
        User::where('role', 'admin')
            ->select('id')
            ->each(function (User $admin) use ($type, $title, $message, $data) {
                UserNotification::create([
                    'user_id' => $admin->id,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'data' => $data,
                ]);
            });
    }
}
