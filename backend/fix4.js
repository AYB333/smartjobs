const fs = require('fs');

const UserContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;
use Laravel\\Sanctum\\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected \\ = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected \\ = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    
    public function candidatProfile() { return \\->hasOne(CandidatProfile::class); }
    public function recruteurProfile() { return \\->hasOne(RecruteurProfile::class); }
    public function jobOffers() { return \\->hasMany(JobOffer::class, 'recruteur_id'); }
    public function applications() { return \\->hasMany(Application::class, 'candidat_id'); }
};

const CandidatProfileContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class CandidatProfile extends Model
{
    use HasFactory;
    protected \\ = [];

    public function user() { return \\->belongsTo(User::class); }
};

const RecruteurProfileContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class RecruteurProfile extends Model
{
    use HasFactory;
    protected \\ = [];

    public function user() { return \\->belongsTo(User::class); }
    public function jobOffers() { return \\->hasMany(JobOffer::class, 'recruteur_id'); }
    public function payments() { return \\->hasMany(Payment::class, 'recruteur_id'); }
};

const JobOfferContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class JobOffer extends Model
{
    use HasFactory;
    protected \\ = [];

    public function recruteur() { return \\->belongsTo(User::class, 'recruteur_id'); }
    public function applications() { return \\->hasMany(Application::class); }
    public function quiz() { return \\->hasOne(Quiz::class); }
};

const QuizContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Quiz extends Model
{
    use HasFactory;
    protected \\ = [];

    public function jobOffer() { return \\->belongsTo(JobOffer::class); }
    public function questions() { return \\->hasMany(Question::class); }
};

const QuestionContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Question extends Model
{
    use HasFactory;
    protected \\ = [];
    protected \\ = ['options' => 'array'];

    public function quiz() { return \\->belongsTo(Quiz::class); }
};

const ApplicationContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Application extends Model
{
    use HasFactory;
    protected \\ = [];

    public function jobOffer() { return \\->belongsTo(JobOffer::class); }
    public function candidat() { return \\->belongsTo(User::class, 'candidat_id'); }
};

const PaymentContent = <?php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Payment extends Model
{
    use HasFactory;
    protected \\ = [];

    public function recruteur() { return \\->belongsTo(User::class, 'recruteur_id'); }
};

fs.writeFileSync('app/Models/User.php', UserContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/CandidatProfile.php', CandidatProfileContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/RecruteurProfile.php', RecruteurProfileContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/JobOffer.php', JobOfferContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/Quiz.php', QuizContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/Question.php', QuestionContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/Application.php', ApplicationContent.replace(/\\\\\\$/g, '$'));
fs.writeFileSync('app/Models/Payment.php', PaymentContent.replace(/\\\\\\$/g, '$'));

console.log("done");
