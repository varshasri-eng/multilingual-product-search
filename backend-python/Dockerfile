FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2-binary (Linux wheels are reliably available
# here, unlike the Windows/Python 3.13 build-tools issue hit locally)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]