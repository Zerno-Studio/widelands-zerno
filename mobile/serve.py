from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parent/'www')
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Cross-Origin-Opener-Policy','same-origin')
  self.send_header('Cross-Origin-Embedder-Policy','require-corp')
  self.send_header('Document-Isolation-Policy','isolate-and-require-corp')
  super().end_headers()
ThreadingHTTPServer(('127.0.0.1',5189),Handler).serve_forever()
