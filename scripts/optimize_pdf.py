import os
import sys
import time
import pypdf
from PIL import Image

def optimize_pdf(input_path: str, output_path: str, scale: float = 0.60, quality: int = 65):
    start_time = time.time()
    orig_size = os.path.getsize(input_path)
    print(f"Iniciando optimización de: {input_path}")
    print(f"Tamaño original: {orig_size / (1024 * 1024):.2f} MB")
    
    reader = pypdf.PdfReader(input_path)
    writer = pypdf.PdfWriter()
    total_pages = len(reader.pages)
    print(f"Total de páginas a procesar: {total_pages}")
    
    for i, page in enumerate(reader.pages):
        writer.add_page(page)
        curr_page = writer.pages[i]
        
        # Optimizar imágenes de la página
        for img_obj in curr_page.images:
            try:
                orig_img = img_obj.image
                new_w = max(1, int(orig_img.width * scale))
                new_h = max(1, int(orig_img.height * scale))
                resized = orig_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                img_obj.replace(resized, quality=quality)
            except Exception as e:
                print(f"Aviso en página {i} imagen {img_obj.name}: {e}")
        
        if (i + 1) % 25 == 0 or (i + 1) == total_pages:
            elapsed = time.time() - start_time
            print(f"Procesadas {i + 1}/{total_pages} páginas ({((i + 1)/total_pages)*100:.1f}%) - {elapsed:.1f}s transcurridos")

    temp_out = output_path + ".tmp"
    print("Guardando archivo optimizado...")
    with open(temp_out, "wb") as f:
        writer.write(f)
        
    if os.path.exists(output_path):
        os.remove(output_path)
    os.rename(temp_out, output_path)
    
    final_size = os.path.getsize(output_path)
    print(f"Optimización completada con éxito.")
    print(f"Tamaño final: {final_size / (1024 * 1024):.2f} MB (Reducción: {(1 - final_size/orig_size)*100:.1f}%)")
    print(f"Tiempo total: {time.time() - start_time:.1f} segundos")
    return final_size

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "Documento_Nora.pdf"
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join("backend", "static", "Documento_Nora.pdf")
    optimize_pdf(src, dst)
