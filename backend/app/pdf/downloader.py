import os
import requests
import uuid
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Ensure local uploads directory exists
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../uploads'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def download_pdf_file(url: str) -> str:
    """
    Downloads a PDF file from an external URL and saves it to local uploads directory.
    Returns the absolute path to the local file, or None on failure.
    """
    if not url:
        logger.error("Download failed: URL is empty")
        return None
        
    # Auto-fix common paper repository URL patterns
    download_url = url.strip()
    if 'arxiv.org/abs/' in download_url:
        download_url = download_url.replace('arxiv.org/abs/', 'arxiv.org/pdf/')
        if not download_url.endswith('.pdf'):
            download_url += '.pdf'
    elif 'arxiv.org/pdf/' in download_url and not download_url.endswith('.pdf'):
        download_url += '.pdf'
        
    try:
        # Standard browser headers to avoid web application firewall (WAF) blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        logger.info(f"Downloading PDF from: {download_url}")
        response = requests.get(download_url, headers=headers, stream=True, allow_redirects=True, timeout=20)
        
        # Verify content type
        content_type = response.headers.get('content-type', '').lower()
        if 'html' in content_type and 'arxiv.org' in download_url and not download_url.endswith('.pdf'):
            fallback_url = download_url + '.pdf'
            response = requests.get(fallback_url, headers=headers, stream=True, allow_redirects=True, timeout=20)
            content_type = response.headers.get('content-type', '').lower()
            if 'html' not in content_type:
                download_url = fallback_url
                
        if 'html' in content_type:
            logger.error(f"Download failed: URL returned HTML page, not a PDF. URL: {download_url}")
            return None
            
        # Parse clean filename from URL or assign a unique token
        parsed_url = urlparse(download_url)
        filename = os.path.basename(parsed_url.path)
        if not filename.endswith('.pdf'):
            filename = f"paper_{uuid.uuid4().hex[:8]}.pdf"
            
        local_path = os.path.join(UPLOAD_FOLDER, filename)
        
        # Stream file to disk
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        logger.info(f"PDF downloaded successfully to: {local_path}")
        return local_path
        
    except Exception as e:
        logger.error(f"Error during PDF download: {e}")
        return None
