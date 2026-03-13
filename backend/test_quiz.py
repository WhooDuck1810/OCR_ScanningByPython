import random

def shuffle_questions(questions):
    shuffled = questions.copy()
    random.shuffle(shuffled)
    return shuffled

def test_shuffle_questions_length():
    original_questions = ["Q1", "Q2", "Q3", "Q4"]
    result = shuffle_questions(original_questions)
    
    assert len(result) == 4

def test_shuffle_questions_content():
    original_questions = ["Q1", "Q2", "Q3", "Q4"]
    result = shuffle_questions(original_questions)
    
    for question in original_questions:
        assert question in result