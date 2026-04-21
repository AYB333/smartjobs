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
        Schema::create('job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recruteur_id')->constrained('users')->onDelete('cascade');
            $table->string('titre_poste');
            $table->text('description');
            $table->string('ville');
            $table->decimal('salaire', 10, 2)->nullable();
            $table->enum('type_contrat', ['CDI', 'CDD', 'Extra', 'Saisonnier']);
            $table->enum('duree_validite', ['7', '15', '30']);
            $table->date('expires_at');
            $table->enum('status', ['active', 'expired', 'suspended'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_offers');
    }
};
