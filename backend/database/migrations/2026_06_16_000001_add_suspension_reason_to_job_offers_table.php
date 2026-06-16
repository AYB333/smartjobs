<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_offers', function (Blueprint $table) {
            if (! Schema::hasColumn('job_offers', 'suspension_reason')) {
                $table->text('suspension_reason')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_offers', function (Blueprint $table) {
            if (Schema::hasColumn('job_offers', 'suspension_reason')) {
                $table->dropColumn('suspension_reason');
            }
        });
    }
};
