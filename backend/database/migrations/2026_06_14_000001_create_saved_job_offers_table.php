<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('saved_job_offers')) {
            return;
        }

        Schema::create('saved_job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('job_offer_id')->constrained('job_offers')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'job_offer_id'], 'saved_job_offers_user_offer_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_job_offers');
    }
};
