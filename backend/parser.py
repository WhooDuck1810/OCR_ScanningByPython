import re

def parse_quiz_text(raw_text: str):
    """
    Parses raw text into a list of structured questions using regex.
    Expects format like:
    1. Question text
    A) Option A
    B) Option B
    C) Option C
    D) Option D
    Answer: A (optional)
    """
    # Split text into potential question blocks by matching a number followed by a dot or parenthesis at the start of a line.
    # regex: ^(\d+[\.\)])\s*(.*?)
    # Since we need to capture options as well, it's easier to use a state machine line-by-line or a more complex regex.
    
    questions = []
    current_question = None
    
    lines = raw_text.split('\n')
    
    # Regex patterns
    q_pattern = re.compile(r'^\s*(\d+)[\.\)]\s+(.*)')
    opt_pattern = re.compile(r'^\s*([A-Ga-g])[\.\)]\s+(.*)')
    ans_pattern = re.compile(r'^\s*(?:Answer|Ans)[\s:]*([A-Ga-g])', re.IGNORECASE)

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        q_match = q_pattern.match(line)
        if q_match:
            if current_question and current_question.get("question") and current_question.get("options"):
                questions.append(current_question)
                
            current_question = {
                "id": int(q_match.group(1)),
                "question": q_match.group(2).strip(),
                "options": [],
                "answer": ""
            }
            continue
            
        opt_match = opt_pattern.match(line)
        if opt_match and current_question is not None:
             # Capture option text
             opt_text = opt_match.group(2).strip()
             current_question["options"].append(opt_text)
             continue
             
        ans_match = ans_pattern.match(line)
        if ans_match and current_question is not None:
            ans_letter = ans_match.group(1).upper()
            # Try to map letter to option text if possible
            # Just store the letter or the matching option? Let's just store the letter for now.
            current_question["answer"] = ans_letter
            continue
            
        # If it doesn't match and we have a current question, append to question text or last option
        if current_question:
            if not current_question["options"]:
                # Append to question text
                current_question["question"] += " " + line
            else:
                # Append to last option
                current_question["options"][-1] += " " + line

    if current_question and current_question.get("question") and current_question.get("options"):
        questions.append(current_question)

    return questions
