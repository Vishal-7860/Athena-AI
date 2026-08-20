import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models.db import get_db
from app.auth.services import token_required
from app.ai.gemini_service import generate_paper_summary, generate_literature_synthesis

ai_bp = Blueprint('ai', __name__)

def check_and_deduct_credits(db, user_id, cost):
    user = db.users.find_one({'_id': user_id})
    if not user:
        return False, 0, "User account not found."
    role = user.get('role', 'user')
    if role == 'admin':
        return True, 999999, None
    current_credits = user.get('credits', 50)
    if current_credits < cost:
        return False, current_credits, f"Insufficient AI credits. This action requires {cost} credit(s), but you currently have {current_credits} credit(s)."
    new_credits = current_credits - cost
    db.users.update_one({'_id': user_id}, {'$set': {'credits': new_credits}})
    return True, new_credits, None

@ai_bp.route('/summarize', methods=['POST'])
@token_required
def summarize_paper():
    db = get_db()
    user_id = request.current_user['_id']
    data = request.get_json() or {}
    custom_api_key = request.headers.get('X-Gemini-API-Key')
    
    paper_id = data.get('paper_id')
    format_type = data.get('format', 'detailed').strip().lower()
    
    if not paper_id:
        return jsonify({'message': 'Missing paper_id parameter.'}), 400
        
    try:
        # Fetch research paper details
        paper = db.research_papers.find_one({'_id': ObjectId(paper_id)})
        if not paper:
            return jsonify({'message': 'Research paper not found in records.'}), 404
            
        # Extracted sections or metadata fallback
        sections = paper.get('extracted_sections') or {
            'abstract': paper.get('abstract', ''),
            'introduction': f"Title: {paper.get('title', '')}. Year: {paper.get('year', '')}.",
            'methodology': paper.get('abstract', ''),
            'results': paper.get('abstract', ''),
            'conclusion': paper.get('abstract', '')
        }
            
        # Check if user already generated this format for this paper to return cache
        existing_summary = db.summaries.find_one({
            'paper_id': ObjectId(paper_id),
            'user_id': user_id
        })
        
        # We can store multiple format summaries in one document
        if existing_summary and existing_summary.get(f'{format_type}_summary'):
            user_doc = db.users.find_one({'_id': user_id})
            role = user_doc.get('role', 'user') if user_doc else 'user'
            rem_credits = user_doc.get('credits', 999999 if role == 'admin' else 50) if user_doc else 50
            return jsonify({
                'message': 'Loaded cached summary.',
                'summary': existing_summary[f'{format_type}_summary'],
                'format': format_type,
                'paper_id': paper_id,
                'credits': rem_credits
            }), 200
            
        # Check and deduct 1 credit for new summary generation
        success, rem_credits, err_msg = check_and_deduct_credits(db, user_id, 1)
        if not success:
            return jsonify({'message': err_msg, 'credits': rem_credits, 'required_credits': 1}), 402
            
        # Trigger Gemini summary creation
        res = generate_paper_summary(paper['title'], sections, format_type, custom_key=custom_api_key)
        summary_text = res.get('summary_text', '')
        
        if not summary_text:
            # Refund credit if failed
            if request.current_user.get('role') != 'admin':
                db.users.update_one({'_id': user_id}, {'$inc': {'credits': 1}})
            return jsonify({'message': 'Failed to generate summary content.'}), 500
            
        # Save / Cache to DB
        summary_field = f'{format_type}_summary'
        if existing_summary:
            db.summaries.update_one(
                {'_id': existing_summary['_id']},
                {'$set': {summary_field: summary_text, 'updated_at': datetime.datetime.utcnow()}}
            )
            summary_id = existing_summary['_id']
        else:
            new_summary_doc = {
                'paper_id': ObjectId(paper_id),
                'user_id': user_id,
                summary_field: summary_text,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
            inserted = db.summaries.insert_one(new_summary_doc)
            summary_id = inserted.inserted_id
            
        # Log this activity
        try:
            db.logs.insert_one({
                'user_id': user_id,
                'action': 'SUMMARY_GENERATED',
                'details': f"Generated AI Summary ({format_type}) for paper: {paper.get('title', 'Unknown Paper')}",
                'paper_id': ObjectId(paper_id),
                'timestamp': datetime.datetime.utcnow()
            })
        except Exception:
            pass
            
        return jsonify({
            'message': 'Summary generated successfully!',
            'summary_id': str(summary_id),
            'summary': summary_text,
            'format': format_type,
            'paper_id': paper_id,
            'is_fallback': res.get('fallback', False),
            'credits': rem_credits
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to generate summary: {str(e)}'}), 500

@ai_bp.route('/review', methods=['POST'])
@token_required
def generate_review():
    db = get_db()
    user_id = request.current_user['_id']
    data = request.get_json() or {}
    custom_api_key = request.headers.get('X-Gemini-API-Key')
    
    paper_ids = data.get('paper_ids', [])
    title = data.get('title', 'Literature Synthesis').strip()
    
    if not paper_ids or not isinstance(paper_ids, list):
        return jsonify({'message': 'Missing list of paper_ids.'}), 400
        
    if len(paper_ids) < 2:
        return jsonify({'message': 'Provide at least 2 papers for literature review synthesis.'}), 400
        
    try:
        # Retrieve all target papers
        papers_object_ids = []
        for pid in paper_ids:
            try:
                papers_object_ids.append(ObjectId(pid))
            except Exception:
                return jsonify({'message': f'Invalid paper_id format: {pid}'}), 400
                
        papers_list = list(db.research_papers.find({'_id': {'$in': papers_object_ids}}))
        
        if len(papers_list) != len(paper_ids):
            return jsonify({'message': 'One or more paper IDs could not be found in records.'}), 404
            
        # Ensure all papers have sections extracted or fallback abstract
        for paper in papers_list:
            if not paper.get('extracted_sections'):
                paper['extracted_sections'] = {
                    'abstract': paper.get('abstract', ''),
                    'methodology': paper.get('abstract', ''),
                    'results': paper.get('abstract', '')
                }
                
        # Check and deduct 3 credits for literature review synthesis
        success, rem_credits, err_msg = check_and_deduct_credits(db, user_id, 3)
        if not success:
            return jsonify({'message': err_msg, 'credits': rem_credits, 'required_credits': 3}), 402
            
        # Trigger literature review synthesis
        review_data = generate_literature_synthesis(papers_list, custom_key=custom_api_key)
        
        # Save literature review document
        review_document = {
            'user_id': user_id,
            'title': title,
            'papers': papers_object_ids,
            'review_text': review_data.get('review_text', ''),
            'comparison_table': review_data.get('comparison_table', []),
            'research_gap': review_data.get('research_gap', ''),
            'novelty': review_data.get('novelty', ''),
            'future_scope': review_data.get('future_scope', []),
            'created_at': datetime.datetime.utcnow()
        }
        
        result = db.literature_reviews.insert_one(review_document)
        
        # Log this activity
        try:
            db.logs.insert_one({
                'user_id': user_id,
                'action': 'REVIEW_COMPILED',
                'details': f"Compiled comparative literature review: {title}",
                'timestamp': datetime.datetime.utcnow()
            })
        except Exception:
            pass
            
        review_data['review_id'] = str(result.inserted_id)
        review_data['title'] = title
        review_data['message'] = 'Literature review compiled successfully!'
        review_data['credits'] = rem_credits
        
        return jsonify(review_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Review synthesis failed: {str(e)}'}), 500

