<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private string $indexName = 'applications_job_offer_candidate_unique';

    public function up(): void
    {
        if (! Schema::hasTable('applications')) {
            return;
        }

        $duplicates = DB::table('applications')
            ->select(
                'job_offer_id',
                'candidat_id',
                DB::raw('MIN(id) as keep_id'),
                DB::raw('COUNT(*) as duplicates_count')
            )
            ->groupBy('job_offer_id', 'candidat_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            DB::table('applications')
                ->where('job_offer_id', $duplicate->job_offer_id)
                ->where('candidat_id', $duplicate->candidat_id)
                ->where('id', '<>', $duplicate->keep_id)
                ->delete();
        }

        if (! $this->indexExists()) {
            Schema::table('applications', function (Blueprint $table) {
                $table->unique(['job_offer_id', 'candidat_id'], $this->indexName);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('applications') || ! $this->indexExists()) {
            return;
        }

        Schema::table('applications', function (Blueprint $table) {
            $table->dropUnique($this->indexName);
        });
    }

    private function indexExists(): bool
    {
        if (method_exists(Schema::getFacadeRoot(), 'hasIndex')) {
            return Schema::hasIndex('applications', $this->indexName);
        }

        if (! method_exists(Schema::getFacadeRoot(), 'getIndexes')) {
            return false;
        }

        foreach (Schema::getIndexes('applications') as $index) {
            if (($index['name'] ?? null) === $this->indexName) {
                return true;
            }
        }

        return false;
    }
};
