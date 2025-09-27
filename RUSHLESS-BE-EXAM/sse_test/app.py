from flask import Flask
import requests
from sseclient import SSEClient  # pip install sseclient-py
import threading

app = Flask(__name__)

SSE_URL = "http://localhost:4040/api/stream/penguji?courseId=1"  # perbaiki query param userId

# hardcode token
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODY4NTY4MSwiZXhwIjoxNzU4NjkyODgxfQ.xps3r4v9HVcMJiQ_NEHfTziKD80j4th6WMETyaJf_jI"

def listen_sse():
    """Listener SSE jalan terus di background"""
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    with requests.get(SSE_URL, headers=headers, stream=True) as response:
        client = SSEClient(response)
        for event in client.events():
            print("[SSE Event]", event.data)


@app.route("/")
def index():
    return "Flask server jalan, lihat console untuk output SSE."


if __name__ == "__main__":
    # jalankan listener SSE di thread terpisah
    t = threading.Thread(target=listen_sse, daemon=True)
    t.start()

    app.run(port=6001, debug=True)
