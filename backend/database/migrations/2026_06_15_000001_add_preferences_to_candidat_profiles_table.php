<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidat_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('candidat_profiles', 'disponibilite')) {
                $table->string('disponibilite')->nullable()->after('poste_recherche');
            }

            if (! Schema::hasColumn('candidat_profiles', 'contrat_prefere')) {
                $table->string('contrat_prefere')->nullable()->after('disponibilite');
            }
        });
    }

    public function down(): void
    {
        Schema::table('candidat_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('candidat_profiles', 'contrat_prefere')) {
                $table->dropColumn('contrat_prefere');
            }

            if (Schema::hasColumn('candidat_profiles', 'disponibilite')) {
                $table->dropColumn('disponibilite');
            }
        });
    }
};
