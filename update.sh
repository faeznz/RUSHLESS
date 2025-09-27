#!/bin/bash
set -e

# Root folder proyek (folder script berada)
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Menggunakan BASE_DIR: $BASE_DIR"

# Pull repo dari GitHub
cd "$BASE_DIR/RUSHLESS-BE-MASTER" && git pull origin main
cd "$BASE_DIR/RUSHLESS-BE-EXAM" && git pull origin main
cd "$BASE_DIR/RUSHLESS-FE" && git pull origin main

# Rebuild dan restart container
cd "$BASE_DIR"
docker-compose up -d --build

echo "Update selesai!"

