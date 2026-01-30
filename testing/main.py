import fitz
import easyocr
import os

def extract_pdf_content(file_path):
    if not os.path.exists(file_path):
        print("File not found.")
        return

    doc = fitz.open(file_path)
    reader = easyocr.Reader(['en'])
    
    for i, page in enumerate(doc):
        print(f"--- Page {i+1} ---")
        
        text = page.get_text().strip()
        
        if text:
            print("Method: Digital Extraction")
            print(text)
        else:
            print("Method: OCR (Scanned Image)")
            pix = page.get_pixmap()
            img_bytes = pix.tobytes("png")
            results = reader.readtext(img_bytes, detail=0)
            print(" ".join(results))
        
        print("\n")

    doc.close()

if __name__ == "__main__":
    path = "your_file.pdf"
    extract_pdf_content(path)