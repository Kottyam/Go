package com.alien1729.goservice;

import android.content.Intent;
import android.net.Uri;
import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;

import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
    private static final String WEB_CLIENT_ID = "535180088089-udvql02691dqs1uuoco6v6cqip7jcg7p.apps.googleusercontent.com";
    private WebView webView;
    private String pendingToken = "";
    private String pendingAccess = "";
    private boolean pageReady = false;
    private final ActivityResultLauncher<Intent> googleSignIn = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                try {
                    String token = GoogleSignIn.getSignedInAccountFromIntent(result.getData())
                            .getResult(ApiException.class)
                            .getIdToken();
                    pendingToken = token == null ? "" : token;
                    deliverToken();
                } catch (Exception ignored) {
                    if (webView != null) {
                        webView.evaluateJavascript("window.__goGoogleCancel&&window.__goGoogleCancel()", null);
                    }
                }
            });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setNavigationBarColor(0xFFFFFFFF);
        getWindow().getDecorView().setSystemUiVisibility(
                getWindow().getDecorView().getSystemUiVisibility() & ~android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(
                    getWindow().getDecorView().getSystemUiVisibility() | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
        }
        webView = new WebView(this);
        setContentView(webView);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            view.setBackgroundColor(0xFFFFFFFF);
            view.post(() -> webView.evaluateJavascript(
                    "(function(){document.documentElement.style.setProperty('--go-system-bottom','" + bars.bottom + "px');})();",
                    null
            ));
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setUserAgentString(
                "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 GoServiceApp");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.addJavascriptInterface(new Bridge(), "GoAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(localPage(request.getUrl()));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && "appassets.androidplatform.net".equals(uri.getHost())) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        view.loadUrl(uri.buildUpon().path("/index.html").build().toString());
                        return true;
                    }
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                deliverToken();
                if (url != null && url.contains("accounts.google.com")) {
                    view.evaluateJavascript(
                            "(function(){var s=document.documentElement.style;s.boxSizing='border-box';s.paddingTop='12px';s.paddingBottom='28px';s.maxWidth='100%';s.overflowX='hidden';})();",
                            null);
                }
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        readAuth(getIntent());
        webView.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readAuth(intent);
        deliverToken();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingToken.isEmpty() && pendingAccess.isEmpty() && webView != null) {
            webView.evaluateJavascript("window.__goGoogleCancel&&window.__goGoogleCancel()", null);
        }
    }

    private void readAuth(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri data = intent.getData();
        if (!"goservice".equals(data.getScheme())) return;
        pendingToken = data.getQueryParameter("token") == null ? "" : data.getQueryParameter("token");
        pendingAccess = data.getQueryParameter("access") == null ? "" : data.getQueryParameter("access");
    }

    private void deliverToken() {
        if (!pageReady || webView == null) return;
        if (pendingToken.isEmpty() && pendingAccess.isEmpty()) return;
        String token = pendingToken;
        String access = pendingAccess;
        pendingToken = "";
        pendingAccess = "";
        webView.evaluateJavascript(
                "window.__goGoogleToken&&window.__goGoogleToken(" + JSONObject.quote(token) + "," + JSONObject.quote(access) + ")",
                null);
    }

    private void openGoogle() {
        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(WEB_CLIENT_ID)
                .requestEmail()
                .build();
        GoogleSignIn.getClient(this, options).signOut().addOnCompleteListener(task ->
                googleSignIn.launch(GoogleSignIn.getClient(this, options).getSignInIntent()));
    }

    private class Bridge {
        @JavascriptInterface
        public void openGoogle() {
            runOnUiThread(MainActivity.this::openGoogle);
        }
    }

    private Uri localPage(Uri uri) {
        if (uri == null || !"appassets.androidplatform.net".equals(uri.getHost())) return uri;
        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            return uri.buildUpon().path("/index.html").build();
        }
        return uri;
    }
}