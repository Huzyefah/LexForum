FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv && useradd --uid 10001 --create-home lexforum
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app/ ./backend/app/
COPY --from=web /web/dist ./frontend/dist/
RUN mkdir -p /app/data && chown -R lexforum:lexforum /app/data
USER lexforum
ENV PYTHONPATH=/app/backend DATA_DIR=/app/data
EXPOSE 8000
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
