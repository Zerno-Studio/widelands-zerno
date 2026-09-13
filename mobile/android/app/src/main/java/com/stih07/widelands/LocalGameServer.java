package com.stih07.widelands;

import android.content.res.AssetManager;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

/** Legacy 0.1.0 helper; not compiled or used by the 0.2.0 APK.
 * Offline compatibility route for WebViews without shared WASM memory.
 * Binds only loopback; assets are public game files, never application data.
 */
final class LocalGameServer implements AutoCloseable {
 private final ServerSocket server;
 private final ExecutorService pool=Executors.newFixedThreadPool(4);
 private final AssetManager assets;
 LocalGameServer(AssetManager assets)throws IOException {
  this.assets=assets; server=new ServerSocket(37189,8,InetAddress.getByName("127.0.0.1"));
  Thread accept=new Thread(()->{while(!server.isClosed())try{Socket s=server.accept();pool.execute(()->serve(s));}catch(IOException e){break;}},"widelands-local-assets");accept.setDaemon(true);accept.start();
 }
 String url(){return "http://127.0.0.1:"+server.getLocalPort()+"/index.html";}
 private void serve(Socket socket){try(Socket s=socket){
  s.setSoTimeout(15000);
  BufferedReader reader=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.US_ASCII));
  String first=reader.readLine();if(first==null)return;
  String[] request=first.split(" ");if(request.length<2)return;
  for(String line;(line=reader.readLine())!=null&&!line.isEmpty();){}
  String path=URLDecoder.decode(request[1].split("\\?",2)[0],"UTF-8");
  if(!request[0].equals("GET")||path.contains("..")||path.contains("\\")||!path.startsWith("/")){s.getOutputStream().write("HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes(StandardCharsets.US_ASCII));return;}
  if(path.equals("/"))path="/index.html";
  try(InputStream body=assets.open("game"+path)){
   String mime=path.endsWith(".html")?"text/html; charset=utf-8":path.endsWith(".js")?"application/javascript":path.endsWith(".wasm")?"application/wasm":"application/octet-stream";
   String headers="HTTP/1.1 200 OK\r\nContent-Type: "+mime+"\r\nContent-Length: "+body.available()+"\r\nCross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\nDocument-Isolation-Policy: isolate-and-require-corp\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
   OutputStream out=s.getOutputStream();out.write(headers.getBytes(StandardCharsets.US_ASCII));byte[] buffer=new byte[65536];for(int n;(n=body.read(buffer))>=0;)out.write(buffer,0,n);
  }catch(FileNotFoundException e){s.getOutputStream().write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes(StandardCharsets.US_ASCII));}
 }catch(IOException ignored){}}
 @Override public void close(){try{server.close();}catch(IOException ignored){}pool.shutdownNow();}
}
