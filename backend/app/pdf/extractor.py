import fitz  # PyMuPDF
import pdfplumber
import re
import logging
import os

logger = logging.getLogger(__name__)

# Core section header regex triggers
SECTION_HEADERS = {
    'abstract': r'\b(abstract|synopsis)\b',
    'introduction': r'\b(1\.?\s+)?(introduction|intro)\b',
    'related_work': r'\b(\d\.?\s+)?(related\s+work|literature\s+review|background)\b',
    'methodology': r'\b(\d\.?\s+)?(methodology|methods|proposed\s+method|method)\b',
    'dataset': r'\b(\d\.?\s+)?(dataset|data\s+set|corpus)\b',
    'experiments': r'\b(\d\.?\s+)?(experiments|experimental\s+setup|evaluation)\b',
    'results': r'\b(\d\.?\s+)?(results|findings)\b',
    'discussion': r'\b(\d\.?\s+)?(discussion)\b',
    'conclusion': r'\b(\d\.?\s+)?(conclusion|concluding\s+remarks)\b',
    'references': r'\b(references|bibliography|works\s+cited)\b'
}

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts all raw text from a PDF file using PyMuPDF.
    Falls back to pdfplumber on failure.
    """
    if not os.path.exists(pdf_path):
        logger.error(f"File not found: {pdf_path}")
        return ""
        
    text = ""
    # Try PyMuPDF (fitz)
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text()
        doc.close()
        if text.strip():
            logger.info("Successfully extracted text using PyMuPDF.")
            return text
    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed: {e}. Trying pdfplumber fallback.")
        
    # Fallback to pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(pages_text)
            if text.strip():
                logger.info("Successfully extracted text using pdfplumber fallback.")
                return text
    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
        
    return text

def segment_paper_sections(text: str) -> dict:
    """
    Segments raw paper text into standard sections using regex header anchors.
    """
    sections = {
        'abstract': "",
        'introduction': "",
        'related_work': "",
        'methodology': "",
        'dataset': "",
        'experiments': "",
        'results': "",
        'discussion': "",
        'conclusion': "",
        'references': []
    }
    
    if not text:
        return sections
        
    lines = text.split('\n')
    current_section = None
    section_buffer = []
    
    # Pre-parse section anchors
    header_indices = []
    for idx, line in enumerate(lines):
        line_clean = line.strip().lower()
        # Skip empty lines or too long lines (unlikely to be section titles)
        if not line_clean or len(line_clean) > 60:
            continue
            
        for key, pattern in SECTION_HEADERS.items():
            if re.match(pattern, line_clean):
                header_indices.append((idx, key))
                break
                
    # Sort indices and deduplicate consecutive matching keys
    header_indices.sort(key=lambda x: x[0])
    
    # Perform segmentation
    last_idx = 0
    for i in range(len(header_indices)):
        start_idx, key = header_indices[i]
        
        # Capture content for the previous section
        if current_section:
            content = "\n".join(lines[last_idx:start_idx]).strip()
            if current_section == 'references':
                # References should be parsed as list items
                ref_list = [r.strip() for r in content.split('\n') if r.strip() and len(r.strip()) > 10]
                sections[current_section] = ref_list
            else:
                sections[current_section] = content
                
        current_section = key
        last_idx = start_idx + 1 # skip the header line itself
        
    # Capture the very last section
    if current_section and last_idx < len(lines):
        content = "\n".join(lines[last_idx:]).strip()
        if current_section == 'references':
            ref_list = [r.strip() for r in content.split('\n') if r.strip() and len(r.strip()) > 10]
            sections[current_section] = ref_list
        else:
            sections[current_section] = content
            
    # Fallback/Heuristics: If Abstract is empty, try to extract text between "Abstract" and "Introduction" manually
    if not sections['abstract']:
        abstract_match = re.search(r'(?i)abstract[\s\S]+?(?=introduction|1\.\s+intro)', text)
        if abstract_match:
            sections['abstract'] = abstract_match.group(0).replace('Abstract', '').strip()
            
    return sections
