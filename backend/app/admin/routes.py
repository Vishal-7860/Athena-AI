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

@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users():
    db = get_db()
    from bson import ObjectId
    try:
        users = list(db.users.find({}))
        user_list = []
        for u in users:
            role = u.get('role', 'user')
            user_list.append({
                'id': str(u['_id']),
                'username': u.get('username', ''),
                'email': u.get('email', ''),
                'role': role,
                'credits': u.get('credits', 999999 if role == 'admin' else 50),
                'max_credits': u.get('max_credits', 999999 if role == 'admin' else 50),
                'created_at': u.get('created_at')
            })
        return jsonify(user_list), 200
    except Exception as e:
        return jsonify({'message': f'Failed to fetch users: {str(e)}'}), 500

@admin_bp.route('/users/<user_id>/credits', methods=['POST'])
@token_required
@admin_required
def update_user_credits(user_id):
    db = get_db()
    from bson import ObjectId
    data = request.get_json() or {}
    
    amount = data.get('credits')
    if amount is None or not isinstance(amount, (int, float)) or amount < 0:
        return jsonify({'message': 'Invalid credits value.'}), 400
        
    try:
        target_user = db.users.find_one({'_id': ObjectId(user_id)})
        if not target_user:
            return jsonify({'message': 'User not found.'}), 404
            
        new_credits = int(amount)
        new_max = max(target_user.get('max_credits', 50), new_credits)
        
        db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'credits': new_credits, 'max_credits': new_max, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        # Log this admin activity
        db.logs.insert_one({
            'user_id': request.current_user['_id'],
            'action': 'ADMIN_CREDITS_ALLOCATED',
            'details': f"Admin allocated {new_credits} credits to user {target_user.get('username')}",
            'timestamp': datetime.datetime.utcnow()
        })
        
        return jsonify({
            'message': f"Updated credits for user '{target_user.get('username')}' to {new_credits}.",
            'user_id': user_id,
            'credits': new_credits,
            'max_credits': new_max
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update credits: {str(e)}'}), 500

