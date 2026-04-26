.PHONY: dev seed test build

dev:
	cp -n .env.local .env 2>/dev/null || true
	docker-compose up

dev-bg:
	cp -n .env.local .env 2>/dev/null || true
	docker-compose up -d

stop:
	docker-compose down

seed:
	NODE_ENV=development node scripts/seedAdmin.js

seed-exercises:
	NODE_ENV=development node scripts/seed-exercises.js

test:
	NODE_ENV=test npm test

test-api:
	NODE_ENV=test npm run test:api

test-security:
	NODE_ENV=test npm run test:security

build:
	docker build -t mwp-backend .

install:
	npm install

logs:
	docker-compose logs -f api
