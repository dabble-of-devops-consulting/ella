import threading
import os
import sys
import logging
import time

DEFAULT_STATIC_FILE = 'index.html'
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from flask import send_from_directory, request, g
from flask_restful import Api
from api import app, db, AuthenticationError, ConflictError
from api.v1 import ApiV1
from api.util.util import populate_g_user, populate_g_logging, log_request

KEYWORD_DEVELOPER_MODE = 'DEVELOP'
SCRIPT_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_FILE_DIR = os.path.join(SCRIPT_DIR, '../webui/build')
VALID_STATIC_FILES = [
    'app.css',
    'base.css',
    'app.js',
    'thirdparty.js',
    'templates.js',
    'fonts',
    'favicon.ico'
]

log = app.logger


@app.before_first_request
def setup_logging():
    if not app.debug:
        log.addHandler(logging.StreamHandler())
        log.setLevel(logging.INFO)


@app.before_request
def populate_request():
    g.request_start_time = time.time() * 1000.0
    populate_g_logging()
    if request.path and request.path.split('/')[1] not in VALID_STATIC_FILES:
        populate_g_user()

@app.after_request
def after_request(response):
    if request.path and request.path.split('/')[1] not in VALID_STATIC_FILES:
        log_request(response.status_code, response)
        db.session.commit()

    return response


@app.teardown_request
def teardown_request(exc):
    if exc:
        if request.url.startswith('/reset'):  # DEVELOPMENT
            return None
        log_request(500)
        db.session.commit()


@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()


def serve_static(path=None):
    if not path:
        path = DEFAULT_STATIC_FILE

    if not any(v == path or path.startswith(v) for v in VALID_STATIC_FILES):
        path = DEFAULT_STATIC_FILE

    return send_from_directory(STATIC_FILE_DIR, path)


class ApiErrorHandling(Api):
    def handle_error(self, e):
        if isinstance(e, (AuthenticationError, ConflictError)):
            return self.make_response(e.message, e.status_code)
        else:
            return super(ApiErrorHandling, self).handle_error(e)


api = ApiErrorHandling(app)

# Setup resources for v1
ApiV1(app, api).setup_api()

if os.environ.get('SERVE_STATIC'):
    app.add_url_rule('/', 'index', serve_static)
    app.add_url_rule('/<path:path>', 'index_redirect', serve_static)

# This is used by development - production will not trigger it
if __name__ == '__main__':
    opts = {
        'host': '0.0.0.0',
        'threaded': True,
        'port': int(os.getenv('API_PORT', '5000'))
    }

    # Dev mode stuff
    is_dev = os.getenv(KEYWORD_DEVELOPER_MODE, '').lower() == 'true'
    if is_dev:
        opts['use_reloader'] = True
        os.environ['ANALYSES_PATH'] = '/ella/src/vardb/testdata/analyses/small/'

    if is_dev:
        print "!!!!!DEVELOPMENT MODE!!!!!"

    app.run(**opts)
