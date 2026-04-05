import re
from typing import List, Dict, Any, Optional

def parse_quiz_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses raw text into a list of structured questions using regex.
    Supports multiple formats:
    1. Question text
    A) Option A
    B) Option B
    C) Option C
    D) Option D
    Answer: A
    
    Or:
    1. Question text
    a. Option A
    b. Option B
    c. Option C
    d. Option D
    Ans: B
    """
    questions = []
    current_question = None
    
    lines = raw_text.split('\n')
    
    # Regex patterns
    q_pattern = re.compile(r'^\s*(\d+)[\.\)]\s+(.*)')
    opt_pattern = re.compile(r'^\s*([A-Ga-g])[\.\)]\s+(.*)')
    ans_pattern = re.compile(r'^\s*(?:Answer|Ans|Correct)[\s:]*([A-Ga-g])', re.IGNORECASE)
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        q_match = q_pattern.match(line)
        if q_match:
            # Save previous question if exists
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
            opt_text = opt_match.group(2).strip()
            current_question["options"].append(opt_text)
            continue
            
        ans_match = ans_pattern.match(line)
        if ans_match and current_question is not None:
            ans_letter = ans_match.group(1).upper()
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

    # Don't forget the last question
    if current_question and current_question.get("question") and current_question.get("options"):
        questions.append(current_question)

    return questions

def parse_quiz_text_advanced(raw_text: str) -> List[Dict[str, Any]]:
    """
    Advanced parser that handles more complex formats including:
    - Multi-line questions
    - Different option separators
    - Answer in various positions
    """
    questions = []
    
    # Split by question numbers (1., 1), 1. etc)
    blocks = re.split(r'\n(?=\d+[\.\)]\s+)', raw_text)
    
    for block in blocks:
        if not block.strip():
            continue
            
        question_data = {
            "id": 0,
            "question": "",
            "options": [],
            "answer": ""
        }
        
        lines = block.strip().split('\n')
        
        # Parse question number and text
        first_line = lines[0].strip()
        q_match = re.match(r'^(\d+)[\.\)]\s+(.*)', first_line)
        if q_match:
            question_data["id"] = int(q_match.group(1))
            question_data["question"] = q_match.group(2)
            lines = lines[1:]  # Remove first line
        
        # Parse options and answer
        options = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for answer line
            ans_match = re.match(r'^\s*(?:Answer|Ans|Correct)[\s:]*([A-Ga-g])', line, re.IGNORECASE)
            if ans_match:
                question_data["answer"] = ans_match.group(1).upper()
                continue
            
            # Check for option line
            opt_match = re.match(r'^\s*([A-Ga-g])[\.\)]\s+(.*)', line)
            if opt_match:
                options.append(opt_match.group(2).strip())
            elif options:
                # Continue previous option if line doesn't start with option pattern
                options[-1] += " " + line
            else:
                # If no options found yet, append to question
                question_data["question"] += " " + line
        
        question_data["options"] = options
        
        if question_data["question"] and question_data["options"]:
            questions.append(question_data)
    
    return questions

def validate_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate and clean questions data"""
    validated = []
    
    for q in questions:
        # Ensure all required fields exist
        if not q.get("question") or not q.get("options"):
            continue
            
        # Clean up question text
        q["question"] = " ".join(q["question"].split())
        
        # Ensure options are properly formatted
        q["options"] = [opt.strip() for opt in q["options"] if opt.strip()]
        
        # Validate answer
        if q.get("answer") and q["answer"] in ["A", "B", "C", "D", "E", "F", "G"]:
            # Convert letter to index if needed
            answer_index = ord(q["answer"]) - ord("A")
            if answer_index < len(q["options"]):
                q["correct_answer"] = q["options"][answer_index]
        elif q.get("answer") and len(q["options"]) > 0:
            # If answer is text, try to match with options
            answer_text = q["answer"].lower()
            for i, opt in enumerate(q["options"]):
                if opt.lower() == answer_text:
                    q["correct_answer"] = opt
                    q["answer"] = chr(ord("A") + i)
                    break
        
        validated.append(q)
    
    return validated