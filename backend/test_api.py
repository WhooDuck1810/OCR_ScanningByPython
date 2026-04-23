import requests

url = "http://52.221.241.254:8088/api/upload"
pdf_path = r"c:\Users\admin\Downloads\New folder (2)\QuizAuto\backend\uploads\202109041040416132eab922588_bo-50-cau-hoi-trac-nghiem-lich-su-12-bai-1.pdf"

with open(pdf_path, "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)

data = response.json()
text = data.get("content", "")

print(f"Extracted text length: {len(text)}")

url_gen = "http://52.221.241.254:8088/api/generate-quiz"
response_gen = requests.post(url_gen, json={"text": text})

if response_gen.status_code == 200:
    res_data = response_gen.json()
    questions = res_data.get("questions", [])
    print(f"API Returned {len(questions)} questions!")
else:
    print("API Error:", response_gen.text)
