import json
from unittest.mock import patch, MagicMock
from bson import ObjectId

@patch('app.search.providers.requests.get')
def test_search_papers_arxiv(mock_get, client, app):
    """
    Test arXiv parsing logic with mock XML response
    """
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"""<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Attention Is All You Need</title>
        <summary>This is a mock abstract for testing.</summary>
        <published>2017-06-12T00:00:00Z</published>
        <id>http://arxiv.org/abs/1706.03762v5</id>
        <author><name>Ashish Vaswani</name></author>
        <author><name>Noam Shazeer</name></author>
        <link rel="alternate" href="http://arxiv.org/abs/1706.03762v5"/>
        <link rel="related" type="application/pdf" href="http://arxiv.org/pdf/1706.03762v5"/>
      </entry>
    </feed>
    """
    mock_get.return_value = mock_response

    # Generate access token
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')

    response = client.get(
        '/api/papers/search?q=attention&provider=arxiv',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 1
    assert data[0]['title'] == 'Attention Is All You Need'
    assert data[0]['source'] == 'arXiv'
    assert data[0]['external_pdf_url'] == 'http://arxiv.org/pdf/1706.03762v5'

@patch('app.pdf.routes.download_pdf_file')
@patch('app.pdf.routes.upload_pdf_to_cloudinary')
def test_download_paper_success(mock_upload, mock_download, client, mock_db, app):
    """
    Test downloading and uploading a research paper PDF
    """
    database, _, _ = mock_db
    
    # Configure mock functions
    mock_download.return_value = '/tmp/fake_paper.pdf'
    mock_upload.return_value = 'https://cloudinary.com/fake_paper.pdf'
    
    # Configure DB mocks
    database.research_papers.find_one.return_value = None
    database.research_papers.insert_one.return_value = MagicMock(inserted_id=ObjectId())
    database.downloads.insert_one.return_value = MagicMock()
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
    
    response = client.post(
        '/api/papers/download',
        json={
            'title': 'Test Deep Learning Paper',
            'external_pdf_url': 'http://example.com/test.pdf',
            'source': 'arXiv',
            'paper_metadata': {
                'authors': ['John Doe'],
                'year': 2026,
                'journal': 'arXiv'
            }
        },
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['message'] == 'Paper downloaded and stored successfully!'
    assert data['pdf_url'] == 'https://cloudinary.com/fake_paper.pdf'
    assert 'paper_id' in data
    
    assert database.research_papers.insert_one.called
    assert database.downloads.insert_one.called

@patch('app.search.routes.ObjectId')
def test_add_bookmark_success(mock_object_id, client, mock_db, app):
    """
    Test bookmarking a paper
    """
    database, _, _ = mock_db
    fake_paper_id = ObjectId()
    
    # Mocks
    database.bookmarks.find_one.return_value = None
    database.bookmarks.insert_one.return_value = MagicMock(inserted_id=ObjectId())
    
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
    
    response = client.post(
        '/api/bookmarks',
        json={
            'paper_id': str(fake_paper_id),
            'notes': 'Must read for my lit review',
            'tags': ['transformers', 'attention'],
            'collection_name': 'My Thesis'
        },
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['message'] == 'Added bookmark successfully!'
    assert 'bookmark_id' in data
    assert database.bookmarks.insert_one.called
