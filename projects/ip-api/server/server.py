#!/usr/bin/env python3
"""
IP API Server - Returns ONLY raw IP address

Response: Just the IP, nothing else
Example: 203.0.113.45

Usage:
    python3 server.py
    curl http://localhost:3080
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import os

PORT = int(os.environ.get('PORT', 3080))


class IPHandler(BaseHTTPRequestHandler):
    def get_client_ip(self):
        # Priority: X-Forwarded-For > X-Real-IP > client_address
        xff = self.headers.get('X-Forwarded-For')
        if xff:
            return xff.split(',')[0].strip()

        xri = self.headers.get('X-Real-IP')
        if xri:
            return xri

        cf = self.headers.get('CF-Connecting-IP')
        if cf:
            return cf

        ip = self.client_address[0]

        # Handle IPv6-mapped IPv4
        if ip.startswith('::ffff:'):
            ip = ip[7:]
        if ip == '::1':
            ip = '127.0.0.1'

        return ip

    def do_GET(self):
        ip = self.get_client_ip()

        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store')
        self.end_headers()

        # Return ONLY the IP - nothing else
        self.wfile.write(ip.encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress default logging
        pass


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), IPHandler)
    print(f'IP API running on http://localhost:{PORT}')
    print(f'Test: curl http://localhost:{PORT}')
    server.serve_forever()
