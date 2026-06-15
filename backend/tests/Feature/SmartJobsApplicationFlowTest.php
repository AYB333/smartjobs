<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\CandidatProfile;
use App\Models\JobOffer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\RecruteurProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmartJobsApplicationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_candidate_can_apply_to_active_offer_without_quiz_using_profile_cv(): void
    {
        $candidate = $this->candidateWithProfile();
        $offer = $this->offerForRecruiter();

        Sanctum::actingAs($candidate);

        $response = $this->postJson("/api/offres/{$offer->id}/postuler");

        $response
            ->assertCreated()
            ->assertJson([
                'success' => true,
                'has_quiz' => false,
            ]);

        $this->assertDatabaseHas('applications', [
            'job_offer_id' => $offer->id,
            'candidat_id' => $candidate->id,
            'cv_path' => 'cvs/test-cv.pdf',
            'status' => 'en_attente',
        ]);
    }

    public function test_candidate_applies_first_then_quiz_updates_existing_application(): void
    {
        $candidate = $this->candidateWithProfile();
        $offer = $this->offerForRecruiter();
        $quiz = Quiz::factory()->for($offer, 'jobOffer')->create(['passing_score' => 50]);
        $firstQuestion = Question::factory()->for($quiz)->create([
            'question_text' => 'Bonne pratique ?',
            'options' => ['A', 'B'],
            'correct_answer' => 'A',
        ]);
        $secondQuestion = Question::factory()->for($quiz)->create([
            'question_text' => 'Mauvaise pratique ?',
            'options' => ['C', 'D'],
            'correct_answer' => 'C',
        ]);

        Sanctum::actingAs($candidate);

        $applyResponse = $this->postJson("/api/offres/{$offer->id}/postuler");

        $applyResponse
            ->assertCreated()
            ->assertJson([
                'success' => true,
                'has_quiz' => true,
            ]);

        $this->assertSame(1, Application::where('job_offer_id', $offer->id)->where('candidat_id', $candidate->id)->count());

        $quizResponse = $this->postJson("/api/offres/{$offer->id}/pass-quiz/submit", [
            'answers' => [
                ['question_id' => $firstQuestion->id, 'answer' => 'A'],
                ['question_id' => $secondQuestion->id, 'answer' => 'D'],
            ],
        ]);

        $quizResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.score', 50);

        $this->assertDatabaseHas('applications', [
            'job_offer_id' => $offer->id,
            'candidat_id' => $candidate->id,
            'quiz_score' => 50,
        ]);
        $this->assertSame(1, Application::where('job_offer_id', $offer->id)->where('candidat_id', $candidate->id)->count());
    }

    public function test_duplicate_application_returns_conflict_and_keeps_single_application(): void
    {
        $candidate = $this->candidateWithProfile();
        $offer = $this->offerForRecruiter();

        Sanctum::actingAs($candidate);

        $this->postJson("/api/offres/{$offer->id}/postuler")->assertCreated();

        $response = $this->postJson("/api/offres/{$offer->id}/postuler");

        $response
            ->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['data' => ['id', 'job_offer_id', 'candidat_id']]);

        $this->assertSame(1, Application::where('job_offer_id', $offer->id)->where('candidat_id', $candidate->id)->count());
    }

    public function test_candidate_without_cv_cannot_apply(): void
    {
        $candidate = $this->candidateWithProfile(cvPath: null);
        $offer = $this->offerForRecruiter();

        Sanctum::actingAs($candidate);

        $response = $this->postJson("/api/offres/{$offer->id}/postuler");

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['message']);

        $this->assertDatabaseMissing('applications', [
            'job_offer_id' => $offer->id,
            'candidat_id' => $candidate->id,
        ]);
    }

    public function test_recruiter_can_update_own_application_status_but_not_other_recruiter_application(): void
    {
        $owner = $this->recruiterWithProfile();
        $otherRecruiter = $this->recruiterWithProfile();
        $candidate = $this->candidateWithProfile();
        $offer = $this->offerForRecruiter($owner);
        $application = Application::factory()->for($offer, 'jobOffer')->create([
            'candidat_id' => $candidate->id,
            'status' => 'en_attente',
        ]);

        Sanctum::actingAs($owner);

        $this->patchJson("/api/postulations/{$application->id}/status", ['status' => 'acceptee'])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'acceptee',
        ]);

        $this->patchJson("/api/postulations/{$application->id}/status", ['status' => 'refusee'])
            ->assertOk();

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'refusee',
        ]);

        Sanctum::actingAs($otherRecruiter);

        $this->patchJson("/api/postulations/{$application->id}/status", ['status' => 'acceptee'])
            ->assertForbidden();
    }

    public function test_admin_can_suspend_and_activate_offer_and_suspended_offer_is_hidden_publicly(): void
    {
        $admin = User::factory()->admin()->create();
        $offer = $this->offerForRecruiter();
        $visibleOffer = $this->offerForRecruiter(attributes: ['titre_poste' => 'Cuisinier']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/offers/{$offer->id}/status", ['status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $publicResponse = $this->getJson('/api/offres?limit=100');
        $publicResponse->assertOk();

        $offerIds = collect($publicResponse->json('data.data'))->pluck('id');
        $this->assertFalse($offerIds->contains($offer->id));
        $this->assertTrue($offerIds->contains($visibleOffer->id));

        $this->patchJson("/api/admin/offers/{$offer->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $publicResponse = $this->getJson('/api/offres?limit=100');
        $offerIds = collect($publicResponse->json('data.data'))->pluck('id');
        $this->assertTrue($offerIds->contains($offer->id));
    }

    public function test_role_guards_block_wrong_dashboards(): void
    {
        $candidate = $this->candidateWithProfile();
        $recruiter = $this->recruiterWithProfile();

        Sanctum::actingAs($candidate);

        $this->getJson('/api/mes-offres')->assertForbidden();

        Sanctum::actingAs($recruiter);

        $this->getJson('/api/admin/stats')->assertForbidden();
    }

    public function test_candidate_can_save_and_unsave_active_offer(): void
    {
        $candidate = $this->candidateWithProfile();
        $offer = $this->offerForRecruiter();

        Sanctum::actingAs($candidate);

        $this->postJson("/api/offres/{$offer->id}/save")
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('saved_job_offers', [
            'user_id' => $candidate->id,
            'job_offer_id' => $offer->id,
        ]);

        $this->getJson('/api/saved-offers')
            ->assertOk()
            ->assertJsonPath('offer_ids.0', $offer->id);

        $this->deleteJson("/api/offres/{$offer->id}/save")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('saved_job_offers', [
            'user_id' => $candidate->id,
            'job_offer_id' => $offer->id,
        ]);
    }

    private function candidateWithProfile(?string $cvPath = 'cvs/test-cv.pdf'): User
    {
        $candidate = User::factory()->candidat()->create();

        CandidatProfile::factory()->for($candidate, 'user')->create([
            'cv_path' => $cvPath,
        ]);

        return $candidate;
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function recruiterWithProfile(array $attributes = []): User
    {
        $recruiter = User::factory()->recruteur()->create();

        RecruteurProfile::factory()->for($recruiter, 'user')->create($attributes);

        return $recruiter;
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function offerForRecruiter(?User $recruiter = null, array $attributes = []): JobOffer
    {
        $recruiter ??= $this->recruiterWithProfile();

        return JobOffer::factory()->for($recruiter, 'recruteur')->create($attributes);
    }
}
