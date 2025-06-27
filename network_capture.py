#!/usr/bin/env python3
"""
网络抓包脚本 - 用于捕获和分析HTTP请求
支持多种抓包方式：浏览器代理、网络接口监听等
"""

import json
import time
import threading
import argparse
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import socket
import sys
import os

class ProxyHandler(BaseHTTPRequestHandler):
    """HTTP代理处理器"""
    
    def __init__(self, *args, capture_callback=None, **kwargs):
        self.capture_callback = capture_callback
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        self._handle_request('GET')
    
    def do_POST(self):
        self._handle_request('POST')
    
    def do_PUT(self):
        self._handle_request('PUT')
    
    def do_DELETE(self):
        self._handle_request('DELETE')
    
    def do_PATCH(self):
        self._handle_request('PATCH')
    
    def _handle_request(self, method):
        """处理HTTP请求"""
        try:
            # 获取请求头
            headers = dict(self.headers)
            
            # 获取请求体
            content_length = int(headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b''
            
            # 解析URL
            parsed_url = urllib.parse.urlparse(self.path)
            
            # 构建请求信息
            request_info = {
                'timestamp': datetime.now().isoformat(),
                'method': method,
                'url': self.path,
                'path': parsed_url.path,
                'query': parsed_url.query,
                'headers': headers,
                'body': body.decode('utf-8', errors='ignore') if body else '',
                'client_ip': self.client_address[0]
            }
            
            # 回调处理
            if self.capture_callback:
                self.capture_callback(request_info)
            
            # 简单响应
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()
            
            response = {'status': 'captured', 'timestamp': request_info['timestamp']}
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"处理请求时出错: {e}")
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

class NetworkCapture:
    """网络抓包主类"""
    
    def __init__(self, output_file='captured_requests.json', port=8888):
        self.output_file = output_file
        self.port = port
        self.captured_requests = []
        self.server = None
        self.running = False
    
    def capture_callback(self, request_info):
        """请求捕获回调"""
        self.captured_requests.append(request_info)
        
        # 实时显示
        print(f"\n[{request_info['timestamp']}] {request_info['method']} {request_info['path']}")
        if request_info['query']:
            print(f"  Query: {request_info['query']}")
        
        # 显示重要头信息
        important_headers = ['authorization', 'token', 'x-token', 'cookie', 'content-type']
        for header in important_headers:
            if header in request_info['headers']:
                value = request_info['headers'][header]
                if len(value) > 100:
                    value = value[:100] + "..."
                print(f"  {header.title()}: {value}")
        
        # 显示请求体（如果有且不太长）
        if request_info['body'] and len(request_info['body']) < 500:
            try:
                # 尝试格式化JSON
                body_json = json.loads(request_info['body'])
                print(f"  Body: {json.dumps(body_json, indent=2, ensure_ascii=False)}")
            except:
                print(f"  Body: {request_info['body']}")
        elif request_info['body']:
            print(f"  Body: [长度: {len(request_info['body'])} 字符]")
        
        print("-" * 80)
        
        # 保存到文件
        self.save_to_file()
    
    def save_to_file(self):
        """保存捕获的请求到文件"""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(self.captured_requests, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"保存文件时出错: {e}")
    
    def start_proxy_server(self):
        """启动代理服务器"""
        try:
            # 创建处理器类，绑定回调
            def handler_factory(*args, **kwargs):
                return ProxyHandler(*args, capture_callback=self.capture_callback, **kwargs)
            
            self.server = HTTPServer(('0.0.0.0', self.port), handler_factory)
            self.running = True
            
            print(f"代理服务器启动在端口 {self.port}")
            print(f"请将浏览器代理设置为: 127.0.0.1:{self.port}")
            print(f"或者在您的应用中将API请求发送到: http://127.0.0.1:{self.port}")
            print("按 Ctrl+C 停止抓包")
            print("=" * 80)
            
            self.server.serve_forever()
            
        except KeyboardInterrupt:
            print("\n停止抓包...")
            self.stop()
        except Exception as e:
            print(f"启动服务器时出错: {e}")
    
    def stop(self):
        """停止抓包"""
        self.running = False
        if self.server:
            self.server.shutdown()
            self.server.server_close()
        
        print(f"\n抓包完成！共捕获 {len(self.captured_requests)} 个请求")
        print(f"结果已保存到: {self.output_file}")
        
        # 生成统计报告
        self.generate_report()
    
    def generate_report(self):
        """生成抓包报告"""
        if not self.captured_requests:
            return
        
        report_file = self.output_file.replace('.json', '_report.txt')
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("网络抓包报告\n")
            f.write("=" * 50 + "\n\n")
            
            # 统计信息
            methods = {}
            paths = {}
            
            for req in self.captured_requests:
                method = req['method']
                path = req['path']
                
                methods[method] = methods.get(method, 0) + 1
                paths[path] = paths.get(path, 0) + 1
            
            f.write(f"总请求数: {len(self.captured_requests)}\n\n")
            
            f.write("请求方法统计:\n")
            for method, count in sorted(methods.items()):
                f.write(f"  {method}: {count}\n")
            f.write("\n")
            
            f.write("请求路径统计:\n")
            for path, count in sorted(paths.items(), key=lambda x: x[1], reverse=True):
                f.write(f"  {path}: {count}\n")
            f.write("\n")
            
            # 详细请求列表
            f.write("详细请求列表:\n")
            f.write("-" * 50 + "\n")
            
            for i, req in enumerate(self.captured_requests, 1):
                f.write(f"{i}. [{req['timestamp']}] {req['method']} {req['path']}\n")
                if req['query']:
                    f.write(f"   Query: {req['query']}\n")
                
                # 重要头信息
                important_headers = ['authorization', 'token', 'x-token', 'cookie']
                for header in important_headers:
                    if header in req['headers']:
                        value = req['headers'][header]
                        if len(value) > 100:
                            value = value[:100] + "..."
                        f.write(f"   {header.title()}: {value}\n")
                
                if req['body']:
                    body_preview = req['body'][:200]
                    if len(req['body']) > 200:
                        body_preview += "..."
                    f.write(f"   Body: {body_preview}\n")
                
                f.write("\n")
        
        print(f"详细报告已保存到: {report_file}")

def create_browser_script():
    """创建浏览器端抓包脚本"""
    script_content = '''
// 浏览器端网络请求拦截脚本
// 在浏览器控制台中运行此脚本

(function() {
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    const capturedRequests = [];
    
    // 拦截 fetch 请求
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        console.log('Fetch请求:', {
            url: url,
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body
        });
        
        capturedRequests.push({
            timestamp: new Date().toISOString(),
            type: 'fetch',
            url: url,
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body
        });
        
        return originalFetch.apply(this, args);
    };
    
    // 拦截 XMLHttpRequest
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._method = method;
        this._url = url;
        return originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
        console.log('XHR请求:', {
            method: this._method,
            url: this._url,
            body: body
        });
        
        capturedRequests.push({
            timestamp: new Date().toISOString(),
            type: 'xhr',
            method: this._method,
            url: this._url,
            body: body
        });
        
        return originalXHRSend.apply(this, arguments);
    };
    
    // 导出捕获的请求
    window.exportCapturedRequests = function() {
        const dataStr = JSON.stringify(capturedRequests, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'browser_captured_requests.json';
        link.click();
        URL.revokeObjectURL(url);
    };
    
    // 查看捕获的请求
    window.showCapturedRequests = function() {
        console.table(capturedRequests);
        return capturedRequests;
    };
    
    console.log('网络请求拦截器已安装！');
    console.log('使用 showCapturedRequests() 查看捕获的请求');
    console.log('使用 exportCapturedRequests() 导出请求数据');
})();
'''
    
    with open('browser_capture.js', 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print("浏览器端抓包脚本已创建: browser_capture.js")

def main():
    parser = argparse.ArgumentParser(description='网络抓包工具')
    parser.add_argument('--port', type=int, default=8888, help='代理服务器端口 (默认: 8888)')
    parser.add_argument('--output', default='captured_requests.json', help='输出文件名 (默认: captured_requests.json)')
    parser.add_argument('--browser-script', action='store_true', help='生成浏览器端抓包脚本')
    
    args = parser.parse_args()
    
    if args.browser_script:
        create_browser_script()
        return
    
    # 检查端口是否被占用
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', args.port))
    sock.close()
    
    if result == 0:
        print(f"端口 {args.port} 已被占用，请选择其他端口")
        return
    
    # 启动抓包
    capture = NetworkCapture(output_file=args.output, port=args.port)
    capture.start_proxy_server()

if __name__ == '__main__':
    main() 