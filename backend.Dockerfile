FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY .env .

ENV PYTHONPATH=/app
ENV FLASK_APP=backend/run.py

CMD ["python", "backend/run.py"]
