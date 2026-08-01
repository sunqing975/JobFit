import socket
import threading
import webbrowser

import uvicorn

from app.main import app


def _find_port() -> int:
    for port in range(8000, 8100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("无可用端口（8000-8099 均被占用）")


if __name__ == "__main__":
    port = _find_port()
    threading.Timer(1.5, lambda: webbrowser.open(f"http://127.0.0.1:{port}/")).start()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
