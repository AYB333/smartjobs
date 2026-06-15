<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('job_offers', 'image_path')) {
            Schema::table('job_offers', function (Blueprint $table) {
                $table->string('image_path')->nullable()->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('job_offers', 'image_path')) {
            Schema::table('job_offers', function (Blueprint $table) {
                $table->dropColumn('image_path');
            });
        }
    }
};
