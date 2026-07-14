import json
from unittest.mock import patch, MagicMock
from bson import ObjectId
import os
import pytest

from app.pdf.extractor import segment_paper_sections
from app.nlp.pipeline import clean_text, extract_keywords_tfidf

def test_clean_text():
    """
    Test standard text cleaning helper
    """
    dirty_text = "This is a sentence [1]. And another one [2, 3].   With spaces.  "
    cleaned = clean_text(dirty_text)
    assert cleaned == "This is a sentence . And another one . With spaces."

def test_segment_paper_sections():
    """
    Test section segmentation heuristics
    """
    mock_pdf_text = """
    Abstract
    This paper reviews transformer architectures.
    1. Introduction
    Deep learning has revolutionized NLP.
    Methodology
    We propose a new model.
    References
    [1] Vaswani et al. Attention is all you need.
    """
    sections = segment_paper_sections(mock_pdf_text)
    assert sections['abstract'] == "This paper reviews transformer architectures."
    assert sections['introduction'] == "Deep learning has revolutionized NLP."
    assert sections['methodology'] == "We propose a new model."
    assert len(sections['references']) == 1
    assert "Vaswani" in sections['references'][0]

def test_extract_keywords_tfidf():
    """
    Test TF-IDF keyword extraction
    """
    text = "Machine learning and artificial intelligence are changing the tech landscape. Machine learning algorithms analyze data. Artificial intelligence systems process intelligence."
    keywords = extract_keywords_tfidf(text, 3)
    assert len(keywords) > 0
    # The term 'intelligence' or 'learning' or 'machine' should be in keywords
    assert any(k in ['intelligence', 'machine', 'learning', 'artificial'] for k in keywords)

@patch('app.pdf.extractor.extract_text_from_pdf')
@patch('app.pdf.extractor.segment_paper_sections')
@patch('app.nlp.pipeline.extract_keywords_tfidf')
@patch('app.nlp.pipeline.extract_named_entities')
@patch('app.nlp.pipeline.compute_text_embedding')
def test_extract_endpoint_success(mock_embed, mock_entities, mock_keywords, mock_segment, mock_extract, client, mock_db, app):
    """
    Test successful execution of the /api/papers/extract REST endpoint
    """
    database, _, _ = mock_db
    fake_paper_id = ObjectId()
    
    # Configure mock responses
    mock_extract.return_value = "Mock raw PDF text extracted."
    mock_segment.return_value = {
        'abstract': 'Mock abstract content.',
        'introduction': 'Mock intro content.',
        'methodology': 'Mock methodology content.',
        'references': ['Ref 1', 'Ref 2']
    }
    mock_keywords.return_value = ['learning', 'deep', 'network']
    mock_entities.return_value = {'organizations': ['Google'], 'methods': ['Transformer']}
    mock_embed.return_value = [0.1, 0.2, 0.3]
    
    # Mock database retrieval & update
    database.research_papers.find_one.side_effect = [
        # First call before update
        {
            '_id': fake_paper_id,
            'title': 'Attention Is All You Need',
            'pdf_url': '/uploads/test_paper.pdf', # Local file simulation
            'external_pdf_url': 'http://test.pdf'
        },
        # Second call after update
        {
            '_id': fake_paper_id,
            'title': 'Attention Is All You Need',
            'pdf_url': '/uploads/test_paper.pdf',
            'extracted_sections': {
                'abstract': 'Mock abstract content.',
                'introduction': 'Mock intro content.'
            },
            'keywords': ['learning', 'deep'],
            'entities': {'organizations': ['Google']}
        }
    ]
    database.research_papers.update_one.return_value = MagicMock()
    
    # Create temp upload file to satisfy file.exists check
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../uploads'))
    os.makedirs(uploads_dir, exist_ok=True)
    temp_file_path = os.path.join(uploads_dir, 'test_paper.pdf')
    with open(temp_file_path, 'w') as f:
        f.write("fake pdf content")
        
    from app.auth.services import generate_tokens
    with app.app_context():
        access_token, _ = generate_tokens(str(ObjectId()), 'user')
        
    try:
        response = client.post(
            '/api/papers/extract',
            json={'paper_id': str(fake_paper_id)},
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Extraction and NLP processing completed successfully!'
        assert 'paper' in data
        assert data['paper']['keywords'] == ['learning', 'deep']
        assert database.research_papers.update_one.called
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
