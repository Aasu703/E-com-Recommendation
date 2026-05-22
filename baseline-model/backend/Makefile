.PHONY: install setup train api worker test notebooks clean smoke-test docker-up docker-logs

install:
	poetry install

setup: install
	docker-compose up -d postgres redis
	python -c "from db.session import seed_database_from_csvs; seed_database_from_csvs()"
	python -c "from recommender.hybrid import HybridRecommender; from recommender.utils import load_data; p,u,i=load_data(); m=HybridRecommender().fit(p,u,i); m.save('models/hybrid_recommender.pkl'); print('Models trained')"

train:
	poetry run python -c "from recommender.hybrid import HybridRecommender; from recommender.utils import load_data; p,u,i=load_data(); m=HybridRecommender().fit(p,u,i); m.save('models/hybrid_recommender.pkl'); print('Models trained and saved')"

api:
	poetry run uvicorn api.main:app --reload --port 8000

worker:
	poetry run celery -A jobs.celery_app worker --loglevel=info

test:
	poetry run pytest tests/ -v --tb=short

notebooks:
	poetry run jupyter nbconvert --to notebook --execute notebooks/02_content_based.ipynb --inplace
	poetry run jupyter nbconvert --to notebook --execute notebooks/03_collaborative.ipynb --inplace
	poetry run jupyter nbconvert --to notebook --execute notebooks/04_hybrid.ipynb --inplace
	poetry run jupyter nbconvert --to notebook --execute notebooks/05_evaluation.ipynb --inplace

docker-up:
	docker-compose up --build -d

docker-logs:
	docker-compose logs -f api

clean:
	powershell -Command "Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force"

smoke-test:
	poetry run python -X utf8 -c "from recommender.hybrid import HybridRecommender; from pathlib import Path; m = HybridRecommender.load(Path('models/hybrid_recommender.pkl')); recs = m.recommend('U0042', top_k=5); assert len(recs) == 5, f'Expected 5 recs, got {len(recs)}'; assert all('product_id' in r for r in recs); assert all('hybrid_score' in r for r in recs); assert all('alpha_used' in r for r in recs); print('✅ Smoke test passed — recommender is alive')"
