import datetime
from flask import Blueprint, request, jsonify
from app.models.db import get_db
from app.auth.services import token_required, admin_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/analytics', methods=['GET'])
@token_required
@admin_required
def get_system_analytics():
    db = get_db()
    
    try:
        # 1. User Metrics
        total_users = db.users.count_documents({})
        admin_users = db.users.count_documents({'role': 'admin'})
        standard_users = total_users - admin_users
        
        # 2. Document Metrics
        total_papers = db.research_papers.count_documents({})
        total_bookmarks = db.bookmarks.count_documents({})
        total_downloads = db.downloads.count_documents({})
        total_summaries = db.summaries.count_documents({})
        total_reviews = db.literature_reviews.count_documents({})
        
        # 3. Heuristics: Average citation count calculation
        avg_citations = 0.0
        if total_papers > 0:
            pipeline = [
                {'$group': {'_id': None, 'avg_cit': {'$avg': '$citation_count'}}}
            ]
            agg = list(db.research_papers.aggregate(pipeline))
            if agg and agg[0].get('avg_cit'):
                avg_citations = round(agg[0]['avg_cit'], 1)
                
        # 4. Keyword Trend Analytics
        # Fetch keywords from papers and count occurrences
        pipeline_keywords = [
            {'$unwind': '$keywords'},
            {'$group': {'_id': '$keywords', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 6}
        ]
        top_keywords = list(db.research_papers.aggregate(pipeline_keywords))
        formatted_keywords = [{'keyword': k['_id'], 'count': k['count']} for k in top_keywords]
        
        # 5. Activity Audit Stream (Logs)
        timeline_logs = list(db.logs.find({}).sort('timestamp', -1).limit(15))
        formatted_logs = []
        for log in timeline_logs:
            formatted_logs.append({
                'id': str(log['_id']),
                'action': log.get('action'),
                'details': log.get('details'),
                'timestamp': log.get('timestamp')
            })
            
        return jsonify({
            'users': {
                'total': total_users,
                'admins': admin_users,
                'standard': standard_users
            },
            'documents': {
                'papers': total_papers,
                'bookmarks': total_bookmarks,
                'downloads': total_downloads,
                'summaries': total_summaries,
                'reviews': total_reviews,
                'average_citations': avg_citations
            },
            'keyword_trends': formatted_keywords,
            'activity_logs': formatted_logs
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to gather analytics: {str(e)}'}), 500
