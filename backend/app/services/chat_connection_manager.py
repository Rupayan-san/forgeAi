import json
from typing import Any
from fastapi import WebSocket


class ChatConnectionManager:
    """Manages project-scoped real-time WebSocket connections."""

    def __init__(self):
        # project_id -> set of active WebSockets
        self.active_connections: dict[str, set[WebSocket]] = {}
        # websocket -> (project_id, user_id)
        self.connection_metadata: dict[WebSocket, tuple[str, str]] = {}

    async def connect(self, project_id: str, websocket: WebSocket, user_id: str):
        """Register an incoming WebSocket to a project room."""
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)
        self.connection_metadata[websocket] = (project_id, user_id)

    def disconnect(self, websocket: WebSocket):
        """Cleanly remove a WebSocket from active connections."""
        if websocket in self.connection_metadata:
            project_id, _ = self.connection_metadata.pop(websocket)
            if project_id in self.active_connections:
                self.active_connections[project_id].discard(websocket)
                if not self.active_connections[project_id]:
                    del self.active_connections[project_id]

    async def broadcast(self, project_id: str, message: dict[str, Any]):
        """Broadcast a JSON message to all connected clients in a project room."""
        if project_id not in self.active_connections:
            return

        dead_connections = []
        for connection in list(self.active_connections[project_id]):
            try:
                await connection.send_text(json.dumps(message, default=str))
            except Exception:
                dead_connections.append(connection)

        for dead_conn in dead_connections:
            self.disconnect(dead_conn)

    def get_online_user_count(self, project_id: str) -> int:
        """Get the number of active connections in a project."""
        return len(self.active_connections.get(project_id, set()))


# Global singleton instance for connection pooling
chat_connection_manager = ChatConnectionManager()
