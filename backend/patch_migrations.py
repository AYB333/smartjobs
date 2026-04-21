import os, glob

base_dir = r"C:\laragon\www\smartjobs\backend"

migrations = [
  {"name": "create_candidat_profiles_table", "up": """
        Schema::create('candidat_profiles', function (Blueprint \) {
            \->id();
            \->foreignId('user_id')->constrained('users')->onDelete('cascade');
            \->string('ville');
            \->string('experience');
            \->string('poste_recherche');
            \->string('cv_path')->nullable();
            \->string('photo_path')->nullable();
            \->timestamps();
        });
  """},
  {"name": "create_recruteur_profiles_table", "up": """
        Schema::create('recruteur_profiles', function (Blueprint \) {
            \->id();
            \->foreignId('user_id')->constrained('users')->onDelete('cascade');
            \->string('nom_etablissement');
            \->string('ville');
            \->enum('type_etablissement', ['caf?', 'h?tel', 'restaurant']);
            \->boolean('is_premium')->default(false);
            \->dateTime('premium_expires_at')->nullable();
            \->integer('vues_aujourdhui')->default(0);
            \->date('derniere_vue_date')->nullable();
            \->timestamps();
        });
  """},
  {"name": "create_job_offers_table", "up": """
        Schema::create('job_offers', function (Blueprint \) {
            \->id();
            \->foreignId('recruteur_id')->constrained('users')->onDelete('cascade');
            \->string('titre_poste');
            \->text('description');
            \->string('ville');
            \->decimal('salaire', 10, 2)->nullable();
            \->enum('type_contrat', ['CDI', 'CDD', 'Extra', 'Saisonnier']);
            \->enum('duree_validite', ['7', '15', '30']);
            \->date('expires_at');
            \->enum('status', ['active', 'expired', 'suspended'])->default('active');
            \->timestamps();
        });
  """},
  {"name": "create_quizzes_table", "up": """
        Schema::create('quizzes', function (Blueprint \) {
            \->id();
            \->foreignId('job_offer_id')->constrained('job_offers')->onDelete('cascade');
            \->string('titre');
            \->timestamps();
        });
  """},
  {"name": "create_questions_table", "up": """
        Schema::create('questions', function (Blueprint \) {
            \->id();
            \->foreignId('quiz_id')->constrained('quizzes')->onDelete('cascade');
            \->text('question_text');
            \->json('options');
            \->string('correct_answer');
            \->timestamps();
        });
  """},
  {"name": "create_applications_table", "up": """
        Schema::create('applications', function (Blueprint \) {
            \->id();
            \->foreignId('job_offer_id')->constrained('job_offers')->onDelete('cascade');
            \->foreignId('candidat_id')->constrained('users')->onDelete('cascade');
            \->enum('status', ['en_attente', 'acceptee', 'refusee'])->default('en_attente');
            \->integer('quiz_score')->nullable();
            \->timestamps();
        });
  """},
  {"name": "create_payments_table", "up": """
        Schema::create('payments', function (Blueprint \) {
            \->id();
            \->foreignId('recruteur_id')->constrained('users')->onDelete('cascade');
            \->decimal('amount', 10, 2);
            \->string('package_type');
            \->timestamps();
        });
  """}
]

mig_dir = os.path.join(base_dir, "database", "migrations")
for file in os.listdir(mig_dir):
  if not file.endswith(".php"): continue
  filepath = os.path.join(mig_dir, file)
  with open(filepath, 'r') as f:
    content = f.read()
  
  for m in migrations:
    if m['name'] in file:
      # Inject the UP part
      import re
      new_content = re.sub(r"public function up\(\)[^{]*{.*?Schema::create\('[^']+', function \(Blueprint \\\\) \{.*?\}\);.*?}", "public function up(): void { " + m['up'] + " }", content, flags=re.DOTALL)
      with open(filepath, 'w') as f:
        f.write(new_content)
        
print("Migrations updated")
