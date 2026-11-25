FROM node:22-bookworm-slim AS website
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV READMISSION_STATIC_EXPORT=1 NEXT_PUBLIC_API_BASE_URL=""
RUN npm run build

FROM python:3.13-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ backend/
COPY docs/ docs/
COPY artifacts/patient_readmission_model.pkl artifacts/
COPY scripts/render_start.py scripts/
COPY --from=website /build/out website/
CMD ["python", "scripts/render_start.py"]
