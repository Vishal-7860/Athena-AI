import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
import logging
import re
import string

logger = logging.getLogger(__name__)

# Ensure NLTK resources are available locally
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

# Load spaCy NLP model on-demand
_nlp = None
def get_spacy_model():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy English model loaded successfully.")
        except IOError:
            logger.warning("spaCy 'en_core_web_sm' model not found. Downloading...")
            try:
                from spacy.cli import download
                download("en_core_web_sm")
                _nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy English model downloaded and loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to download spaCy model: {e}. Fallback mapping enabled.")
                _nlp = None
    return _nlp

# Load Sentence Transformer model on-demand
_embedder = None
def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            logger.info("Initializing SentenceTransformer ('all-MiniLM-L6-v2')...")
            _embedder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model: {e}")
            _embedder = None
    return _embedder

def clean_text(text: str) -> str:
    """
    Cleans raw text by removing headers, symbols, and double spaces.
    """
    if not text:
        return ""
    # Remove citation brackets like [1], [1, 2]
    text = re.sub(r'\[\s*\d+\s*(,\s*\d+\s*)*\]', '', text)
    # Standardise whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_keywords_tfidf(text: str, top_n: int = 10) -> list:
    """
    Extracts top keywords using TF-IDF analysis.
    """
    if not text or len(text.strip()) < 50:
        return []
        
    try:
        # Standard english stopwords
        stop_words = list(stopwords.words('english'))
    except Exception:
        stop_words = 'english'
        
    try:
        cleaned = clean_text(text)
        vectorizer = TfidfVectorizer(stop_words=stop_words, max_features=100, ngram_range=(1, 2))
        # TF-IDF requires multiple documents. We will split the text into sentences to simulate documents.
        sentences = [s for s in sent_tokenize(cleaned) if len(s.strip()) > 15]
        
        if len(sentences) < 3:
            # Fallback to simple NLTK frequency analysis
            return _extract_keywords_frequency(cleaned, top_n)
            
        tfidf_matrix = vectorizer.fit_transform(sentences)
        feature_names = vectorizer.get_feature_names_out()
        
        # Sum TF-IDF scores across all sentences
        sums = tfidf_matrix.sum(axis=0)
        data = []
        for col, term in enumerate(feature_names):
            data.append((term, sums[0, col]))
            
        ranking = sorted(data, key=lambda x: x[1], reverse=True)
        return [term for term, score in ranking[:top_n]]
        
    except Exception as e:
        logger.error(f"TF-IDF keyword extraction failed: {e}")
        return _extract_keywords_frequency(text, top_n)

def _extract_keywords_frequency(text: str, top_n: int = 10) -> list:
    """
    Simple word-frequency fallback keyword extraction
    """
    try:
        words = word_tokenize(text.lower())
        stop_words = set(stopwords.words('english'))
        punctuation = set(string.punctuation)
        
        filtered = [w for w in words if w not in stop_words and w not in punctuation and w.isalnum() and len(w) > 3]
        freq = nltk.FreqDist(filtered)
        return [word for word, count in freq.most_common(top_n)]
    except Exception:
        # Simplest regex split fallback
        words = re.findall(r'\b\w{4,}\b', text.lower())
        freq = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        return sorted(freq, key=freq.get, reverse=True)[:top_n]

def extract_named_entities(text: str) -> dict:
    """
    Extracts organizations, dates, methodologies, and technical terms using spaCy NER.
    """
    nlp = get_spacy_model()
    entities = {
        'organizations': [],
        'methods': [],
        'datasets': [],
        'technologies': []
    }
    
    if nlp is None or not text:
        return entities
        
    try:
        # Slice text to prevent spaCy buffer overflow on huge papers
        doc = nlp(text[:50000])
        
        # Collect standard NER tags
        for ent in doc.ents:
            if ent.label_ in ('ORG', 'NORP'):
                val = ent.text.strip()
                if len(val) > 2 and val not in entities['organizations']:
                    entities['organizations'].append(val)
                    
        # Custom regex/dependency heuristic for methods, datasets, technologies
        # Look for capitalized terminology or standard keywords
        text_lower = text.lower()
        
        # Technical keywords scanner
        method_triggers = ['framework', 'algorithm', 'neural network', 'transformer', 'architecture', 'methodology', 'cnn', 'lstm', 'bert']
        for trig in method_triggers:
            matches = re.findall(r'\b[\w-]+\s+' + trig + r'\b', text_lower)
            for m in matches:
                if m not in entities['methods'] and len(m) > 5:
                    entities['methods'].append(m)
                    
        dataset_triggers = ['dataset', 'corpus', 'benchmark', 'data set']
        for trig in dataset_triggers:
            matches = re.findall(r'\b[\w-]+\s+' + trig + r'\b', text_lower)
            for m in matches:
                if m not in entities['datasets'] and len(m) > 5:
                    entities['datasets'].append(m)
                    
    except Exception as e:
        logger.error(f"NER extraction failed: {e}")
        
    # Cap list results for brevity
    entities['organizations'] = entities['organizations'][:15]
    entities['methods'] = entities['methods'][:10]
    entities['datasets'] = entities['datasets'][:10]
    
    return entities

def compute_text_embedding(text: str) -> list:
    """
    Computes dense float embeddings vector using SentenceTransformers
    """
    embedder = get_embedder()
    if embedder is None or not text:
        return []
    try:
        cleaned = clean_text(text[:10000]) # embed top/introductory sections
        vector = embedder.encode(cleaned)
        return vector.tolist()
    except Exception as e:
        logger.error(f"Embedding computation failed: {e}")
        return []
