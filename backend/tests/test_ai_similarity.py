import json
from unittest.mock import patch, MagicMock
from bson import ObjectId

@patch('app.ai.routes.generate_paper_summary')
def test_summarize_endpoint_success(mock_summary, client, mock_db, app):
    """
    Test individual paper summary generation endpoint
    """
    database, _, _ = mock_db
    fake_paper_id = ObjectId()
    
    # Configure mock responses
    mock_summary.return_value = {
        'format': 'detailed',
        'summary_text': 'This is a mock Gemini summary.',
        'success': True,
        'fallback': False
    }
    
    database.research_papers.find_one.return_value = {
        '_id': fake_paper_id,
        'title': 'Test Paper',
        'extracted_sections': {'abstract': 'This is abstract.'}
    }
    database.summaries.find_one.return_value = None
    database.summaries.insert_one.return_value = MagicMock(inserted_id=ObjectId())
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
        
    response = client.post(
        '/api/ai/summarize',
        json={'paper_id': str(fake_paper_id), 'format': 'detailed'},
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['message'] == 'Summary generated successfully!'
    assert data['summary'] == 'This is a mock Gemini summary.'
    assert database.summaries.insert_one.called

@patch('app.ai.routes.generate_literature_synthesis')
def test_review_endpoint_success(mock_synthesis, client, mock_db, app):
    """
    Test literature review compilation endpoint
    """
    database, _, _ = mock_db
    pid1 = ObjectId()
    pid2 = ObjectId()
    
    mock_synthesis.return_value = {
        'review_text': 'Comparative analysis overview text.',
        'comparison_table': [],
        'research_gap': 'Identified gap in literature.',
        'novelty': 'Proposed novelty requirements.',
        'future_scope': ['Rec 1']
    }
    
    # Configure DB return mock for paper listing
    database.research_papers.find.return_value = [
        {'_id': pid1, 'title': 'Paper A', 'extracted_sections': {'abstract': 'Abstract A'}},
        {'_id': pid2, 'title': 'Paper B', 'extracted_sections': {'abstract': 'Abstract B'}}
    ]
    database.literature_reviews.insert_one.return_value = MagicMock(inserted_id=ObjectId())
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
        
    response = client.post(
        '/api/ai/review',
        json={
            'title': 'NLP Comparison Analysis',
            'paper_ids': [str(pid1), str(pid2)]
        },
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['message'] == 'Literature review compiled successfully!'
    assert data['review_text'] == 'Comparative analysis overview text.'
    assert database.literature_reviews.insert_one.called

def test_compare_endpoint_success(client, mock_db, app):
    """
    Test pairwise paper comparison and duplicate check
    """
    database, _, _ = mock_db
    pid1 = ObjectId()
    pid2 = ObjectId()
    
    # Configure papers with embeddings and keywords
    database.research_papers.find.return_value = [
        {
            '_id': pid1,
            'title': 'Paper Alpha',
            'keywords': ['nlp', 'transformers', 'gpt'],
            'embeddings': [0.5, 0.5, 0.0]
        },
        {
            '_id': pid2,
            'title': 'Paper Beta',
            'keywords': ['nlp', 'transformers', 'bert'],
            'embeddings': [0.5, 0.5, 0.0]
        }
    ]
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
        
    response = client.post(
        '/api/similarity/compare',
        json={'paper_ids': [str(pid1), str(pid2)]},
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['comparisons_count'] == 1
    assert data['results'][0]['similarity_score'] == 1.0 # vectors match exactly
    assert 'nlp' in data['results'][0]['common_keywords']
    assert data['results'][0]['is_potential_duplicate'] is True
