.PHONY: up down restart logs migrate seed test e2e lint build ngrok-url studio

# ── Stack management ──────────────────────────────────────────
up:
	docker compose up -d

up-tunnel:
	docker compose --profile tunnel up -d

down:
	docker compose down

down-v:
	docker compose down -v

restart:
	docker compose restart api

logs:
	docker compose logs -f api frontend

logs-api:
	docker compose logs -f api

logs-fe:
	docker compose logs -f frontend

# ── Database ──────────────────────────────────────────────────
migrate:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate name=<migration_name>"; exit 1; fi
	docker compose exec api bunx prisma migrate dev --name $(name)

migrate-deploy:
	docker compose exec api bunx prisma migrate deploy

generate:
	docker compose exec api bunx prisma generate

seed:
	docker compose exec api bunx prisma db seed

studio:
	docker compose exec -d api bunx prisma studio --port 5555 --browser none
	@echo "Prisma Studio: http://localhost:5555"

# ── Testing ───────────────────────────────────────────────────
test:
	docker compose exec api bun run test

test-watch:
	docker compose exec api bun run test:watch

test-cov:
	docker compose exec api bun run test:cov

e2e:
	bash scripts/run-e2e.sh

# ── Code quality ──────────────────────────────────────────────
lint:
	docker compose exec api bun run lint

typecheck:
	docker compose exec api bunx tsc --noEmit

build:
	docker compose exec api bun run build

# ── Utils ─────────────────────────────────────────────────────
ngrok-url:
	@curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'])" 2>/dev/null || echo "ngrok not running. Start with: make up-tunnel"

shell-api:
	docker compose exec api sh

ps:
	docker compose ps
