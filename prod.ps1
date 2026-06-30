cd backend

docker compose `
  --env-file .env.production `
  -f docker-compose.prod.yml `
  up -d --build