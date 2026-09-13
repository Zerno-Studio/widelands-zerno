import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = GameController()
        window?.makeKeyAndVisible()
        return true
    }
    func applicationDidEnterBackground(_ application: UIApplication) {
        (window?.rootViewController as? GameController)?.flushStorage()
    }
}

// Streaming avoids creating a second complete copy of each asset block in Swift.
final class BundleAssets: NSObject, WKURLSchemeHandler {
    private var handles: [ObjectIdentifier: FileHandle] = [:]
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.scheme == "zerno", url.host == "game",
              let root = Bundle.main.resourceURL?.appendingPathComponent("www") else {
            task.didFailWithError(URLError(.badURL)); return
        }
        let relative = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(relative).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path + "/") else {
            task.didFailWithError(URLError(.noPermissionsToReadFile)); return
        }
        do {
            let handle = try FileHandle(forReadingFrom: file)
            let size = (try FileManager.default.attributesOfItem(atPath: file.path)[.size] as? NSNumber)?.intValue ?? 0
            let mime = ["html":"text/html", "js":"application/javascript", "css":"text/css", "json":"application/json", "wasm":"application/wasm"][file.pathExtension] ?? "application/octet-stream"
            handles[ObjectIdentifier(task)] = handle
            task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: size, textEncodingName: mime.hasPrefix("text/") ? "utf-8" : nil))
            pump(task)
        } catch { task.didFailWithError(error) }
    }
    private func pump(_ task: WKURLSchemeTask) {
        let id = ObjectIdentifier(task)
        guard let handle = handles[id] else { return }
        do {
            if let bytes = try handle.read(upToCount: 64 * 1024), !bytes.isEmpty {
                task.didReceive(bytes)
                DispatchQueue.main.async { [weak self] in self?.pump(task) }
            } else {
                try? handle.close(); handles.removeValue(forKey: id); task.didFinish()
            }
        } catch {
            try? handle.close(); handles.removeValue(forKey: id); task.didFailWithError(error)
        }
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        try? handles.removeValue(forKey: ObjectIdentifier(task))?.close()
    }
}

final class GameController: UIViewController, WKNavigationDelegate {
    private var web: WKWebView!
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.setURLSchemeHandler(BundleAssets(), forURLScheme: "zerno")
        config.allowsInlineMediaPlayback = true
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.isInspectable = true
        web.scrollView.isScrollEnabled = false
        web.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = UIColor(red: 0.06, green: 0.10, blue: 0.13, alpha: 1)
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        web.load(URLRequest(url: URL(string: "zerno://game/index.html")!))
    }
    func flushStorage() {
        web?.evaluateJavaScript("if(window.Module&&Module.FS)Module.FS.syncfs(false,e=>{if(e)console.error('Save sync failed',e);});", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(action.request.url?.scheme == "zerno" && action.request.url?.host == "game" ? .allow : .cancel)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let alert = UIAlertController(title: "Game renderer stopped", message: "The game did not complete this run. Saved files have not been deleted. Connect Safari Web Inspector to collect diagnostics before retrying.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Close", style: .cancel))
        present(alert, animated: true)
    }
}
