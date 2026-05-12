<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    // 1. Expire job offers
    DB::table('job_offers')
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', Carbon::now())
        ->where('status', '!=', 'expired')
        ->update(['status' => 'expired']);

    // 2. Reset vues_aujourdhui
    DB::table('users')->update(['vues_aujourdhui' => 0]);

    // 3. Expire premium accounts
    DB::table('users')
        ->where('is_premium', true)
        ->where('premium_expires_at', '<', Carbon::now())
        ->update(['is_premium' => false]);
})->dailyAt('00:00');
