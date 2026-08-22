import pytest

from app.services.embedding_service import EmbeddingService


def test_chunk_text_handles_empty_and_short_input():
    service = EmbeddingService()

    assert service.chunk_text("") == []
    assert service.chunk_text("  \r\n  ") == []
    assert service.chunk_text("  const answer = 42;  ") == ["const answer = 42;"]


def test_chunk_text_uses_configured_size_and_overlap():
    service = EmbeddingService()
    service.chunk_size = 10
    service.chunk_overlap = 2
    text = " ".join(f"token-{i}" for i in range(80))

    chunks = service.chunk_text(text)

    assert len(chunks) > 1
    assert all(chunk for chunk in chunks)
    assert all(len(chunk) <= service.chunk_size * 4 for chunk in chunks)
    assert any(set(first.split()) & set(second.split()) for first, second in zip(chunks, chunks[1:]))
    assert "token-0" in chunks[0]
    assert "token-79" in chunks[-1]


def test_generate_chunk_id_is_stable_and_unique_per_index():
    first = EmbeddingService.generate_chunk_id("github_file", "src/app.py", 0)
    same = EmbeddingService.generate_chunk_id("github_file", "src/app.py", 0)
    next_chunk = EmbeddingService.generate_chunk_id("github_file", "src/app.py", 1)

    assert first == same
    assert first != next_chunk
    assert len(first) == 36


@pytest.mark.asyncio
async def test_chunk_and_embed_returns_qdrant_points(monkeypatch):
    service = EmbeddingService()
    service.chunk_size = 10
    service.chunk_overlap = 2

    async def fake_generate_embeddings(texts):
        return [[float(index)] * 1536 for index, _ in enumerate(texts)]

    monkeypatch.setattr(service, "generate_embeddings", fake_generate_embeddings)
    points = await service.chunk_and_embed(
        " ".join(f"token-{i}" for i in range(40)),
        source_type="github_file",
        source_id="src/app.py",
        metadata={"project_id": "project-1", "file_path": "src/app.py"},
    )

    assert len(points) > 1
    assert all(len(point["vector"]) == 1536 for point in points)
    assert all(point["payload"]["project_id"] == "project-1" for point in points)
    assert [point["payload"]["source_id"] for point in points] == ["src/app.py"] * len(points)
    assert len({point["id"] for point in points}) == len(points)
