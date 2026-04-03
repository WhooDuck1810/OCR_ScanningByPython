import fitz
import json
from parser import parse_quiz_text

pdf_path = r"c:\Users\admin\Downloads\New folder (2)\QuizAuto\backend\uploads\testing file.pdf"
doc = fitz.open(pdf_path)
text = ""
for page in doc:
    text += page.get_text()
doc.close()

questions = parse_quiz_text(text)

with open("out_test.json", "w", encoding="utf-8") as f:
    json.dump({"total": len(questions), "questions": questions}, f, indent=2, ensure_ascii=False)
