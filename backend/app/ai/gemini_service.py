import os
import google.generativeai as genai
import logging
import json

logger = logging.getLogger(__name__)

# Configure Gemini on-demand
gemini_ready = False
try:
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        genai.configure(api_key=api_key)
        gemini_ready = True
        logger.info("Google Gemini SDK configured successfully.")
    else:
        logger.warning("GEMINI_API_KEY missing. Fallback mock generation will be used.")
except Exception as e:
    logger.error(f"Error configuring Gemini SDK: {e}")

def _generate_gemini_content(prompt: str, custom_key: str = None) -> str:
    """
    Sends prompt to Gemini API with model fallback handling.
    """
    api_key_to_use = custom_key or os.environ.get('GEMINI_API_KEY')
    if api_key_to_use:
        try:
            genai.configure(api_key=api_key_to_use)
            for model_name in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    if response and response.text:
                        return response.text.strip()
                except Exception as model_err:
                    logger.warning(f"Model {model_name} failed: {model_err}. Trying fallback model...")
        except Exception as e:
            logger.error(f"Gemini API request failed: {e}. Falling back.")
            
    return ""

def generate_paper_summary(paper_title: str, sections: dict, format_type: str = 'detailed', custom_key: str = None) -> dict:
    """
    Uses Gemini to generate structured summaries for research papers.
    """
    sections = sections or {}
    abstract = sections.get('abstract', '')
    introduction = sections.get('introduction', '')
    methodology = sections.get('methodology', '')
    results = sections.get('results', '')
    conclusion = sections.get('conclusion', '')
    
    # Prepare text blocks for Gemini context
    content = f"Title: {paper_title}\n\nAbstract: {abstract[:2000]}\n\nIntroduction: {introduction[:3000]}\n\nMethodology: {methodology[:3000]}\n\nResults: {results[:2000]}\n\nConclusion: {conclusion[:2000]}"
    
    prompts = {
        'short': f"Analyze this paper and provide a concise, single-paragraph executive summary under 150 words. Focus on the core problem solved, methodology, and primary result.\n\n{content}",
        
        'detailed': f"Analyze this paper and provide a comprehensive structured summary. Break down into sections: 1. Research Objectives, 2. Key Methodology, 3. Primary Findings and Experiments, 4. Key Takeaways.\n\n{content}",
        
        'bullets': f"Analyze this paper and provide exactly 5 key bullet-point takeaways. Make them specific and numbers-driven where applicable.\n\n{content}",
        
        'methods': f"Extract and write a detailed analysis of the methodologies, datasets, experimental setups, and algorithms used in this paper.\n\n{content}",
        
        'results': f"Extract and write an analysis of the results, findings, metrics, comparisons, and discussion of this paper.\n\n{content}",
        
        'conclusion': f"Summarize the final conclusion, contributions, limitations, and future scope specified in this paper.\n\n{content}"
    }
    
    prompt = prompts.get(format_type, prompts['detailed'])
    logger.info(f"Triggering Gemini summary generation (format: {format_type}) for '{paper_title}'...")
    
    raw_response = _generate_gemini_content(prompt, custom_key=custom_key)
    
    if raw_response:
        # Success response mapping
        return {
            'format': format_type,
            'summary_text': raw_response,
            'success': True
        }
        
    # Standard Rule-based Mock generator fallback
    logger.warning("Using mock generator fallback for paper summary.")
    return _generate_mock_paper_summary(paper_title, sections, format_type)

def generate_literature_synthesis(papers_list: list, custom_key: str = None) -> dict:
    """
    Synthesizes multiple papers, building comparison tables and gaps matrices.
    """
    context = ""
    for idx, paper in enumerate(papers_list):
        title = paper.get('title', 'Paper ' + str(idx))
        abstract = paper.get('abstract', '')
        sections = paper.get('extracted_sections', {}) or {}
        methodology = sections.get('methodology', '')
        results = sections.get('results', '')
        
        context += f"--- PAPER {idx+1} ---\nTitle: {title}\nAbstract: {abstract[:1000]}\nMethodology: {methodology[:1500]}\nResults: {results[:1500]}\n\n"
        
    prompt = f"""
    You are an expert researcher. Synthesize a comprehensive literature review for the following papers:
    
    {context}
    
    Provide the response strictly as a structured JSON object with the following fields:
    - "review_text": A detailed three-paragraph literature review synthesis comparing their approaches, alignments, and divergence.
    - "comparison_table": An array of objects, one for each paper, containing fields "paper_title", "method", "dataset", "results", "strengths", "weaknesses".
    - "research_gap": A thorough paragraph identifying overlapping limitations or unanswered questions (the research gap).
    - "novelty": Recommendations on what a novel approach would require to address this gap.
    - "future_scope": 3 specific recommendations for future work.
    
    Ensure your output is valid JSON.
    """
    
    raw_response = _generate_gemini_content(prompt, custom_key=custom_key)
    
    if raw_response:
        try:
            # Clean possible markdown JSON wrappers (```json ... ```)
            clean_json = raw_response.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(clean_json)
            parsed['success'] = True
            return parsed
        except Exception as e:
            logger.error(f"Failed to parse Gemini literature review JSON: {e}. Raw response: {raw_response}")
            
    # Mock literature review fallback
    logger.warning("Using mock generator fallback for literature synthesis.")
    return _generate_mock_literature_synthesis(papers_list)

# ==========================================
# Mock Fallbacks Implementation
# ==========================================

def _generate_mock_paper_summary(title: str, sections: dict, format_type: str) -> dict:
    abstract = sections.get('abstract', 'No abstract available.')
    intro = sections.get('introduction', 'No introduction available.')
    method = sections.get('methodology', 'No methodology available.')
    
    summary = ""
    if format_type == 'short':
        summary = f"This paper, titled '{title}', proposes an advanced paradigm solving key constraints in literature. By implementing a customized structure (Methodology: {method[:200]}...), the author shows significant enhancements. In conclusion, the research represents a substantial baseline contribution to the domain."
    elif format_type == 'bullets':
        summary = f"- Key objective: Establishes a scalable baseline model for '{title}'.\n- Methodological core: Outlines a custom modular framework integrating {method[:150]}.\n- Key finding: Solves parsing limitations and improves accuracy on benchmarks.\n- Contribution: Proposes layout extraction heuristics for research metadata.\n- Future direction: Targets deep reinforcement learning layers."
    elif format_type == 'methods':
        summary = f"### Methodology Analysis for '{title}'\n\nThe author details a custom methodology block emphasizing: \n1. Architecture Pipeline: Built on top of modular elements.\n2. Parameter Configuration: Employs standard regularization schemes.\n3. Segmented Layout: Utilizes {method[:350]} to construct data arrays."
    else:
        summary = f"### Structured Analysis of '{title}'\n\n#### 1. Research Objectives\nTo address structural limitations in current models and propose a clean architecture.\n\n#### 2. Key Methodology\nCustom extraction algorithms relying on standard libraries: {method[:300]}...\n\n#### 3. Primary Findings and Experiments\nTesting validates high accuracy and stability across standard datasets. Abstract analysis suggests: {abstract[:300]}...\n\n#### 4. Takeaways\nRepresents a clean, modular baseline suitable for academic deployments."
        
    return {
        'format': format_type,
        'summary_text': summary,
        'success': False,
        'fallback': True
    }

def _generate_mock_literature_synthesis(papers: list) -> dict:
    table = []
    for p in papers:
        title = p.get('title', 'Unknown Paper')
        table.append({
            'paper_title': title,
            'method': 'Modular extraction and pipeline mapping',
            'dataset': 'ArXiv / Semantic Scholar benchmarks',
            'results': 'Achieved unified formatting schema',
            'strengths': 'High modularity and reliable processing',
            'weaknesses': 'Heuristics-bound section parsing'
        })
        
    titles_joined = ", ".join([f"'{p.get('title')}'" for p in papers[:3]])
    
    return {
        'review_text': f"This literature review analyzes developments across research subjects represented by: {titles_joined}. The publications exhibit common goals focusing on automated extraction and structural layouts. While some utilize neural architectures, others rely on heuristic patterns. Together, they form a foundation for reading and analyzing research works automatically.",
        'comparison_table': table,
        'research_gap': "The primary research gap lies in the lack of end-to-end multi-modal models that reconcile mathematical figures, tables, and text layout sections concurrently without relying on rigid text segmentation rules.",
        'novelty': "To address this gap, future systems should integrate vision-language models (VLMs) directly into parser pipelines to handle complex grid-based layouts and graphs semantically.",
        'future_scope': [
            "Integrate multi-modal Vision-Language Models (VLMs) for parsing mathematical graphs.",
            "Implement vector databases (Vector DB) for prompt-guided paper comparisons.",
            "Establish active learning feedback loops to correct section parsing mistakes."
        ],
        'success': False,
        'fallback': True
    }
