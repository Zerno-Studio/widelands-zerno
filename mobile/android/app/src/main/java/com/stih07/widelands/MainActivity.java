package com.stih07.widelands;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.util.Collections;

public class MainActivity extends Activity {
 private WebView web;
 private final StringBuilder diagnostics=new StringBuilder();

 private boolean background;
 private static final String HOST="appassets.androidplatform.net";
 private static final String SAVE="if(window.Module&&Module.FS)Module.FS.syncfs(false,function(){});";
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
  getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  getWindow().setStatusBarColor(0xff061e2c); getWindow().setNavigationBarColor(0xff061e2c);
  if(Build.VERSION.SDK_INT>=28) getWindow().getAttributes().layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
  if(Build.VERSION.SDK_INT>=30)getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
  FrameLayout frame=new FrameLayout(this); frame.setBackgroundColor(0xff061e2c);
  web=new WebView(this);web.setBackgroundColor(0xff061e2c);
  frame.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(frame);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setMediaPlaybackRequiresUserGesture(false);s.setSupportZoom(false);
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  frame.setOnApplyWindowInsetsListener((v,insets)->{
   int l=0,t=0,r=0,b=0;
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets x=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());l=x.left;t=x.top;r=x.right;b=x.bottom;}
   else {l=insets.getSystemWindowInsetLeft();t=insets.getSystemWindowInsetTop();r=insets.getSystemWindowInsetRight();b=insets.getSystemWindowInsetBottom();if(insets.getDisplayCutout()!=null){l=Math.max(l,insets.getDisplayCutout().getSafeInsetLeft());t=Math.max(t,insets.getDisplayCutout().getSafeInsetTop());r=Math.max(r,insets.getDisplayCutout().getSafeInsetRight());b=Math.max(b,insets.getDisplayCutout().getSafeInsetBottom());}}
   v.setPadding(l,t,r,b);
   if(Build.VERSION.SDK_INT>=30 && web!=null){
    int keyboard=Math.max(0,insets.getInsets(WindowInsets.Type.ime()).bottom-b);
    float cssHeight=keyboard/getResources().getDisplayMetrics().density;
    web.evaluateJavascript("window.widelandsKeyboardInset&&window.widelandsKeyboardInset("+cssHeight+");",null);
   }
   return insets;
  });
  web.setWebChromeClient(new android.webkit.WebChromeClient(){
   @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage m){
    diagnostics.append(m.message()).append("\n");
    if(diagnostics.length()>6000)diagnostics.delete(0,diagnostics.length()-6000);
    android.util.Log.i("Widelands",m.message());return true;
   }
  });
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean onRenderProcessGone(WebView view,android.webkit.RenderProcessGoneDetail detail){
    ((android.view.ViewGroup)view.getParent()).removeView(view);web=null;view.destroy();
    android.content.pm.PackageInfo provider=WebView.getCurrentWebViewPackage();
    String report="Widelands 0.11.0\nWebView: "+(provider==null?"unknown":provider.versionName)+
     "\nRenderer: "+(detail.didCrash()?"crashed":"terminated by Android (possibly memory pressure)")+"\n"+diagnostics;
    android.widget.TextView text=new android.widget.TextView(MainActivity.this);
    text.setText("Game renderer stopped. Save data has not been deleted.\n\n"+report);text.setTextIsSelectable(true);text.setPadding(24,24,24,24);
    android.widget.ScrollView scroll=new android.widget.ScrollView(MainActivity.this);scroll.addView(text);
    new AlertDialog.Builder(MainActivity.this).setTitle("Widelands could not start").setView(scroll)
     .setPositiveButton("Copy report",(d,w)->{android.content.ClipboardManager c=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);c.setPrimaryClip(android.content.ClipData.newPlainText("Widelands diagnostics",report));})
     .setNegativeButton("Close",(d,w)->finish()).setCancelable(false).show();
    return true;
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,android.webkit.WebResourceError error){
    diagnostics.append("Resource error: ").append(request.getUrl()).append(" ").append(error.getDescription()).append("\n");
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !HOST.equals(request.getUrl().getHost())||!"https".equals(request.getUrl().getScheme());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    String p=request.getUrl().getPath();
    if(!HOST.equals(request.getUrl().getHost())||!"https".equals(request.getUrl().getScheme())||p==null||p.contains("..")||p.contains("\\"))return missing();
    if(p.equals("/"))p="/index.html";
    String mime=p.endsWith(".html")?"text/html":p.endsWith(".js")?"application/javascript":p.endsWith(".css")?"text/css":p.endsWith(".wasm")?"application/wasm":p.endsWith(".json")?"application/json":p.endsWith(".svg")?"image/svg+xml":p.endsWith(".png")?"image/png":"application/octet-stream";
    try{return new WebResourceResponse(mime,(mime.startsWith("text/")||mime.contains("javascript")||mime.contains("json"))?"UTF-8":null,200,"OK",headers(),getAssets().open("game"+p));}catch(Exception e){return missing();}
   }
  });
  fullscreen();web.loadUrl("https://"+HOST+"/index.html");
 }
 private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 private void fullscreen(){
  if(Build.VERSION.SDK_INT>=30){WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.hide(WindowInsets.Type.systemBars());c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}}
  else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
 }
 @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)fullscreen();}
 @Override protected void onPause(){background=true;if(web!=null)web.evaluateJavascript("window.widelandsAudioBackground && window.widelandsAudioBackground(true);"+SAVE,result->{if(background&&web!=null)web.onPause();});super.onPause();}
 @Override protected void onResume(){super.onResume();background=false;if(web!=null){web.onResume();web.evaluateJavascript("window.widelandsAudioBackground && window.widelandsAudioBackground(false);",null);fullscreen();}}
 @Override public void onBackPressed(){handleBack();}
 private void handleBack(){if(web==null){finish();return;}web.evaluateJavascript("window.widelandsBack && window.widelandsBack();",null);}

 private java.util.Map<String,String> headers(){java.util.Map<String,String> h=new java.util.HashMap<>();h.put("Cache-Control","no-cache");return h;}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
