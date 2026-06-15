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
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->resetJobBoardData();

        $admin = $this->seedUser('Admin SmartJobs', 'admin@smartjobs.ma', 'admin');
        $admin->forceFill([
            'is_premium' => false,
            'premium_expires_at' => null,
        ])->save();

        $recruteurs = $this->seedRecruteurs();
        $candidats = $this->seedCandidats();
        $offers = $this->seedOffers($recruteurs);

        $this->seedOfferQuizzes($offers);
        $this->seedApplications($candidats, $offers);
    }

    private function resetJobBoardData(): void
    {
        $imagePaths = JobOffer::query()
            ->whereNotNull('image_path')
            ->pluck('image_path')
            ->filter()
            ->all();

        if ($imagePaths) {
            Storage::disk('public')->delete($imagePaths);
        }

        Application::query()->delete();
        Question::query()->delete();
        Quiz::query()->delete();
        JobOffer::query()->delete();
    }

    /**
     * @return array<string, User>
     */
    private function seedRecruteurs(): array
    {
        $definitions = [
            'r1' => ['Hassan Benali', 'r1@smartjobs.ma', 'Cafe Atlas', 'Casablanca', 'cafe'],
            'r2' => ['Fatima Zohra', 'r2@smartjobs.ma', 'Hotel Kenzi', 'Agadir', 'hotel'],
            'r3' => ['Karim Idrissi', 'r3@smartjobs.ma', 'Restaurant Al Fassia', 'Marrakech', 'restaurant'],
            'r4' => ['Amina Raji', 'r4@smartjobs.ma', 'Riad Noor', 'Rabat', 'hotel'],
            'r5' => ['Yassine El Fassi', 'r5@smartjobs.ma', 'Maison Fes Gourmet', 'Fes', 'restaurant'],
            'r6' => ['Salma Berrada', 'r6@smartjobs.ma', 'Tanger Marina Cafe', 'Tanger', 'cafe'],
        ];

        $recruteurs = [];

        foreach ($definitions as $key => [$name, $email, $etablissement, $ville, $type]) {
            $user = $this->seedUser($name, $email, 'recruteur');
            $this->seedRecruteurProfile($user, $etablissement, $ville, $type);
            $recruteurs[$key] = $user;
        }

        $recruteurs['r2']->forceFill([
            'is_premium' => true,
            'premium_expires_at' => Carbon::now()->addDays(30),
        ])->save();

        $recruteurs['r5']->forceFill([
            'is_premium' => true,
            'premium_expires_at' => Carbon::now()->addDays(45),
        ])->save();

        return $recruteurs;
    }

    /**
     * @return array<string, User>
     */
    private function seedCandidats(): array
    {
        $definitions = [
            'c1' => ['Youssef Amrani', 'c1@smartjobs.ma', 'Casablanca', '2 ans service en salle', 'Serveur'],
            'c2' => ['Sara Tazi', 'c2@smartjobs.ma', 'Agadir', '3 ans reception hotel', 'Receptionniste'],
            'c3' => ['Omar Benjelloun', 'c3@smartjobs.ma', 'Marrakech', '1 an bar et cafe', 'Barista'],
            'c4' => ['Nadia Chraibi', 'c4@smartjobs.ma', 'Rabat', '4 ans accueil client', 'Hote d accueil'],
            'c5' => ['Mehdi Alaoui', 'c5@smartjobs.ma', 'Fes', '2 ans plonge et hygiene', 'Plongeur'],
            'c6' => ['Imane Kabbaj', 'c6@smartjobs.ma', 'Casablanca', '5 ans management salle', 'Responsable salle'],
            'c7' => ['Anas Bakkali', 'c7@smartjobs.ma', 'Marrakech', '3 ans cuisine chaude', 'Chef de partie'],
            'c8' => ['Meryem El Mansouri', 'c8@smartjobs.ma', 'Fes', '4 ans patisserie', 'Chef patissier'],
            'c9' => ['Reda Lahlou', 'c9@smartjobs.ma', 'Tanger', '2 ans bar hotel', 'Barman'],
            'c10' => ['Hajar Skalli', 'c10@smartjobs.ma', 'Agadir', '1 an polyvalence cafe', 'Employe polyvalent'],
        ];

        $candidats = [];

        foreach ($definitions as $key => [$name, $email, $ville, $experience, $poste]) {
            $user = $this->seedUser($name, $email, 'candidat');
            $this->seedCandidatProfile($user, $ville, $experience, $poste);
            $candidats[$key] = $user;
        }

        return $candidats;
    }

    /**
     * @param array<string, User> $recruteurs
     * @return array<string, JobOffer>
     */
    private function seedOffers(array $recruteurs): array
    {
        $definitions = [
            'o1' => ['r1', 'Serveur experimente', 'Service en salle, prise de commande, encaissement et relation client.', 'Casablanca', 'CDI', 4500, '15', 'active', 15],
            'o2' => ['r1', 'Chef de rang', 'Coordination du service, suivi des tables et accompagnement des serveurs.', 'Casablanca', 'CDD', 5200, '7', 'active', 7],
            'o3' => ['r1', 'Barista specialty coffee', 'Preparation cafes, latte art, service comptoir et gestion petite caisse.', 'Casablanca', 'Saisonnier', 4200, '15', 'active', 15],
            'o4' => ['r1', 'Commis patisserie', 'Mise en place, dressage desserts simples et nettoyage du poste.', 'Casablanca', 'CDD', 3800, '30', 'active', 20],
            'o5' => ['r4', 'Responsable salle', 'Organisation du service, briefing equipe et controle qualite en salle.', 'Rabat', 'CDI', 7000, '30', 'active', 30],
            'o6' => ['r2', 'Receptionniste bilingue', 'Accueil hotelier, check-in, check-out, reservations et suivi client.', 'Agadir', 'CDI', 6200, '30', 'active', 30],
            'o7' => ['r2', 'Femme de chambre', 'Nettoyage chambres, controle qualite, preparation linge et respect standards hotel.', 'Agadir', 'CDD', 3500, '15', 'active', 12],
            'o8' => ['r2', 'Serveur petit-dejeuner', 'Service buffet, reassort, accueil clients et rangement salle.', 'Agadir', 'Extra', 3200, '15', 'active', 5],
            'o9' => ['r2', 'Night auditor', 'Accueil nuit, cloture caisse, reporting et gestion des demandes clients.', 'Agadir', 'CDI', 6500, '30', 'active', 18],
            'o10' => ['r3', 'Gouvernant etage', 'Supervision housekeeping, planning equipe et controle des chambres.', 'Marrakech', 'CDI', 5800, '30', 'active', 25],
            'o11' => ['r3', 'Cuisinier marocain', 'Preparation plats marocains, mise en place et respect hygiene HACCP.', 'Marrakech', 'CDI', 5500, '30', 'active', 30],
            'o12' => ['r3', 'Plongeur restaurant', 'Nettoyage vaisselle, soutien cuisine et respect cadence service.', 'Marrakech', 'Extra', 2800, '7', 'active', 7],
            'o13' => ['r3', 'Commis de cuisine', 'Aide cuisine, decoupe, preparation et nettoyage poste.', 'Marrakech', 'CDD', 3300, '7', 'expired', -2],
            'o14' => ['r3', 'Chef de partie chaud', 'Gestion poste chaud, cuisson, dressage et coordination avec le chef.', 'Marrakech', 'CDI', 6500, '30', 'active', 20],
            'o15' => ['r3', 'Runner restaurant', 'Envoi plats, liaison cuisine-salle et soutien service rush.', 'Marrakech', 'Extra', 3000, '7', 'active', 3],
            'o16' => ['r4', 'Receptionniste nuit', 'Accueil nuit, securite, reservations tardives et rapport shift.', 'Rabat', 'CDI', 5900, '15', 'active', 14],
            'o17' => ['r4', 'Aide cuisinier', 'Preparation ingredients, nettoyage poste et soutien equipe cuisine.', 'Rabat', 'CDD', 3600, '15', 'active', 12],
            'o18' => ['r4', 'Barista salon de the', 'Preparation boissons chaudes, service comptoir et relation client.', 'Rabat', 'CDI', 4300, '15', 'suspended', 16],
            'o19' => ['r5', 'Serveuse salon de the', 'Service salon, conseil clients et entretien espace.', 'Fes', 'CDI', 3900, '30', 'active', 21],
            'o20' => ['r5', 'Chef patissier', 'Creation desserts, gestion production et controle qualite.', 'Fes', 'CDI', 6800, '30', 'active', 30],
            'o21' => ['r5', 'Plongeur extra', 'Support plonge pendant service du soir et nettoyage cuisine.', 'Fes', 'Extra', 2600, '7', 'expired', -5],
            'o22' => ['r6', 'Responsable cafe', 'Gestion equipe, stock, caisse et qualite service cafe.', 'Tanger', 'CDI', 7200, '30', 'active', 30],
            'o23' => ['r6', 'Barman hotel', 'Preparation cocktails, service bar et inventaire boissons.', 'Tanger', 'Saisonnier', 4800, '15', 'active', 10],
            'o24' => ['r6', 'Commis de bar', 'Preparation garnitures, rangement bar et soutien barman.', 'Tanger', 'Extra', 3000, '7', 'active', 2],
            'o25' => ['r6', 'Agent reservation', 'Gestion appels, reservations, emails clients et coordination reception.', 'Tanger', 'CDI', 5600, '30', 'suspended', 20],
            'o26' => ['r1', 'Chef de cuisine', 'Pilotage brigade, menu du jour, stock, hygiene et cout matiere.', 'Casablanca', 'CDI', 9500, '30', 'active', 30],
            'o27' => ['r1', 'Hote accueil restaurant', 'Accueil clients, gestion reservations et placement en salle.', 'Casablanca', 'CDD', 4200, '7', 'active', 6],
            'o28' => ['r4', 'Pizzaiolo restaurant', 'Preparation pate, garnitures, cuisson four et entretien poste.', 'Rabat', 'CDI', 5200, '15', 'active', 11],
            'o29' => ['r3', 'Serveur banquet', 'Service evenementiel, mise en place buffet et rangement apres service.', 'Marrakech', 'Extra', 3500, '7', 'active', 4],
            'o30' => ['r2', 'Employe polyvalent cafe', 'Service comptoir, nettoyage, preparation boissons et petite restauration.', 'Agadir', 'Saisonnier', 3400, '15', 'active', 8],
        ];

        $offers = [];

        foreach ($definitions as $key => [$recruteurKey, $title, $description, $city, $contract, $salary, $duration, $status, $expiresInDays]) {
            $offers[$key] = $this->seedOffer(
                $recruteurs[$recruteurKey],
                $title,
                $description,
                $city,
                $contract,
                $salary,
                $duration,
                $status,
                $expiresInDays
            );
        }

        return $offers;
    }

    /**
     * @param array<string, JobOffer> $offers
     */
    private function seedOfferQuizzes(array $offers): void
    {
        $quizMap = [
            'o1' => 'service',
            'o3' => 'bar',
            'o5' => 'service',
            'o6' => 'reception',
            'o9' => 'reception',
            'o11' => 'kitchen',
            'o14' => 'kitchen',
            'o16' => 'reception',
            'o19' => 'service',
            'o20' => 'kitchen',
            'o22' => 'management',
            'o23' => 'bar',
            'o26' => 'kitchen',
            'o28' => 'kitchen',
            'o30' => 'bar',
        ];

        foreach ($quizMap as $offerKey => $type) {
            $this->seedTypedQuiz($offers[$offerKey], $type);
        }
    }

    /**
     * @param array<string, User> $candidats
     * @param array<string, JobOffer> $offers
     */
    private function seedApplications(array $candidats, array $offers): void
    {
        $definitions = [
            ['c1', 'o1', 'en_attente', 82],
            ['c2', 'o6', 'acceptee', 91],
            ['c3', 'o11', 'en_attente', null],
            ['c4', 'o16', 'refusee', 55],
            ['c5', 'o12', 'en_attente', null],
            ['c6', 'o5', 'acceptee', 76],
            ['c7', 'o14', 'en_attente', 68],
            ['c8', 'o20', 'en_attente', 88],
            ['c9', 'o23', 'refusee', 45],
            ['c10', 'o30', 'en_attente', 72],
            ['c1', 'o27', 'en_attente', null],
            ['c2', 'o9', 'en_attente', 84],
            ['c3', 'o3', 'acceptee', 79],
            ['c4', 'o5', 'en_attente', null],
            ['c5', 'o21', 'refusee', null],
            ['c6', 'o22', 'en_attente', 86],
            ['c7', 'o26', 'en_attente', 92],
            ['c8', 'o4', 'acceptee', null],
            ['c9', 'o24', 'en_attente', null],
            ['c10', 'o8', 'en_attente', null],
        ];

        foreach ($definitions as [$candidateKey, $offerKey, $status, $score]) {
            $this->seedApplication($candidats[$candidateKey], $offers[$offerKey], $status, $score);
        }
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
        return JobOffer::create([
            'recruteur_id' => $recruteur->id,
            'titre_poste' => $titre,
            'description' => $description,
            'ville' => $ville,
            'salaire' => $salaire,
            'type_contrat' => $typeContrat,
            'duree_validite' => $duree,
            'expires_at' => Carbon::now()->addDays($expiresInDays)->toDateString(),
            'status' => $status,
            'image_path' => null,
        ]);
    }

    private function seedTypedQuiz(JobOffer $offer, string $type): void
    {
        $config = $this->quizConfig($type);

        $quiz = Quiz::create([
            'job_offer_id' => $offer->id,
            'titre' => $config['title'],
            'passing_score' => $config['passing_score'],
        ]);

        foreach ($config['questions'] as [$text, $options, $correctAnswer]) {
            $this->seedQuestion($quiz, $text, $options, $correctAnswer);
        }
    }

    /**
     * @return array{title: string, passing_score: int, questions: array<int, array{0: string, 1: array<int, string>, 2: string}>}
     */
    private function quizConfig(string $type): array
    {
        $configs = [
            'service' => [
                'title' => 'Test service client',
                'passing_score' => 60,
                'questions' => [
                    ['Quel est le bon ordre de service?', ['Entree puis plat puis dessert', 'Dessert en premier', 'Tout en meme temps', 'Plat puis entree'], 'Entree puis plat puis dessert'],
                    ['Comment reagir face a un client mecontent?', ['Ignorer', 'Ecouter et proposer une solution', 'Repondre sechement', 'Demander au client de partir'], 'Ecouter et proposer une solution'],
                    ['Que verifier avant le rush?', ['Telephone personnel', 'Mise en place et proprete', 'Musique uniquement', 'Rien'], 'Mise en place et proprete'],
                ],
            ],
            'reception' => [
                'title' => 'Test accueil hotelier',
                'passing_score' => 70,
                'questions' => [
                    ['Un client arrive avant l heure du check-in. Que faire?', ['Refuser', 'Proposer de garder les bagages', 'Ignorer', 'Annuler sa reservation'], 'Proposer de garder les bagages'],
                    ['Comment terminer un appel professionnel?', ['Raccrocher directement', 'Dire merci et bonne journee', 'Dire bye seulement', 'Ne rien dire'], 'Dire merci et bonne journee'],
                    ['Quelle information est essentielle au check-in?', ['Preference musicale', 'Piece d identite', 'Couleur preferee', 'Reseaux sociaux'], 'Piece d identite'],
                ],
            ],
            'kitchen' => [
                'title' => 'Test cuisine et hygiene',
                'passing_score' => 65,
                'questions' => [
                    ['Que signifie HACCP?', ['Gestion hygiene alimentaire', 'Planning commercial', 'Recette dessert', 'Service client'], 'Gestion hygiene alimentaire'],
                    ['Quand se laver les mains?', ['Avant prise de poste et apres manipulation sale', 'Une fois par jour', 'Seulement en fin de service', 'Jamais avec gants'], 'Avant prise de poste et apres manipulation sale'],
                    ['Pourquoi etiqueter les produits?', ['Pour la tracabilite et les dates', 'Pour la decoration', 'Pour cacher les prix', 'Ce n est pas utile'], 'Pour la tracabilite et les dates'],
                ],
            ],
            'bar' => [
                'title' => 'Test bar et cafe',
                'passing_score' => 60,
                'questions' => [
                    ['Quel element est important pour un espresso?', ['Mouture adaptee', 'Eau froide uniquement', 'Tasse sale', 'Sucre obligatoire'], 'Mouture adaptee'],
                    ['Que faire avant de servir une boisson?', ['Verifier presentation et proprete', 'Laisser attendre sans raison', 'Oublier la commande', 'Servir sans controle'], 'Verifier presentation et proprete'],
                    ['Comment gerer le stock bar?', ['Inventaire regulier', 'Aucune verification', 'Commander au hasard', 'Vider les bouteilles'], 'Inventaire regulier'],
                ],
            ],
            'management' => [
                'title' => 'Test gestion equipe',
                'passing_score' => 70,
                'questions' => [
                    ['Quel est le role du briefing avant service?', ['Aligner equipe et priorites', 'Perdre du temps', 'Remplacer le planning', 'Eviter la communication'], 'Aligner equipe et priorites'],
                    ['Comment suivre une rupture de stock?', ['Noter, informer et proposer une alternative', 'Ignorer', 'Blamer un client', 'Fermer le service'], 'Noter, informer et proposer une alternative'],
                    ['Quel indicateur suivre en salle?', ['Satisfaction client et fluidite service', 'Couleur des murs', 'Nombre de pauses seulement', 'Aucun indicateur'], 'Satisfaction client et fluidite service'],
                ],
            ],
        ];

        return $configs[$type] ?? $configs['service'];
    }

    private function seedQuestion(Quiz $quiz, string $text, array $options, string $correctAnswer): void
    {
        Question::create([
            'quiz_id' => $quiz->id,
            'question_text' => $text,
            'options' => $options,
            'correct_answer' => $correctAnswer,
        ]);
    }

    private function seedApplication(User $candidat, JobOffer $offer, string $status, ?int $score): void
    {
        Application::create([
            'job_offer_id' => $offer->id,
            'candidat_id' => $candidat->id,
            'status' => $status,
            'quiz_score' => $score,
            'cv_path' => null,
        ]);
    }
}
