# AI-Powered Research Paper Assistant

An industry-level, production-ready full-stack AI system designed to search, download, parse, and analyze scientific research papers automatically. The system integrates advanced NLP pipelines with Google Gemini API to produce rich summaries, comparative literature reviews, semantic similarity models, and citation reports.

---

## 🌟 Key Features

*   **Secure Authentication**: JWT-based sign-in and registration with role-based access control (Admin/User).
*   **Multi-Source Paper Search**: Seamless queries querying arXiv, Semantic Scholar, OpenAlex, and Crossref.
*   **Automatic PDF Downloader**: Retrieves target papers and syncs them to Cloudinary storage.
*   **NLP Text Extraction**: Section-by-section layout parsing (Methodology, Experiments, Results, etc.) with spaCy, KeyBERT, and NLTK.
*   **Gemini AI Summarization**: Explores key findings and outputs structured summaries (brief, granular, or bulleted).
*   **Comparative Literature Reviews**: Automatic generation of literature matrix reviews and future research gap suggestions.
*   **Semantic Comparison**: Sentence-transformer model comparisons calculating cosine similarity and highlighting duplicates.
*   **Citation & Report Exporter**: Exports formatted summaries (APA, IEEE, etc.) to PDF, DOCX, or HTML.
*   **Comprehensive Dashboards**: View metrics, search trends, and audit logs.

---

## 🏗️ Architecture Layout

```mermaid
graph LR
    subgraph Frontend (React SPA)
      UI[React Vite Web App]
    end

    subgraph Backend Services (Flask REST API)
      Auth[Auth Blueprint]
      Search[Search Blueprint]
      PDFProc[PDF Downloader & Section Parser]
      NLP[NLP Pipeline]
      GeminiSvc[Gemini Integration]
      CompareSvc[Semantic Comparator]
    end

    subgraph Storage & Cloud Interfaces
      DB[(MongoDB Atlas)]
      CloudStore[(Cloudinary)]
      GeminiAPI[Gemini LLM]
      PaperAPIs[arXiv / SemScholar / OpenAlex / Crossref]
    end

    UI <-->|JSON + JWT| Backend
    Auth <--> DB
    Search <--> PaperAPIs
    PDFProc <--> CloudStore
    NLP <--> Backend
    GeminiSvc <--> GeminiAPI
```

---

## 🚀 Setup and Installation

### Backend Setup
1. Navigate to the `backend/` directory.
2. Initialize a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```
4. Setup environment variables by copying `.env.example` to `.env` and inserting actual secrets.
5. Launch the development server:
   ```bash
   python run.py
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Boot the local Vite development server:
   ```bash
   npm run dev
   ```

---

## 🛡️ License

This project is licensed under the MIT License - see the `LICENSE` file for details.
