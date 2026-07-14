import json
from unittest.mock import patch, MagicMock
from bson import ObjectId

def test_admin_analytics_unauthorized(client, mock_db, app):
    """
    Test that regular users cannot access administrative analytics endpoints
    """
    database, _, _ = mock_db
    user_id = ObjectId()
    database.users.find_one.return_value = {
        '_id': user_id,
        'username': 'regularuser',
        'role': 'user',
        'email': 'user@test.com'
    }
    
    from app.auth.services import generate_tokens
    # Generate token with regular 'user' role
    with app.app_context():
        access_token, _ = generate_tokens(str(user_id), 'user')
        
    response = client.get(
        '/api/admin/analytics',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    assert response.status_code == 403
    assert b'Access denied: Admin role required!' in response.data

def test_admin_analytics_success(client, mock_db, app):
    """
    Test admin analytics aggregates successfully
    """
    database, _, _ = mock_db
    admin_id = ObjectId()
    database.users.find_one.return_value = {
        '_id': admin_id,
        'username': 'adminuser',
        'role': 'admin',
        'email': 'admin@test.com'
    }
    
    # Configure count and aggregate mocks
    database.users.count_documents.side_effect = [10, 2] # total = 10, admins = 2
    database.research_papers.count_documents.return_value = 25
    database.bookmarks.count_documents.return_value = 15
    database.downloads.count_documents.return_value = 30
    database.summaries.count_documents.return_value = 12
    database.literature_reviews.count_documents.return_value = 4
    
    database.research_papers.aggregate.side_effect = [
        # average citations
        [{'avg_cit': 15.4}],
        # top keywords
        [{'_id': 'transformers', 'count': 8}, {'_id': 'nlp', 'count': 5}]
    ]
    database.logs.find.return_value.sort.return_value.limit.return_value = [
        {
            '_id': ObjectId(),
            'action': 'USER_REGISTERED',
            'details': 'User seeded',
            'timestamp': '2026-07-07T12:00:00Z'
        }
    ]
    
    from app.auth.services import generate_tokens
    # Generate token with 'admin' role
    with app.app_context():
        access_token, _ = generate_tokens(str(admin_id), 'admin')
        
    response = client.get(
        '/api/admin/analytics',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['users']['total'] == 10
    assert data['users']['admins'] == 2
    assert data['users']['standard'] == 8
    assert data['documents']['papers'] == 25
    assert data['documents']['average_citations'] == 15.4
    assert len(data['keyword_trends']) == 2
    assert data['keyword_trends'][0]['keyword'] == 'transformers'

@patch('app.utils.export_helper.generate_pdf_report')
def test_export_pdf_success(mock_pdf, client, mock_db, app):
    """
    Test PDF report download attachments
    """
    database, _, _ = mock_db
    fake_review_id = ObjectId()
    
    # Mock data stream
    import io
    mock_pdf_stream = io.BytesIO(b"fake pdf visual binary content")
    mock_pdf.return_value = mock_pdf_stream
    
    database.literature_reviews.find_one.return_value = {
        '_id': fake_review_id,
        'title': 'NLP Synthesis Report',
        'review_text': 'Text analysis details...',
        'comparison_table': [],
        'research_gap': 'Gap context...',
        'novelty': 'Novelty details...'
    }
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
        
    response = client.get(
        f'/api/papers/export?review_id={fake_review_id}&type=pdf',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    assert response.mimetype == 'application/pdf'
    assert 'attachment' in response.headers.get('Content-Disposition', '')
    assert b'fake pdf visual' in response.data
