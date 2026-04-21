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
        Schema::create('offres', function (Blueprint $table) {
            $table->id(); // ID dyal l'offre (kitzad bo7do)
            $table->string('titre'); // Smiya dyal l'khedma
            $table->text('description'); // Tafassil dyal l'khedma
            $table->string('entreprise'); // Smiya dyal charika
            $table->string('lieu'); // Fin jat (Agadir, Casa...)
            $table->decimal('salaire', 8, 2)->nullable(); // L'khalssa (tqder tkoun khawya)
            $table->timestamps(); // Kitzad fiha m3ach tcreyat w m3ach tbedlat
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offres');
    }
};
