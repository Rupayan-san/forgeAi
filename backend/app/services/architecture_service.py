import ast
import re
from pathlib import Path
from typing import Any


# Only these libraries become "external system" nodes — keeps the graph readable
EXTERNAL_LIB_MAP: dict[str, str] = {
    "openai": "OpenAI",
    "qdrant_client": "Qdrant",
    "motor": "MongoDB",
    "pymongo": "MongoDB",
    "redis": "Redis",
    "rq": "Redis / RQ",
    "github": "GitHub API",
    "discord": "Discord Bot",
    "httpx": "External HTTP",
}


def _repo_root() -> Path:
    # this file lives at backend/app/services/architecture_service.py
    # parents[0]=services  parents[1]=app  parents[2]=backend  parents[3]=repo root
    return Path(__file__).resolve().parents[3]


def _classify_backend_module(module_path: str) -> str:
    if module_path.startswith("app.api"):
        return "backend_api"
    if module_path.startswith("app.services"):
        return "backend_service"
    return "backend_core"


def _scan_backend(app_dir: Path) -> tuple[dict[str, dict], list[dict]]:
    """Walk backend/app/**/*.py with ast — real import graph, not a hand-drawn one."""
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    for file_path in app_dir.rglob("*.py"):
        if "__pycache__" in file_path.parts:
            continue
        rel = file_path.relative_to(app_dir.parent)  # app/services/rag_service.py
        module_name = "app." + ".".join(rel.with_suffix("").parts[1:])
        node_id = f"backend:{module_name}"

        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "label": file_path.name,
                "layer": _classify_backend_module(module_name),
                "detail": module_name,
            }

        try:
            tree = ast.parse(file_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        seen_external: set[str] = set()
        seen_internal_targets: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    if top in EXTERNAL_LIB_MAP:
                        seen_external.add(top)
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.startswith("app."):
                    target_id = f"backend:{node.module}"
                    if target_id not in seen_internal_targets:
                        seen_internal_targets.add(target_id)
                        edges.append({
                            "id": f"{node_id}->{target_id}",
                            "source": node_id,
                            "target": target_id,
                            "relation": "imports",
                        })
                elif node.module:
                    top = node.module.split(".")[0]
                    if top in EXTERNAL_LIB_MAP:
                        seen_external.add(top)

        for top in seen_external:
            ext_id = f"external:{top}"
            if ext_id not in nodes:
                nodes[ext_id] = {
                    "id": ext_id,
                    "label": EXTERNAL_LIB_MAP[top],
                    "layer": "external",
                    "detail": f"used via `{top}`",
                }
            edges.append({
                "id": f"{node_id}->{ext_id}",
                "source": node_id,
                "target": ext_id,
                "relation": "uses",
            })

    return nodes, edges


def _extract_router_prefixes(router_py: Path) -> dict[str, str]:
    """Parse router.py's include_router(xxx.router, prefix="...") calls — real prefixes, not typed by hand."""
    if not router_py.exists():
        return {}
    text = router_py.read_text(encoding="utf-8")
    pattern = re.compile(r'include_router\(\s*(\w+)\.router\s*,\s*prefix="([^"]*)"')
    return {m.group(1): m.group(2) for m in pattern.finditer(text)}


def _extract_backend_routes(endpoints_dir: Path, prefixes: dict[str, str]) -> list[dict]:
    """Scan each endpoints/*.py for @router.METHOD("path") decorators — the real route table."""
    routes = []
    if not endpoints_dir.exists():
        return routes

    decorator_re = re.compile(r'@router\.(get|post|put|delete)\(\s*"([^"]*)"')

    for file_path in endpoints_dir.glob("*.py"):
        module_name = file_path.stem
        prefix = prefixes.get(module_name, "")
        node_id = f"backend:app.api.v1.endpoints.{module_name}"
        text = file_path.read_text(encoding="utf-8")
        for m in decorator_re.finditer(text):
            method, local_path = m.group(1).upper(), m.group(2)
            full_path = prefix.rstrip("/") + local_path if local_path != "/" else prefix
            routes.append({"method": method, "path": full_path, "node_id": node_id})
    return routes


def _normalize_segments(path: str) -> list[str]:
    path = re.sub(r"\$\{[^}]*\}", "*", path)  # frontend `${id}` template vars
    path = re.sub(r"\{[^}]*\}", "*", path)    # backend {project_id} path params
    return [seg for seg in path.split("/") if seg]


def _paths_match(a: list[str], b: list[str]) -> bool:
    if len(a) != len(b):
        return False
    return all(x == "*" or y == "*" or x == y for x, y in zip(a, b))


def _scan_frontend(frontend_app_dir: Path, backend_routes: list[dict]) -> tuple[dict[str, dict], list[dict]]:
    """Scan every page.tsx for real api.METHOD(`...`) calls and match against real backend routes.
    Calls with no match are kept as visible gaps — not hidden."""
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    call_re = re.compile(r'api\.(get|post|put|delete)\s*(?:<[^>]*>)?\(\s*`([^`]*)`')

    if not frontend_app_dir.exists():
        return nodes, edges

    for file_path in frontend_app_dir.rglob("page.tsx"):
        rel_parts = [p for p in file_path.relative_to(frontend_app_dir).parts
                     if not (p.startswith("(") and p.endswith(")"))]
        route_label = "/" + "/".join(rel_parts[:-1]) if len(rel_parts) > 1 else "/"
        node_id = f"frontend:{route_label}"

        nodes[node_id] = {
            "id": node_id,
            "label": route_label,
            "layer": "frontend",
            "detail": file_path.name,
        }

        text = file_path.read_text(encoding="utf-8")
        for m in call_re.finditer(text):
            method, raw_path = m.group(1).upper(), m.group(2)
            fe_segments = _normalize_segments(raw_path)

            matched = next(
                (r for r in backend_routes
                 if r["method"] == method and _paths_match(fe_segments, _normalize_segments(r["path"]))),
                None,
            )

            if matched:
                target_id = matched["node_id"]
                edges.append({
                    "id": f"{node_id}->{target_id}->{method}->{raw_path}",
                    "source": node_id,
                    "target": target_id,
                    "relation": f"{method} {raw_path}",
                })
            else:
                unmatched_id = f"unmatched:{method}:{raw_path}"
                nodes[unmatched_id] = {
                    "id": unmatched_id,
                    "label": f"{method} {raw_path}",
                    "layer": "unmatched",
                    "detail": "No matching backend route found — likely a real bug",
                }
                edges.append({
                    "id": f"{node_id}->{unmatched_id}",
                    "source": node_id,
                    "target": unmatched_id,
                    "relation": "calls (unresolved)",
                })

    return nodes, edges


def build_architecture_graph() -> dict[str, Any]:
    root = _repo_root()
    backend_app_dir = root / "backend" / "app"
    frontend_app_dir = root / "frontend" / "src" / "app"
    router_py = backend_app_dir / "api" / "v1" / "router.py"
    endpoints_dir = backend_app_dir / "api" / "v1" / "endpoints"

    warnings = []
    if not backend_app_dir.exists():
        warnings.append(f"backend app dir not found at {backend_app_dir}")
    if not frontend_app_dir.exists():
        warnings.append(f"frontend app dir not found at {frontend_app_dir}")

    backend_nodes, backend_edges = _scan_backend(backend_app_dir) if backend_app_dir.exists() else ({}, [])
    prefixes = _extract_router_prefixes(router_py)
    routes = _extract_backend_routes(endpoints_dir, prefixes)
    frontend_nodes, frontend_edges = _scan_frontend(frontend_app_dir, routes)

    all_nodes = {**backend_nodes, **frontend_nodes}
    all_raw_edges = backend_edges + frontend_edges
    unique_edges = []
    seen_edge_ids = set()
    for edge in all_raw_edges:
        if edge["id"] not in seen_edge_ids:
            seen_edge_ids.add(edge["id"])
            unique_edges.append(edge)

    return {
        "nodes": list(all_nodes.values()),
        "edges": unique_edges,
        "warnings": warnings,
    }
