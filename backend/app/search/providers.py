import urllib.parse
import xml.etree.ElementTree as ET
import requests
import logging

logger = logging.getLogger(__name__)

def search_arxiv(query: str, limit: int = 10) -> list:
    """
    Search arXiv using its public HTTP XML API
    """
    papers = []
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&start=0&max_results={limit}"
        response = requests.get(url, timeout=8)
        
        if response.status_code != 200:
            return []
            
        # Parse XML response
        root = ET.fromstring(response.content)
        # Namespace mapping
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'opensearch': 'http://a9.com/-/spec/opensearch/1.1/',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }
        
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            title = title_el.text.strip().replace('\n', ' ') if title_el is not None else "Untitled"
            
            abstract_el = entry.find('atom:summary', ns)
            abstract = abstract_el.text.strip().replace('\n', ' ') if abstract_el is not None else ""
            
            published_el = entry.find('atom:published', ns)
            year = int(published_el.text.split('-')[0]) if published_el is not None else None
            
            authors = []
            for author in entry.findall('atom:author', ns):
                name_el = author.find('atom:name', ns)
                if name_el is not None:
                    authors.append(name_el.text.strip())
                    
            # Get links
            pdf_url = ""
            html_url = ""
            for link in entry.findall('atom:link', ns):
                rel = link.get('rel')
                title_attr = link.get('title')
                href = link.get('href')
                if rel == 'alternate':
                    html_url = href
                elif rel == 'related' and title_attr == 'pdf':
                    pdf_url = href
                elif link.get('type') == 'application/pdf':
                    pdf_url = href
            
            # Fallback if no PDF link explicitly matches
            id_url = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else ""
            if not pdf_url and "/abs/" in id_url:
                pdf_url = id_url.replace("/abs/", "/pdf/") + ".pdf"
                
            papers.append({
                'title': title,
                'authors': authors,
                'year': year,
                'journal': 'arXiv Preprint',
                'citation_count': 0,
                'abstract': abstract,
                'doi': None,
                'external_pdf_url': pdf_url,
                'source': 'arXiv',
                'html_url': html_url or id_url
            })
    except Exception as e:
        logger.error(f"arXiv search error: {e}")
        
    return papers

def search_semantic_scholar(query: str, limit: int = 10) -> list:
    """
    Search Semantic Scholar API
    """
    papers = []
    try:
        url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={urllib.parse.quote(query)}&limit={limit}&fields=title,authors,venue,year,externalIds,citationCount,abstract,openAccessPdf"
        response = requests.get(url, timeout=8)
        
        if response.status_code != 200:
            return []
            
        data = response.json()
        for item in data.get('data', []):
            authors = [a.get('name') for a in item.get('authors', []) if a.get('name')]
            
            # Extract PDF link
            pdf_url = ""
            oa_pdf = item.get('openAccessPdf')
            if oa_pdf and oa_pdf.get('url'):
                pdf_url = oa_pdf.get('url')
                
            external_ids = item.get('externalIds', {})
            doi = external_ids.get('DOI')
            arxiv_id = external_ids.get('ArXiv')
            
            if not pdf_url and arxiv_id:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                
            papers.append({
                'title': item.get('title', 'Untitled'),
                'authors': authors,
                'year': item.get('year'),
                'journal': item.get('venue') or 'Semantic Scholar',
                'citation_count': item.get('citationCount', 0),
                'abstract': item.get('abstract') or '',
                'doi': doi,
                'external_pdf_url': pdf_url,
                'source': 'Semantic Scholar',
                'html_url': f"https://api.semanticscholar.org/{item.get('paperId')}" if item.get('paperId') else ""
            })
    except Exception as e:
        logger.error(f"Semantic Scholar search error: {e}")
        
    return papers

def search_openalex(query: str, limit: int = 10) -> list:
    """
    Search OpenAlex API
    """
    papers = []
    try:
        url = f"https://api.openalex.org/works?search={urllib.parse.quote(query)}&per-page={limit}"
        response = requests.get(url, timeout=8)
        
        if response.status_code != 200:
            return []
            
        data = response.json()
        for item in data.get('results', []):
            title = item.get('title') or 'Untitled'
            
            # Format authors
            authors = []
            for authorship in item.get('memberships', item.get('authorships', [])):
                author_name = authorship.get('author', {}).get('display_name')
                if author_name:
                    authors.append(author_name)
                    
            year = item.get('publication_year')
            journal_info = item.get('primary_location', {}).get('source', {})
            journal = journal_info.get('display_name') if journal_info else 'OpenAlex'
            
            # PDF URL
            pdf_url = item.get('open_access', {}).get('oa_url') or ""
            doi = item.get('doi')
            if doi and doi.startswith("https://doi.org/"):
                doi = doi.replace("https://doi.org/", "")
                
            papers.append({
                'title': title,
                'authors': authors,
                'year': year,
                'journal': journal or 'OpenAlex Collection',
                'citation_count': item.get('cited_by_count', 0),
                'abstract': "", # OpenAlex requires separate abstracts parsing (inverted index)
                'doi': doi,
                'external_pdf_url': pdf_url,
                'source': 'OpenAlex',
                'html_url': item.get('id')
            })
    except Exception as e:
        logger.error(f"OpenAlex search error: {e}")
        
    return papers

def search_crossref(query: str, limit: int = 10) -> list:
    """
    Search Crossref API
    """
    papers = []
    try:
        url = f"https://api.crossref.org/works?query={urllib.parse.quote(query)}&rows={limit}"
        response = requests.get(url, timeout=8)
        
        if response.status_code != 200:
            return []
            
        data = response.json()
        items = data.get('message', {}).get('items', [])
        for item in items:
            title = item.get('title', ['Untitled'])[0] if item.get('title') else 'Untitled'
            
            authors = []
            for author in item.get('author', []):
                given = author.get('given', '')
                family = author.get('family', '')
                if given or family:
                    authors.append(f"{given} {family}".strip())
                    
            year = None
            pub_date = item.get('published-print', item.get('published-online', {}))
            date_parts = pub_date.get('date-parts', [])
            if date_parts and date_parts[0]:
                year = date_parts[0][0]
                
            journal = item.get('container-title', ['Crossref'])[0] if item.get('container-title') else 'Crossref'
            doi = item.get('DOI')
            
            pdf_url = ""
            link_list = item.get('link', [])
            for link in link_list:
                if link.get('content-type') == 'application/pdf':
                    pdf_url = link.get('URL')
                    break
                    
            papers.append({
                'title': title,
                'authors': authors,
                'year': year,
                'journal': journal,
                'citation_count': item.get('is-referenced-by-count', 0),
                'abstract': "",
                'doi': doi,
                'external_pdf_url': pdf_url,
                'source': 'Crossref',
                'html_url': f"https://doi.org/{doi}" if doi else ""
              })
    except Exception as e:
        logger.error(f"Crossref search error: {e}")
        
    return papers
