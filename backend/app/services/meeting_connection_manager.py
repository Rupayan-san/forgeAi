import json
from typing import Optional
from fastapi import WebSocket


class MeetingConnectionManager:
    """Manages real-time WebSocket connections and broadcasts for live Project Meetings."""

    def __init__(self):
        # meeting_id -> set of active WebSockets
        self.active_connections: dict[str, set[WebSocket]] = {}
        # meeting_id -> dict of websocket -> user_id
        self.socket_users: dict[str, dict[WebSocket, str]] = {}
        # meeting_id -> current AI participant state ("IDLE", "LISTENING", "THINKING", "SPEAKING")
        self.ai_states: dict[str, str] = {}

    async def connect(self, meeting_id: str, websocket: WebSocket, user_id: str):
        """Accept WebSocket and register in meeting room."""
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = set()
            self.socket_users[meeting_id] = {}
            self.ai_states[meeting_id] = "IDLE"

        self.active_connections[meeting_id].add(websocket)
        self.socket_users[meeting_id][websocket] = user_id

    def disconnect(self, meeting_id: str, websocket: WebSocket, user_id: Optional[str] = None):
        """Unregister WebSocket from meeting room."""
        if meeting_id in self.active_connections:
            self.active_connections[meeting_id].discard(websocket)
            if websocket in self.socket_users.get(meeting_id, {}):
                del self.socket_users[meeting_id][websocket]

            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]
                if meeting_id in self.socket_users:
                    del self.socket_users[meeting_id]
                if meeting_id in self.ai_states:
                    del self.ai_states[meeting_id]

    async def broadcast(self, meeting_id: str, message: dict):
        """Broadcast payload to all connected participants in the meeting."""
        connections = self.active_connections.get(meeting_id, set()).copy()
        if not connections:
            return

        payload_str = json.dumps(message, default=str)
        dead_connections = set()

        for conn in connections:
            try:
                await conn.send_text(payload_str)
            except Exception:
                dead_connections.add(conn)

        for dead in dead_connections:
            self.disconnect(meeting_id, dead)

    def set_ai_state(self, meeting_id: str, state: str):
        """Update AI participant state ("IDLE", "LISTENING", "THINKING", "SPEAKING")."""
        self.ai_states[meeting_id] = state

    def get_ai_state(self, meeting_id: str) -> str:
        return self.ai_states.get(meeting_id, "IDLE")

    def get_online_user_ids(self, meeting_id: str) -> list[str]:
        """Return list of distinct user IDs currently connected."""
        users_map = self.socket_users.get(meeting_id, {})
        return list(set(users_map.values()))


meeting_connection_manager = MeetingConnectionManager()
