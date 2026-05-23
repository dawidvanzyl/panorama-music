# panorama-music

Student management system for a music teacher.

## Local QA Testing

QA testing is performed against a fully Dockerised local environment. The QA database is isolated from the development database and should not be modified during active development.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Reset the QA database (start of each milestone)

Before beginning QA on a new milestone, reset the QA database to a clean, fully seeded baseline:

    docker compose --profile qa down
    npm run db:reset:qa --workspace=packages/backend

### Start the QA environment

    git checkout master
    git pull
    docker compose --profile qa up --build

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Database | Internal only — not exposed on host |

### Stop the QA environment

    docker compose --profile qa down

> The QA database volume (`qa-db-data`) is preserved between runs. Only `db:reset:qa` or `docker compose --profile qa down -v` will remove it.
