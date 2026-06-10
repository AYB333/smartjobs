<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->decimal('amount', 10, 2)->default(0);
                $table->string('currency')->default('MAD');
                $table->string('stripe_payment_id')->nullable();
                $table->string('status')->default('pending');
                $table->timestamps();
            });
        } else {
            Schema::table('payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payments', 'stripe_payment_id')) {
                    $table->string('stripe_payment_id')->nullable();
                }
                if (! Schema::hasColumn('payments', 'status')) {
                    $table->string('status')->default('pending');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
