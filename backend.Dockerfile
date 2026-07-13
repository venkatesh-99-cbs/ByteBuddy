FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source directly into /app so imports work as 'app.*'
COPY backend/ .

# Copy .env for config
COPY .env .

# PYTHONPATH=/app ensures 'from app import ...' resolves correctly
ENV PYTHONPATH=/app
ENV FLASK_APP=run.py

CMD ["python", "run.py"]
