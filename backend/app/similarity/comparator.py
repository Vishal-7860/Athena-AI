import math
import logging

logger = logging.getLogger(__name__)

def calculate_cosine_similarity(vec1: list, vec2: list) -> float:
    """
    Computes cosine similarity between two float vector lists.
    Returns float score between 0.0 and 1.0 (clamped).
    """
    if not vec1 or not vec2:
        return 0.0
        
    if len(vec1) != len(vec2):
        logger.warning(f"Vector dimension mismatch: {len(vec1)} vs {len(vec2)}")
        # Truncate to match smallest dimensions for comparison
        min_dim = min(len(vec1), len(vec2))
        vec1 = vec1[:min_dim]
        vec2 = vec2[:min_dim]
        
    try:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude_a = math.sqrt(sum(a * a for a in vec1))
        magnitude_b = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0
            
        similarity = dot_product / (magnitude_a * magnitude_b)
        # Normalize/Clamp score to [0.0, 1.0] range
        return max(0.0, min(1.0, float(similarity)))
    except Exception as e:
        logger.error(f"Failed to calculate cosine similarity: {e}")
        return 0.0

def find_common_nlp_interests(keywords1: list, keywords2: list) -> list:
    """
    Finds intersecting keywords between two publications
    """
    if not keywords1 or not keywords2:
        return []
    set1 = set(k.strip().lower() for k in keywords1 if k)
    set2 = set(k.strip().lower() for k in keywords2 if k)
    return list(set1.intersection(set2))

def identify_nlp_divergence(keywords1: list, keywords2: list) -> dict:
    """
    Returns unique keywords for each paper to show focus difference
    """
    set1 = set(k.strip().lower() for k in keywords1 if k)
    set2 = set(k.strip().lower() for k in keywords2 if k)
    
    return {
        'only_in_first': list(set1.difference(set2)),
        'only_in_second': list(set2.difference(set1))
    }
