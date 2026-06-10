<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $quiz_id
 * @property string $question_text
 * @property array<int, string> $options
 * @property string $correct_answer
 * @property-read Quiz $quiz
 */
class Question extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = ['options' => 'array'];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }
}
