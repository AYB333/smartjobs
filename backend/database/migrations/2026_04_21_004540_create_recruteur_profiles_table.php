<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recruteur_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('nom_etablissement')->nullable();
            $table->string('ville')->nullable();
            $table->enum('type_etablissement', ['cafÃ©', 'hÃ´tel', 'restaurant'])->nullable();
            $table->boolean('is_premium')->default(false);
            $table->dateTime('premium_expires_at')->nullable();
            $table->integer('vues_aujourdhui')->default(0);
            $table->date('derniere_vue_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recruteur_profiles');
    }
};
