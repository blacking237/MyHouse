#!/usr/bin/env bash
set -euo pipefail

export SPRING_PROFILES_ACTIVE=production
ENV_FILE="$(cd "$(dirname "$0")/../../backend" && pwd)/.env.production"

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

cd "$(cd "$(dirname "$0")/../../backend" && pwd)"
./mvnw clean package
java -jar target/ambercity-backend-0.0.1-SNAPSHOT.jar
