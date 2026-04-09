import google.generativeai as genai

genai.configure(api_key="AIzaSyBke7mJ_RQF_EmbAm9CGVDRkQM1OL17zgs")

try:
    with open("dummy.pdf", "w") as f:
        f.write("text")
    uploaded_file = genai.upload_file(path="dummy.pdf", mime_type="application/pdf")
    print("Upload returned state:", uploaded_file.state.name)
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    print("Model initialized.")
    response = model.generate_content([
        uploaded_file,
        "test"
    ])
    print("Response:", response.text)
except Exception as e:
    print(f"ERROR: {e}")
