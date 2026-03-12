FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/sessions /app/logs /app/frontend

# Expose Flask port
EXPOSE 3737

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=src/main.py

# Run the application
CMD ["python", "src/main.py"]
