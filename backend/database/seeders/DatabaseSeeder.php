<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\JobOffer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = $this->seedUser('Admin SmartJobs', 'admin@smartjobs.ma', 'admin');

        $recruteurs = [
            'r1' => $this->seedUser('Hassan Benali', 'r1@smartjobs.ma', 'recruteur'),
            'r2' => $this->seedUser('Fatima Zohra', 'r2@smartjobs.ma', 'recruteur'),
            'r3' => $this->seedUser('Karim Idrissi', 'r3@smartjobs.ma', 'recruteur'),
        ];

        $candidats = [
            'c1' => $this->seedUser('Youssef Amrani', 'c1@smartjobs.ma', 'candidat'),
            'c2' => $this->seedUser('Sara Tazi', 'c2@smartjobs.ma', 'candidat'),
            'c3' => $this->seedUser('Omar Benjelloun', 'c3@smartjobs.ma', 'candidat'),
            'c4' => $this->seedUser('Nadia Chraibi', 'c4@smartjobs.ma', 'candidat'),
            'c5' => $this->seedUser('Mehdi Alaoui', 'c5@smartjobs.ma', 'candidat'),
        ];

        $admin->forceFill(['is_premium' => false])->save();

        $this->seedRecruteurProfile($recruteurs['r1'], 'Café Atlas', 'Casablanca', 'cafe');
        $this->seedRecruteurProfile($recruteurs['r2'], 'Hôtel Kenzi', 'Agadir', 'hotel');
        $this->seedRecruteurProfile($recruteurs['r3'], 'Restaurant Al Fassia', 'Marrakech', 'restaurant');

        $this->seedCandidatProfile($candidats['c1'], 'Casablanca', '2 ans serveur', 'Serveur');
        $this->seedCandidatProfile($candidats['c2'], 'Agadir', '3 ans cuisine', 'Cuisinière');
        $this->seedCandidatProfile($candidats['c3'], 'Marrakech', '1 an bar', 'Barista');
        $this->seedCandidatProfile($candidats['c4'], 'Rabat', '4 ans réception', 'Réceptionniste');
        $this->seedCandidatProfile($candidats['c5'], 'Fès', '2 ans plonge', 'Plongeur');

        $offers = [
            1 => $this->seedOffer($recruteurs['r1'], 'Serveur expérimenté', 'Service en salle, accueil client et gestion des commandes.', 'Casablanca', 'CDI', 4500, '15', 'active', 15),
            2 => $this->seedOffer($recruteurs['r1'], 'Chef de rang', 'Coordination du service et accompagnement des serveurs.', 'Casablanca', 'CDD', 5000, '7', 'active', 7),
            3 => $this->seedOffer($recruteurs['r2'], 'Réceptionniste bilingue', 'Accueil hôtelier, check-in, check-out et suivi client.', 'Agadir', 'CDI', 6000, '30', 'active', 30),
            4 => $this->seedOffer($recruteurs['r2'], 'Femme de chambre', 'Nettoyage chambres, contrôle qualité et préparation linge.', 'Agadir', 'CDD', 3500, '15', 'active', 15),
            5 => $this->seedOffer($recruteurs['r3'], 'Cuisinier marocain', 'Préparation plats marocains, mise en place et respect hygiène.', 'Marrakech', 'CDI', 5500, '30', 'active', 30),
            6 => $this->seedOffer($recruteurs['r3'], 'Plongeur', 'Nettoyage vaisselle, soutien cuisine et respect cadence service.', 'Marrakech', 'Extra', 2500, '7', 'active', 7),
            7 => $this->seedOffer($recruteurs['r1'], 'Barista', 'Préparation cafés, service comptoir et gestion petite caisse.', 'Casablanca', 'Saisonnier', 4000, '15', 'active', 15),
            8 => $this->seedOffer($recruteurs['r2'], "Maître d'hôtel", 'Supervision salle, accueil VIP et coordination équipes.', 'Agadir', 'CDI', 8000, '30', 'active', 30),
            9 => $this->seedOffer($recruteurs['r3'], 'Commis de cuisine', 'Aide cuisine, découpe, préparation et nettoyage poste.', 'Marrakech', 'CDD', 3000, '7', 'expired', -1),
            10 => $this->seedOffer($recruteurs['r2'], 'Serveur petit-déjeuner', 'Service buffet, réassort et accueil petit-déjeuner.', 'Agadir', 'Extra', 3200, '15', 'active', 15),
        ];

        $this->seedServiceQuiz($offers[1]);
        $this->seedReceptionQuiz($offers[3]);

        $this->seedApplication($candidats['c1'], $offers[1], 'en_attente', 80);
        $this->seedApplication($candidats['c2'], $offers[3], 'acceptee', 90);
        $this->seedApplication($candidats['c3'], $offers[5], 'en_attente', null);
        $this->seedApplication($candidats['c4'], $offers[7], 'refusee', null);
        $this->seedApplication($candidats['c5'], $offers[6], 'en_attente', null);
    }

    private function seedUser(string $name, string $email, string $role): User
    {
        return User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password'),
                'role' => $role,
                'is_premium' => false,
                'premium_expires_at' => null,
                'vues_aujourdhui' => 0,
                'derniere_vue_date' => null,
            ]
        );
    }

    private function seedRecruteurProfile(User $user, string $etablissement, string $ville, string $type): void
    {
        $user->recruteurProfile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'nom_etablissement' => $etablissement,
                'ville' => $ville,
                'type_etablissement' => $type,
            ]
        );
    }

    private function seedCandidatProfile(User $user, string $ville, string $experience, string $poste): void
    {
        $user->candidatProfile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'ville' => $ville,
                'experience' => $experience,
                'poste_recherche' => $poste,
                'cv_path' => null,
                'photo_path' => null,
            ]
        );
    }

    private function seedOffer(
        User $recruteur,
        string $titre,
        string $description,
        string $ville,
        string $typeContrat,
        int $salaire,
        string $duree,
        string $status,
        int $expiresInDays
    ): JobOffer {
        return JobOffer::updateOrCreate(
            [
                'recruteur_id' => $recruteur->id,
                'titre_poste' => $titre,
            ],
            [
                'description' => $description,
                'ville' => $ville,
                'salaire' => $salaire,
                'type_contrat' => $typeContrat,
                'duree_validite' => $duree,
                'expires_at' => Carbon::now()->addDays($expiresInDays)->toDateString(),
                'status' => $status,
            ]
        );
    }

    private function seedServiceQuiz(JobOffer $offer): void
    {
        $quiz = Quiz::updateOrCreate(
            ['job_offer_id' => $offer->id],
            ['titre' => 'Test connaissance service', 'passing_score' => 60]
        );

        $this->seedQuestion($quiz, 'Quel est le bon ordre de service?', [
            'Entrée puis plat puis dessert',
            'Dessert en premier',
            'Tout en même temps',
            'Plat puis entrée',
        ], 'Entrée puis plat puis dessert');

        $this->seedQuestion($quiz, 'Comment répondre à un client mécontent?', [
            "L'ignorer",
            'Écouter et proposer une solution',
            'Appeler le manager directement',
            'Demander au client de partir',
        ], 'Écouter et proposer une solution');

        $this->seedQuestion($quiz, 'Quelle est la température idéale de service du vin rouge?', [
            '5°C',
            '18°C',
            '30°C',
            'Peu importe',
        ], '18°C');
    }

    private function seedReceptionQuiz(JobOffer $offer): void
    {
        $quiz = Quiz::updateOrCreate(
            ['job_offer_id' => $offer->id],
            ['titre' => 'Test accueil hôtelier', 'passing_score' => 70]
        );

        $this->seedQuestion($quiz, 'Un client arrive à 10h pour un check-in prévu à 14h. Que faites-vous?', [
            'Refuser',
            'Lui proposer de laisser ses bagages et revenir',
            "L'enregistrer immédiatement",
            "L'ignorer",
        ], 'Lui proposer de laisser ses bagages et revenir');

        $this->seedQuestion($quiz, 'Comment terminer un appel téléphonique professionnel?', [
            'Raccrocher directement',
            'Dire merci et bonne journée',
            'Dire bye',
            'Attendre que le client raccroche',
        ], 'Dire merci et bonne journée');
    }

    private function seedQuestion(Quiz $quiz, string $text, array $options, string $correctAnswer): void
    {
        Question::updateOrCreate(
            ['quiz_id' => $quiz->id, 'question_text' => $text],
            ['options' => $options, 'correct_answer' => $correctAnswer]
        );
    }

    private function seedApplication(User $candidat, JobOffer $offer, string $status, ?int $score): void
    {
        Application::updateOrCreate(
            [
                'job_offer_id' => $offer->id,
                'candidat_id' => $candidat->id,
            ],
            [
                'status' => $status,
                'quiz_score' => $score,
                'cv_path' => null,
            ]
        );
    }
}
