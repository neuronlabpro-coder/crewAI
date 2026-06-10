from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("startup", service="neuronguard-agents")
    # Redis and Qdrant clients are initialized lazily per-request via their tools.
    # Add explicit pool warm-up here if needed.
    yield
    log.info("shutdown", service="neuronguard-agents")


app = FastAPI(
    title="NeuronGuard AG Agents API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://panel.neuronguard.site"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
