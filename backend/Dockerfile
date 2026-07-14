# ==========================================
# Backend Production Dockerfile
# ==========================================
FROM python:3.12-slim as builder

WORKDIR /app

# Install system compiler tools for C dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies to wheels cache
RUN pip install --no-cache-dir --user -r requirements.txt

# ==========================================
# Runner Stage
# ==========================================
FROM python:3.12-slim as runner

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend codebase
COPY . .

# Download NLP data models required by parser pipeline
RUN python -m spacy download en_core_web_sm && \
    python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

EXPOSE 5000

ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Start application via Gunicorn WSGI container
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "run:app"]
