import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models.db import get_db
from app.auth.services import token_required
from app.pdf.downloader import download_pdf_file
from app.utils.cloudinary_helper import upload_pdf_to_cloudinary

pdf_bp = Blueprint('pdf', __name__)

@pdf_bp.route('/download', methods=['POST'])
@token_required
def download_paper():
    db = get_db()
    user_id = request.current_user['_id']
    data = request.get_json() or {}
    
    title = data.get('title', '').strip()
    external_pdf_url = data.get('external_pdf_url', '').strip()
    source = data.get('source', 'Unknown').strip()
    paper_metadata = data.get('paper_metadata', {})
    
    if not external_pdf_url:
        return jsonify({'message': 'Missing external PDF download link (external_pdf_url).'}), 400
        
    # Check if we already have this paper downloaded
    existing_paper = db.research_papers.find_one({'external_pdf_url': external_pdf_url})
    if existing_paper and existing_paper.get('pdf_url'):
        # Log download activity for history
        db.downloads.insert_one({
            'user_id': user_id,
            'paper_id': existing_paper['_id'],
            'downloaded_at': datetime.datetime.utcnow()
        })
        return jsonify({
            'message': 'Paper already downloaded and cached.',
            'paper_id': str(existing_paper['_id']),
            'pdf_url': existing_paper['pdf_url']
        }), 200
        
    # Start download
    local_path = download_pdf_file(external_pdf_url)
    if not local_path:
        return jsonify({'message': 'Failed to download the PDF from the provided link.'}), 400
        
    # Sync with Cloudinary
    # Create clean public ID matching title
    clean_title = "".join([c for c in title if c.isalnum() or c in (' ', '_', '-')]).strip()[:50]
    public_id = f"paper_{clean_title.replace(' ', '_')}" if clean_title else None
    
    cloudinary_url = upload_pdf_to_cloudinary(local_path, public_id)
    
    # Clean up local file after upload if uploaded to Cloudinary
    if cloudinary_url and not cloudinary_url.startswith('/uploads/'):
        try:
            if os.path.exists(local_path):
                os.remove(local_path)
        except Exception:
            pass
            
    # Save paper record in database
    paper_document = {
        'title': title or 'Unknown Research Paper',
        'authors': paper_metadata.get('authors', []),
        'year': paper_metadata.get('year'),
        'journal': paper_metadata.get('journal', 'Unknown Publication'),
        'citation_count': paper_metadata.get('citation_count', 0),
        'abstract': paper_metadata.get('abstract', ''),
        'external_pdf_url': external_pdf_url,
        'pdf_url': cloudinary_url,
        'source': source,
        'created_at': datetime.datetime.utcnow()
    }
    
    try:
        if existing_paper:
            # Update cache link
            db.research_papers.update_one(
                {'_id': existing_paper['_id']},
                {'$set': {'pdf_url': cloudinary_url, 'updated_at': datetime.datetime.utcnow()}}
            )
            paper_id = existing_paper['_id']
        else:
            # Create new document
            result = db.research_papers.insert_one(paper_document)
            paper_id = result.inserted_id
            
        # Log download activity
        db.downloads.insert_one({
            'user_id': user_id,
            'paper_id': paper_id,
            'downloaded_at': datetime.datetime.utcnow()
        })
        
        # Log to activity feed
        try:
            db.logs.insert_one({
                'user_id': user_id,
                'action': 'PDF_DOWNLOADED',
                'details': f"Downloaded PDF for paper: {title or 'Unknown Paper'}",
                'paper_id': ObjectId(paper_id),
                'timestamp': datetime.datetime.utcnow()
            })
        except Exception:
            pass
            
        return jsonify({
            'message': 'Paper downloaded and stored successfully!',
            'paper_id': str(paper_id),
            'pdf_url': cloudinary_url
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Failed to update paper records: {str(e)}'}), 500

@pdf_bp.route('/extract', methods=['POST'])
@token_required
def extract_paper_content():
    import os
    import requests
    from app.pdf.extractor import extract_text_from_pdf, segment_paper_sections
    from app.nlp.pipeline import extract_keywords_tfidf, extract_named_entities, compute_text_embedding
    
    db = get_db()
    data = request.get_json() or {}
    paper_id = data.get('paper_id')
    
    if not paper_id:
        return jsonify({'message': 'Missing paper_id parameter.'}), 400
        
    try:
        paper = db.research_papers.find_one({'_id': ObjectId(paper_id)})
        if not paper:
            return jsonify({'message': 'Research paper not found in records.'}), 404
            
        # If already parsed/extracted, return cached response
        if paper.get('extracted_sections') and paper.get('keywords'):
            paper['id'] = str(paper['_id'])
            del paper['_id']
            user_doc = db.users.find_one({'_id': request.current_user['_id']})
            role = user_doc.get('role', 'user') if user_doc else 'user'
            rem_credits = user_doc.get('credits', 999999 if role == 'admin' else 50) if user_doc else 50
            return jsonify({
                'message': 'Loaded cached extraction results.',
                'paper': paper,
                'credits': rem_credits
            }), 200
            
        # Check and deduct 1 credit for new PDF extraction
        user_id = request.current_user['_id']
        user_doc = db.users.find_one({'_id': user_id})
        if not user_doc:
            return jsonify({'message': 'User account not found.'}), 404
        role = user_doc.get('role', 'user')
        current_credits = user_doc.get('credits', 50)
        if role != 'admin' and current_credits < 1:
            return jsonify({'message': 'Insufficient AI credits. PDF extraction requires 1 credit.', 'credits': current_credits, 'required_credits': 1}), 402
            
        if role != 'admin':
            current_credits -= 1
            db.users.update_one({'_id': user_id}, {'$set': {'credits': current_credits}})
        rem_credits = 999999 if role == 'admin' else current_credits
        
        pdf_url = paper.get('pdf_url') or paper.get('external_pdf_url')
        if not pdf_url:
            return jsonify({'message': 'No PDF source link is available for this paper.'}), 400
            
        # Determine local path
        local_path = ""
        is_temp_download = False
        
        if pdf_url.startswith('/uploads/'):
            # Fetch from local uploads folder
            filename = os.path.basename(pdf_url)
            local_path = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../uploads')), filename)
        else:
            # External Cloudinary or original URL: download locally for parsing
            try:
                temp_filename = f"temp_parse_{ObjectId()}.pdf"
                temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../uploads'))
                os.makedirs(temp_dir, exist_ok=True)
                local_path = os.path.join(temp_dir, temp_filename)
                
                headers = {'User-Agent': 'Mozilla/5.0'}
                res = requests.get(pdf_url, headers=headers, timeout=15)
                if res.status_code == 200:
                    with open(local_path, 'wb') as f:
                        f.write(res.content)
                    is_temp_download = True
                else:
                    return jsonify({'message': f'Failed to retrieve PDF file: status {res.status_code}'}), 400
            except Exception as e:
                return jsonify({'message': f'Failed to retrieve PDF file. Error: {str(e)}'}), 400
                
        if not os.path.exists(local_path):
            return jsonify({'message': 'Target PDF file does not exist on disk.'}), 400
            
        # 1. Parse text and segment
        raw_text = extract_text_from_pdf(local_path)
        if not raw_text.strip():
            # Clean up temp file
            if is_temp_download and os.path.exists(local_path):
                os.remove(local_path)
            return jsonify({'message': 'No text could be extracted from this PDF.'}), 400
            
        sections = segment_paper_sections(raw_text)
        
        # 2. Extract NLP features
        # Analyze abstract or introduction for key items
        content_to_analyze = sections.get('abstract') or sections.get('introduction', '') or raw_text[:10000]
        keywords = extract_keywords_tfidf(content_to_analyze, 8)
        entities = extract_named_entities(content_to_analyze)
        
        # 3. Compute Embeddings
        embeddings = compute_text_embedding(content_to_analyze)
        
        # Clean up temporary download file
        if is_temp_download and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass
                
        # 4. Save to MongoDB
        update_doc = {
            'extracted_sections': sections,
            'keywords': keywords,
            'entities': entities,
            'embeddings': embeddings,
            'updated_at': datetime.datetime.utcnow()
        }
        
        db.research_papers.update_one({'_id': ObjectId(paper_id)}, {'$set': update_doc})
        
        # Retrieve updated document
        updated_paper = db.research_papers.find_one({'_id': ObjectId(paper_id)})
        
        # Log this activity
        try:
            db.logs.insert_one({
                'user_id': user_id,
                'action': 'PDF_EXTRACTED',
                'details': f"Extracted sections from paper: {updated_paper.get('title', 'Unknown Paper')}",
                'paper_id': ObjectId(paper_id),
                'timestamp': datetime.datetime.utcnow()
            })
        except Exception:
            pass
            
        updated_paper['id'] = str(updated_paper['_id'])
        del updated_paper['_id']
        
        return jsonify({
            'message': 'Extraction and NLP processing completed successfully!',
            'paper': updated_paper,
            'credits': rem_credits
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Extraction failed: {str(e)}'}), 500

@pdf_bp.route('/export', methods=['GET'])
@token_required
def export_review_file():
    from flask import send_file
    from app.utils.export_helper import generate_pdf_report, generate_docx_report
    
    db = get_db()
    review_id = request.args.get('review_id')
    export_type = request.args.get('type', 'pdf').strip().lower()
    
    if not review_id:
        return jsonify({'message': 'Missing review_id parameter.'}), 400
        
    try:
        review = db.literature_reviews.find_one({'_id': ObjectId(review_id)})
        if not review:
            return jsonify({'message': 'Literature review record not found.'}), 404
            
        title = review.get('title', 'Literature Review Synthesis')
        review_text = review.get('review_text', '')
        comparison_table = review.get('comparison_table', [])
        gaps = review.get('research_gap', '')
        novelty = review.get('novelty', '')
        
        if export_type == 'docx':
            buffer = generate_docx_report(title, review_text, comparison_table, gaps, novelty)
            return send_file(
                buffer,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                as_attachment=True,
                download_name=f"{title.replace(' ', '_')}.docx"
            )
        else: # Default PDF
            buffer = generate_pdf_report(title, review_text, comparison_table, gaps, novelty)
            return send_file(
                buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f"{title.replace(' ', '_')}.pdf"
            )
            
    except Exception as e:
        return jsonify({'message': f'Failed to export report: {str(e)}'}), 500
