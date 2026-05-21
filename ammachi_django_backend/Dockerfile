# ── Build stage ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system deps needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runtime stage ────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Collect static files (Django admin, etc.)
RUN DJANGO_SECRET_KEY=build-placeholder \
    DJANGO_DEBUG=False \
    python manage.py collectstatic --noinput

# Create a non-root user
RUN adduser --disabled-password --no-create-home appuser
USER appuser

EXPOSE 8001

CMD ["gunicorn", "ammachi_django_backend.wsgi:application", \
     "--bind", "0.0.0.0:8001", \
     "--workers", "3", \
     "--timeout", "120"]
