# Amber City Backend (Sprint 1 Bootstrap)

## Prerequisites
- Java 17
- Maven 3.9+
- PostgreSQL 15+

## Environment variables
- `DB_URL` (default: `jdbc:postgresql://localhost:5432/ambercity`)
- `DB_USERNAME` (default: `ambercity`)
- `DB_PASSWORD` (default: `ambercity`)
- `PORT` (default: `8080`)

## Run
```powershell
cd backend
mvn spring-boot:run
```

## Quick checks
- Actuator health: `GET http://localhost:8080/actuator/health`
- Auth bootstrap ping: `GET http://localhost:8080/api/v1/auth/ping`

## Notes
- Flyway migration `V1__init_core_schema.sql` initializes Sprint 1 core schema.
- Security is scaffolded; JWT auth flows will be implemented in the next tasks.
