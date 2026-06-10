<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'derniere_vue_date')) {
                $table->date('derniere_vue_date')->nullable()->after('vues_aujourdhui');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'derniere_vue_date')) {
                $table->dropColumn('derniere_vue_date');
            }
        });
    }
};
