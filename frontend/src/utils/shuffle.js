export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function shuffleQuiz(questions) {
  return shuffleArray(questions).map((q) => {
    let exactAnswerText = q.answer || q.correct_answer;
    
    // Convert letter answer to exact option string before shuffling
    if (exactAnswerText && /^[A-Da-d]$/.test(exactAnswerText)) {
      const optionIndex = exactAnswerText.toUpperCase().charCodeAt(0) - 65;
      if (q.options && q.options[optionIndex]) {
        exactAnswerText = q.options[optionIndex];
      }
    }
    
    return {
      ...q,
      answer: exactAnswerText,
      correct_answer: exactAnswerText,
      options: shuffleArray(q.options),
    };
  });
}
