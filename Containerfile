# TODO (aluno): complete conforme a stack escolhida.
# Requisitos do contrato (contrato.json, secao exigencias_tecnicas):
#   - a API deve escutar na porta 8080 DENTRO do container;
#   - nenhuma variavel de ambiente obrigatoria;
#   - o build seguido de `docker run -p <PORTA_API>:8080 <imagem>`
#     deve bastar para a suíte.
#
# Exemplos de base (apague o que nao usar):
#
# ---- Python/FastAPI ----
# FROM python:3.12-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY src/ ./src/
# EXPOSE 8080
# CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
#
# ---- Node/Express ----
# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --omit=dev
# COPY src/ ./src/
# EXPOSE 8080
# CMD ["node", "src/index.js"]
#
# ---- Java/Spring ----
# (multi-stage: maven build + jre run — veja o track 02 para inspiracao)

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /data
EXPOSE 8080
CMD ["node", "dist/server.js"]
