export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeAnswer(q) {
  let exactAnswerText = q.answer || q.correct_answer;
  if (exactAnswerText && /^[A-Da-d]$/.test(exactAnswerText)) {
    const optionIndex = exactAnswerText.toUpperCase().charCodeAt(0) - 65;
    if (q.options && q.options[optionIndex]) {
      exactAnswerText = q.options[optionIndex];
    }
  }
  return exactAnswerText;
}

export function shuffleQuiz(questions, { shuffleQuestions = true, shuffleAnswers = true } = {}) {
  const ordered = shuffleQuestions ? shuffleArray(questions) : [...questions];
  return ordered.map((q) => {
    const exactAnswerText = normalizeAnswer(q);
    return {
      ...q,
      answer: exactAnswerText,
      correct_answer: exactAnswerText,
      options: shuffleAnswers ? shuffleArray(q.options) : q.options,
    };
  });
}
