import pytest
from flask import *
import re
import socket
import os
import json

app = Flask(__name__)

JOBSTATUS = ["PENDING", "SUCCESS"]

@app.route('/status', defaults={"task_id": None})
@app.route('/status/<task_id>')
def taskstatus(task_id):
    if task_id == None:
        return "foo"
    else:
        taskstatus.count += 1
        # Will return PENDING first time, and SUCCESS second time
        return jsonify({task_id: JOBSTATUS[taskstatus.count % 2]})
taskstatus.count = -1

@app.route('/process/<task_id>', methods=["GET", "DELETE"])
def process(task_id):
    output = {
        "data": "Dummy data that will fail deposit",
        "message": "",
        "status": "SUCCESS"
    }
    return jsonify(output)

@app.route('/annotate', methods=['POST'])
def annotate():
    data = request.get_data()
    return json.dumps({"task_id": "123456789"})

if __name__ == "__main__":
    ANNOTATION_SERVICE = os.environ["ANNOTATION_SERVICE_URL"]
    host = re.findall("//([^:]*)", ANNOTATION_SERVICE)[0]
    assert socket.gethostbyname(host) == socket.gethostbyname("localhost")
    port = int(re.findall(":(\d+)", ANNOTATION_SERVICE)[0])
    app.run(debug=True, host=host, port=port)