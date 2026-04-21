const fs = require('fs');
const glob = require('fs').readdirSync;
const models = ['CandidatProfile', 'RecruteurProfile', 'JobOffer', 'Quiz', 'Question', 'Application', 'Payment'];

models.forEach(m => {
    const f = 'app/Models/' + m + '.php';
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/protected \\\\ =/g, 'protected \ =');
    c = c.replace(/\\\\->/g, '\->');
    fs.writeFileSync(f, c);
});

let userC = <?php
namespace App\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;
use Laravel\\Sanctum\\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected  = [
        'name', 'email', 'password', 'role',
    ];

    protected  = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    
    public function candidatProfile() { return ->hasOne(CandidatProfile::class); }
    public function recruteurProfile() { return ->hasOne(RecruteurProfile::class); }
    public function jobOffers() { return ->hasMany(JobOffer::class, 'recruteur_id'); }
    public function applications() { return ->hasMany(Application::class, 'candidat_id'); }
};
fs.writeFileSync('app/Models/User.php', userC.replace(/protected undef/g,'protected \$').replace(/return undef/g, 'return \'));
