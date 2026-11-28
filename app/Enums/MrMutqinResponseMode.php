<?php

namespace App\Enums;

enum MrMutqinResponseMode: string
{
    case AnswerOnly = 'ANSWER_ONLY';
    case NavigateOnly = 'NAVIGATE_ONLY';
    case AnswerAndNavigate = 'ANSWER_AND_NAVIGATE';
    case ExecuteAction = 'EXECUTE_ACTION';
    case PrepareAndConfirm = 'PREPARE_AND_CONFIRM';
    case Clarify = 'CLARIFY';
}