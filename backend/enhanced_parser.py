import re
from typing import List, Dict, Any, Optional

def extract_answer_key(raw_text: str) -> Dict[int, str]:
    """Extract answers from an 'Answers:' or 'Đáp án:' section at the end of the text."""
    ans_key = {}
    ans_match = re.search(r'(?:Answers|Đáp án|Key)[\s:]*\n?(.*)', raw_text, re.IGNORECASE | re.DOTALL)
    if ans_match:
        ans_text = ans_match.group(1)
        matches = re.finditer(r'\b(\d+)\s*[\.\)\-]?\s*([A-Ga-g])\b', ans_text, re.IGNORECASE)
        for m in matches:
            ans_key[int(m.group(1))] = m.group(2).upper()
    return ans_key

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
    
    answer_key = extract_answer_key(raw_text)
    
    lines = raw_text.split('\n')
    
    # Regex patterns
    q_pattern = re.compile(r'^\s*(?:(?:Câu|Question)\s+(\d+)\s*[\.\):/]*\s*(.*)|(\d+)\s*[\.\):/]+\s*(.*))', re.IGNORECASE)
    opt_pattern = re.compile(r'^\s*([A-Ga-g])(?:[\.\)]\s+(.*)|\s*$)')
    ans_pattern = re.compile(r'^\s*(?:Answer|Ans|Correct|Đáp án|Chọn|Giải)[\s:]*([A-Ga-g])', re.IGNORECASE)
    
    can_append = False
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            can_append = False
            continue
            
        line = line_stripped
        
        q_match = q_pattern.match(line)
        if q_match:
            # Save previous question if exists
            if current_question and current_question.get("question") and current_question.get("options"):
                if current_question["id"] in answer_key and not current_question["answer"]:
                    current_question["answer"] = answer_key[current_question["id"]]
                questions.append(current_question)
                
            current_question = {
                "id": int(q_match.group(1) or q_match.group(3)),
                "question": (q_match.group(2) or q_match.group(4) or "").strip(),
                "options": [],
                "answer": ""
            }
            can_append = True
            continue
            
        opt_match = opt_pattern.match(line)
        if opt_match and current_question is not None:
            opt_text = (opt_match.group(2) or "").strip()
            current_question["options"].append(opt_text)
            can_append = True
            continue
            
        ans_match = ans_pattern.match(line)
        if ans_match and current_question is not None:
            ans_letter = ans_match.group(1).upper()
            current_question["answer"] = ans_letter
            can_append = False
            continue
            
        # If it doesn't match and we have a current question, append to question text or last option
        if current_question and can_append:
            if not current_question["options"]:
                # Append to question text
                current_question["question"] += "\n" + line
            else:
                # Append to last option
                current_question["options"][-1] += "\n" + line

    # Don't forget the last question
    if current_question and current_question.get("question") and current_question.get("options"):
        if current_question["id"] in answer_key and not current_question["answer"]:
            current_question["answer"] = answer_key[current_question["id"]]
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
    
    answer_key = extract_answer_key(raw_text)
    
    # Split by question numbers
    blocks = re.split(r'\n(?=(?:(?:Câu|Question)\s+\d+\s*[\.\):/]*|(?:\d+)\s*[\.\):/]+)\s*)', raw_text, flags=re.IGNORECASE)
    
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
        q_match = re.match(r'^(?:(?:Câu|Question)\s+(\d+)\s*[\.\):/]*\s*(.*)|(\d+)\s*[\.\):/]+\s*(.*))', first_line, re.IGNORECASE)
        if q_match:
            question_data["id"] = int(q_match.group(1) or q_match.group(3))
            question_data["question"] = (q_match.group(2) or q_match.group(4) or "").strip()
            lines = lines[1:]  # Remove first line
        
        # Parse options and answer
        options = []
        can_append = True
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                can_append = False
                continue
                
            line = line_stripped
            
            # Check for answer line
            ans_match = re.match(r'^\s*(?:Answer|Ans|Correct|Đáp án|Chọn|Giải)[\s:]*([A-Ga-g])', line, re.IGNORECASE)
            if ans_match:
                question_data["answer"] = ans_match.group(1).upper()
                can_append = False
                continue
            
            # Check for option line
            opt_match = re.match(r'^\s*([A-Ga-g])(?:[\.\)]\s+(.*)|\s*$)', line)
            if opt_match:
                options.append((opt_match.group(2) or "").strip())
                can_append = True
            elif options and can_append:
                options[-1] += "\n" + line
            elif not options and can_append:
                # If no options found yet, append to question
                question_data["question"] += "\n" + line
        
        question_data["options"] = options
        
        if question_data["id"] in answer_key and not question_data["answer"]:
            question_data["answer"] = answer_key[question_data["id"]]
            
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
        q["question"] = q["question"].strip()
        
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