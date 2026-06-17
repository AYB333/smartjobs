<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('candidate_profile_views')) {
            return;
        }

        Schema::create('candidate_profile_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recruteur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('candidat_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('application_id')->nullable()->constrained('applications')->nullOnDelete();
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->index(['recruteur_id', 'viewed_at']);
            $table->index(['recruteur_id', 'candidat_id', 'viewed_at'], 'candidate_profile_views_recruiter_candidate_viewed_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_profile_views');
    }
};
