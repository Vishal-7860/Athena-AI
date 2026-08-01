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

## 🌐 Production Deployment Guide

### 1. MongoDB Atlas Database Setup (User ID & Password)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.
2. Create an **M0 Free Shared Cluster**.
3. Under **Database Access**, create a Database User:
   - **Username**: `your_username`
   - **Password**: `your_password`
   - **User Privileges**: `Read and write to any database`
4. Under **Network Access**, click **Add IP Address** and add `0.0.0.0/0` (Allows access from deployment hosts like Render/Vercel).
5. Click **Database** -> **Connect** -> **Drivers** (Python).
6. Copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/athena_ai?retryWrites=true&w=majority
   ```
   *(Replace `<username>` and `<password>` with your actual Atlas DB user credentials).*

---

### 2. Deploy Backend (Render.com - Free Tier)
1. Sign up / Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/Vishal-7860/Athena-AI`.
4. Configure service parameters:
   - **Name**: `athena-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - **Start Command**: `gunicorn run:app`
5. Under **Environment Variables**, add:
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/athena_ai?retryWrites=true&w=majority`
   - `JWT_SECRET`: `your_random_secret_key_here`
   - `GEMINI_API_KEY`: `your_google_gemini_api_key`
   - `FLASK_ENV`: `production`
   - *(Optional)* `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
6. Click **Create Web Service**. Save your deployed backend URL (e.g., `https://athena-ai-backend.onrender.com`).

---

### 3. Deploy Frontend (Vercel - Free Tier)
1. Sign up / Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `https://github.com/Vishal-7860/Athena-AI`.
4. Configure framework settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://athena-ai-backend.onrender.com` (Your Render backend URL)
6. Click **Deploy**.

---

## 🛡️ License

This project is licensed under the MIT License - see the `LICENSE` file for details.

