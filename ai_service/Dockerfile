FROM python:3.10-slim

WORKDIR /app

COPY ai_service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_service/*.py ./ai_service/
COPY ai_service/evaluation ./ai_service/evaluation
COPY shared ./shared

EXPOSE 8000

CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
