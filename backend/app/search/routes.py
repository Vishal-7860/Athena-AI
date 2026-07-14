import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models.db import get_db
from app.auth.services import token_required
from app.search.providers import (
    search_arxiv,
    search_semantic_scholar,
    search_openalex,
    search_crossref
)

search_bp = Blueprint('search', __name__)
bookmarks_bp = Blueprint('bookmarks', __name__)

@search_bp.route('/search', methods=['GET'])
@token_required
def search_papers():
    query = request.args.get('q', '').strip()
    provider = request.args.get('provider', 'all').strip().lower()
    limit = int(request.args.get('limit', 10))
    
    if not query:
        return jsonify({'message': 'Search query parameter "q" is required.'}), 400
        
    db = get_db()
    # Save search request to history log
    try:
        db.search_history.insert_one({
            'user_id': request.current_user['_id'],
            'query': query,
            'filters': {'provider': provider},
            'searched_at': datetime.datetime.utcnow()
        })
    except Exception:
        pass # don't fail search if saving history fails
        
    results = []
    
    # Run targeted search based on user provider selections
    if provider == 'arxiv':
        results = search_arxiv(query, limit)
    elif provider == 'semanticscholar':
        results = search_semantic_scholar(query, limit)
    elif provider == 'openalex':
        results = search_openalex(query, limit)
    elif provider == 'crossref':
        results = search_crossref(query, limit)
    else:
        # Default 'all' - trigger arXiv and Semantic Scholar, combine and slice
        limit_each = max(5, limit // 2)
        arxiv_results = search_arxiv(query, limit_each)
        sem_results = search_semantic_scholar(query, limit_each)
        
        # Simple deduplication by title similarity
        seen_titles = set()
        for paper in sem_results + arxiv_results:
            title_normalized = "".join(paper['title'].lower().split())
            if title_normalized not in seen_titles:
                seen_titles.add(title_normalized)
                results.append(paper)
                
    return jsonify(results[:limit]), 200

# ==========================================
# Bookmarks / Saved Library Endpoints
# ==========================================

@bookmarks_bp.route('', methods=['GET'])
@token_required
def get_bookmarks():
    db = get_db()
    user_id = request.current_user['_id']
    
    bookmarks = list(db.bookmarks.find({'user_id': user_id}))
    
    results = []
    for b in bookmarks:
        # Resolve associated paper data
        paper = db.research_papers.find_one({'_id': b['paper_id']})
        if paper:
            # Map object ID to string
            paper['id'] = str(paper['_id'])
            del paper['_id']
            
            results.append({
                'id': str(b['_id']),
                'paper': paper,
                'notes': b.get('notes', ''),
                'tags': b.get('tags', []),
                'collection_name': b.get('collection_name', 'General'),
                'created_at': b.get('created_at')
            })
            
    return jsonify(results), 200

@bookmarks_bp.route('', methods=['POST'])
@token_required
def add_bookmark():
    db = get_db()
    user_id = request.current_user['_id']
    data = request.get_json() or {}
    
    paper_id = data.get('paper_id')
    notes = data.get('notes', '').strip()
    tags = data.get('tags', [])
    collection = data.get('collection_name', 'General').strip()
    
    # If the request contains raw paper details instead of ID, we save the paper metadata first
    if not paper_id and 'paper' in data:
        paper_data = data['paper']
        title = paper_data.get('title')
        if not title:
            return jsonify({'message': 'Paper title is required to bookmark.'}), 400
            
        # Check if paper metadata is already saved
        existing_paper = db.research_papers.find_one({'title': title})
        if existing_paper:
            paper_id = str(existing_paper['_id'])
        else:
            # Save new paper details
            new_paper = {
                'title': title,
                'authors': paper_data.get('authors', []),
                'year': paper_data.get('year'),
                'journal': paper_data.get('journal', 'Unknown'),
                'citation_count': paper_data.get('citation_count', 0),
                'abstract': paper_data.get('abstract', ''),
                'external_pdf_url': paper_data.get('external_pdf_url', ''),
                'pdf_url': paper_data.get('pdf_url', ''), # Cloudinary URL
                'doi': paper_data.get('doi'),
                'source': paper_data.get('source', 'Unknown'),
                'created_at': datetime.datetime.utcnow()
            }
            res = db.research_papers.insert_one(new_paper)
            paper_id = str(res.inserted_id)
            
    if not paper_id:
        return jsonify({'message': 'Missing paper_id reference.'}), 400
        
    try:
        # Check if already bookmarked
        existing = db.bookmarks.find_one({'user_id': user_id, 'paper_id': ObjectId(paper_id)})
        if existing:
            return jsonify({'message': 'Paper already bookmarked.'}), 409
            
        bookmark_doc = {
            'user_id': user_id,
            'paper_id': ObjectId(paper_id),
            'notes': notes,
            'tags': tags,
            'collection_name': collection or 'General',
            'created_at': datetime.datetime.utcnow()
        }
        
        result = db.bookmarks.insert_one(bookmark_doc)
        
        # Log this activity
        try:
            paper_doc = db.research_papers.find_one({'_id': ObjectId(paper_id)})
            title = paper_doc.get('title', 'Unknown Paper') if paper_doc else 'Unknown Paper'
            db.logs.insert_one({
                'user_id': user_id,
                'action': 'BOOKMARK_ADDED',
                'details': f"Bookmarked paper: {title}",
                'paper_id': ObjectId(paper_id),
                'timestamp': datetime.datetime.utcnow()
            })
        except Exception:
            pass
            
        return jsonify({
            'message': 'Added bookmark successfully!',
            'bookmark_id': str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({'message': f'Failed to create bookmark: {str(e)}'}), 500

@bookmarks_bp.route('/<bookmark_id>', methods=['DELETE'])
@token_required
def remove_bookmark(bookmark_id):
    db = get_db()
    user_id = request.current_user['_id']
    
    try:
        result = db.bookmarks.delete_one({'_id': ObjectId(bookmark_id), 'user_id': user_id})
        if result.deleted_count == 0:
            return jsonify({'message': 'Bookmark not found or access denied.'}), 404
            
        return jsonify({'message': 'Removed bookmark successfully!'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to delete: {str(e)}'}), 500

@bookmarks_bp.route('/analytics', methods=['GET'])
@token_required
def get_user_analytics():
    db = get_db()
    user_id = request.current_user['_id']
    
    total_bookmarks = db.bookmarks.count_documents({'user_id': user_id})
    total_searches = db.search_history.count_documents({'user_id': user_id})
    total_summaries = db.summaries.count_documents({'user_id': user_id})
    total_reviews = db.literature_reviews.count_documents({'user_id': user_id})
    
    # Recent activity logs for this user
    timeline_logs = list(db.logs.find({'user_id': user_id}).sort('timestamp', -1).limit(5))
    formatted_logs = []
    for log in timeline_logs:
        formatted_logs.append({
            'action': log.get('action'),
            'details': log.get('details'),
            'timestamp': log.get('timestamp'),
            'paper_id': str(log.get('paper_id')) if log.get('paper_id') else None
        })
        
    return jsonify({
        'total_bookmarks': total_bookmarks,
        'total_searches': total_searches,
        'total_summaries': total_summaries,
        'total_reviews': total_reviews,
        'activity': formatted_logs
    }), 200
