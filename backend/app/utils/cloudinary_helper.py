import os
import cloudinary
import cloudinary.uploader
import logging

logger = logging.getLogger(__name__)

# Flag to track configuration state
cloudinary_ready = False

try:
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.environ.get('CLOUDINARY_API_KEY')
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        cloudinary_ready = True
        logger.info("Cloudinary configured successfully.")
    else:
        logger.warning("Cloudinary environment variables missing. Falling back to local storage.")
except Exception as e:
    logger.error(f"Error configuring Cloudinary: {e}")

def upload_pdf_to_cloudinary(file_path: str, public_id: str = None) -> str:
    """
    Uploads a local file to Cloudinary as a raw document.
    Returns the secure URL on success, or a local server URL fallback.
    """
    global cloudinary_ready
    
    if not os.path.exists(file_path):
        logger.error(f"Upload failed: File not found at {file_path}")
        return ""
        
    if cloudinary_ready:
        try:
            logger.info(f"Uploading {file_path} to Cloudinary...")
            result = cloudinary.uploader.upload(
                file_path,
                resource_type="raw", # Important: raw is used for PDFs/non-images
                public_id=public_id,
                folder="research_papers"
            )
            secure_url = result.get('secure_url')
            if secure_url:
                logger.info(f"Cloudinary upload successful: {secure_url}")
                return secure_url
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}. Falling back to local storage.")
            
    # Mock / Local fallback setup
    # Return local storage path (e.g. static link)
    filename = os.path.basename(file_path)
    logger.info(f"Using local path fallback for {filename}")
    return f"/uploads/{filename}"
