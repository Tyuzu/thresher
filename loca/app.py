from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/events", methods=["POST"])
def handle_event():
    event_data = request.get_json()

    event_id = event_data.get("id")
    event_type = event_data.get("type")
    payload = event_data.get("payload")

    print(f"Received event [{event_type}] with ID {event_id}: {payload}")

    return jsonify({"status": "received"}), 200


@app.route("/api/ads", methods=["GET"])
def get_ads():
    ads = [
        {
            "id": "101",
            "title": "Python Specialized Ad",
            "description": "Custom targeted ad served from Python",
            "image": "https://via.placeholder.com/300x250?text=Python+Ad",
            "link": "https://example.com/python-promo",
            "category": "tech",
            "page": "home",
            "position": "aside",
        }
    ]

    return jsonify(ads), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)