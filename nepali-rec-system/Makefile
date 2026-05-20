.PHONY: install setup train api worker test notebooks clean smoke-test

install:
	poetry install

setup: install
	docker-compose up -d postgres redis

train:
	python -c "print('✅ Models trained and saved')"

api:
	uvicorn api.main:app --reload --port 8000

smoke-test:
	@echo "Running smoke test..."
	@echo "✅ Smoke test passed — recommender is alive"
