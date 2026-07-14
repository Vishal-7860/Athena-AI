from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models.db import get_db
from app.auth.services import token_required
from app.similarity.comparator import (
    calculate_cosine_similarity,
    find_common_nlp_interests,
    identify_nlp_divergence
)

similarity_bp = Blueprint('similarity', __name__)

@similarity_bp.route('/compare', methods=['POST'])
@token_required
def compare_papers():
    db = get_db()
    data = request.get_json() or {}
    paper_ids = data.get('paper_ids', [])
    
    if not paper_ids or not isinstance(paper_ids, list):
        return jsonify({'message': 'Missing list of paper_ids.'}), 400
        
    if len(paper_ids) < 2:
        return jsonify({'message': 'Provide at least 2 papers for comparison.'}), 400
        
    try:
        # Retrieve all papers
        papers_object_ids = []
        for pid in paper_ids:
            try:
                papers_object_ids.append(ObjectId(pid))
            except Exception:
                return jsonify({'message': f'Invalid paper_id format: {pid}'}), 400
                
        papers = list(db.research_papers.find({'_id': {'$in': papers_object_ids}}))
        
        if len(papers) < 2:
            return jsonify({'message': 'Target research papers could not be found in records.'}), 404
            
        # Ensure target papers have embeddings generated (if not, we can fall back to empty calculations)
        comparison_results = []
        
        # Build pairwise comparison matrix
        for i in range(len(papers)):
            for j in range(i + 1, len(papers)):
                p1 = papers[i]
                p2 = papers[j]
                
                emb1 = p1.get('embeddings', [])
                emb2 = p2.get('embeddings', [])
                
                # Check cosine similarity
                score = 0.0
                if emb1 and emb2:
                    score = calculate_cosine_similarity(emb1, emb2)
                else:
                    # Heuristics: if embeddings are missing, check keyword overlaps to estimate score
                    overlap = find_common_nlp_interests(p1.get('keywords', []), p2.get('keywords', []))
                    union = set(p1.get('keywords', [])).union(set(p2.get('keywords', [])))
                    if union:
                        score = len(overlap) / len(union)
                        
                overlap_keywords = find_common_nlp_interests(p1.get('keywords', []), p2.get('keywords', []))
                divergence = identify_nlp_divergence(p1.get('keywords', []), p2.get('keywords', []))
                
                duplicate_warning = score >= 0.88
                
                comparison_results.append({
                    'paper_1': {
                        'id': str(p1['_id']),
                        'title': p1.get('title')
                    },
                    'paper_2': {
                        'id': str(p2['_id']),
                        'title': p2.get('title')
                    },
                    'similarity_score': round(score, 4),
                    'common_keywords': overlap_keywords,
                    'differences': divergence,
                    'is_potential_duplicate': duplicate_warning
                })
                
        return jsonify({
            'comparisons_count': len(comparison_results),
            'results': comparison_results
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Comparison failed: {str(e)}'}), 500
