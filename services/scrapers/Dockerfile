FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml poetry.lock* /app/
RUN python -m pip install --upgrade pip && pip install poetry && poetry config virtualenvs.create false && poetry install --no-dev
COPY . /app
CMD ["python", "-m", "src.worker"]
