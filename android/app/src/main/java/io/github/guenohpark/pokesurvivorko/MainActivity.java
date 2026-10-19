package io.github.guenohpark.pokesurvivorko;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.SafeBrowsingResponse;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.File;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/** Unofficial test shell. No JS/native bridge or account inspection. */
public final class MainActivity extends Activity {
    // One cache owner across Activity recreation: old workers may still finish.
    // The helper contains files/data only, never an Activity or WebView reference.
    private static final Object UPDATER_INIT_LOCK = new Object();
    private static PatchUpdater processUpdater;
    private static final String HOME = "https://pokesurvivor.com/";
    private static final String VERSION = "0.1.1-test";
    private static final int VERSION_CODE = 2;
    private static final String APK_URL = "https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-test.apk";
    private static final long CHECK_INTERVAL_MS = 10 * 60 * 1000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView web;
    private FrameLayout root;
    private LinearLayout blocker;
    private TextView status;
    private ProgressBar progress;
    private Button retry;
    private String patch;
    private PatchUpdater updater;
    private PatchUpdater.Patch activePatch, bundledPatch;
    private boolean fallbackAttempted, updateCheckRunning;
    private SharedPreferences trialPrefs;
    private boolean patchExecutionPending;
    private String recoveryBlockedId;
    private long lastUpdateCheck;
    private String localeUpdateStatus = "한국어 업데이트: 아직 확인하지 않음";
    private String apkUpdateStatus = "앱 업데이트: 아직 확인하지 않음";
    private AppUpdateChecker.Info appUpdateInfo;
    private String diagnostics = "패치 확인 전";
    private String patchProblem;
    private int generation;
    private boolean failed, ready, resumed, destroyed;
    private long lastTouch;
    private AlertDialog activeDialog;
    private Runnable timeout;
    private OnBackInvokedCallback backCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        buildUi();
        configureWebView();
        trialPrefs = getSharedPreferences("locale-trial", MODE_PRIVATE);
        readPatch();
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::showMenu;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        loadHome();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void buildUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16, 24, 32));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(16, 24, 32));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        blocker = new LinearLayout(this);
        blocker.setOrientation(LinearLayout.VERTICAL);
        blocker.setGravity(Gravity.CENTER);
        blocker.setPadding(dp(24), dp(24), dp(24), dp(24));
        blocker.setBackgroundColor(Color.rgb(16, 24, 32));
        blocker.setClickable(true);
        blocker.setFocusable(true);
        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(17);
        status.setGravity(Gravity.CENTER);
        blocker.addView(status, new LinearLayout.LayoutParams(-1, -2));
        progress = new ProgressBar(this);
        blocker.addView(progress, new LinearLayout.LayoutParams(dp(48), dp(48)));
        retry = new Button(this);
        retry.setText("다시 시도");
        retry.setOnClickListener(v -> loadHome());
        blocker.addView(retry);
        Button menu = new Button(this);
        menu.setText("메뉴 / 앱 정보");
        menu.setOnClickListener(v -> showMenu());
        blocker.addView(menu);
        root.addView(blocker, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        // Keep interactive content clear of cutouts and transient navigation/status bars.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                                | WindowInsets.Type.ime());
                l = safe.left; t = safe.top; r = safe.right; b = safe.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft(); t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight(); b = insets.getSystemWindowInsetBottom();
                if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                    l = Math.max(l, insets.getDisplayCutout().getSafeInsetLeft());
                    t = Math.max(t, insets.getDisplayCutout().getSafeInsetTop());
                    r = Math.max(r, insets.getDisplayCutout().getSafeInsetRight());
                    b = Math.max(b, insets.getDisplayCutout().getSafeInsetBottom());
                }
            }
            v.setPadding(l, t, r, b);
            return insets;
        });
        root.requestApplyInsets();
        immersive();
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @SuppressWarnings("deprecation")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setGeolocationEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(true);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_UP) lastTouch = SystemClock.uptimeMillis();
            return !ready; // Second gate: overlay is not the only interaction protection.
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { return true; }
            @Override public void onPermissionRequest(PermissionRequest p) { p.deny(); }
            @Override public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) { callback.invoke(origin, false, false); }
            @Override public boolean onCreateWindow(WebView view, boolean dialog,
                    boolean gesture, Message result) {
                // Do not create hidden or unverified WebViews, including OAuth popups.
                Toast.makeText(MainActivity.this, "팝업은 지원하지 않습니다. Google 로그인은 제한될 수 있습니다.",
                        Toast.LENGTH_LONG).show();
                return false;
            }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback,
                    FileChooserParams params) { callback.onReceiveValue(null); return true; }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                if (!request.isForMainFrame()) {
                    // Official Firebase Auth may use a separate HTTPS helper frame.
                    // Normal SOP stays enabled; native patching remains main-frame-only.
                    String frameUrl = request.getUrl().toString();
                    return !(isExternalHttps(frameUrl) || "about:blank".equals(frameUrl));
                }
                return route(request.getUrl().toString(), request.hasGesture());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                WebView.HitTestResult hit = v.getHitTestResult();
                boolean gesture = SystemClock.uptimeMillis() - lastTouch < 1500
                        && hit != null && url.equals(hit.getExtra());
                // API 23 cannot identify frames here. Permit HTTPS background loads;
                // onPageStarted still stops an untrusted MAIN-frame navigation, and
                // the execution-time JS origin gate prevents patching such a page.
                if (!gesture && (isExternalHttps(url) || "about:blank".equals(url))) return false;
                return route(url, gesture);
            }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                if (!isTrusted(url)) {
                    v.stopLoading();
                    fail("공식 HTTPS 게임 페이지 외에는 앱에서 열 수 없습니다.");
                    return;
                }
                beginLoading();
            }
            @Override public void onPageFinished(WebView v, String url) {
                if (!ready && !failed && isTrusted(url) && isTrusted(v.getUrl())) inject(generation);
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest request,
                    WebResourceError error) {
                if (request.isForMainFrame()) {
                    cancelTransportTrial();
                    fail("게임을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.");
                }
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest request,
                    WebResourceResponse error) {
                if (request.isForMainFrame()) {
                    cancelTransportTrial();
                    fail("공식 서버가 오류를 반환했습니다. 잠시 후 다시 시도하세요.");
                }
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler h, SslError e) {
                h.cancel();
                cancelTransportTrial();
                fail("보안 연결을 확인할 수 없습니다. 인증서 오류는 우회하지 않습니다.");
            }
            @Override public void onSafeBrowsingHit(WebView v, WebResourceRequest request,
                    int threat, SafeBrowsingResponse response) {
                response.backToSafety(true);
                fail("안전하지 않은 콘텐츠가 차단되었습니다.");
            }
            @Override public boolean onRenderProcessGone(WebView v,
                    android.webkit.RenderProcessGoneDetail detail) {
                rejectPendingStagedTrial();
                // Do not send stopLoading or other commands to a dead renderer.
                if (v.getParent() instanceof ViewGroup) ((ViewGroup) v.getParent()).removeView(v);
                v.destroy(); web = null;
                fail("WebView가 종료되었습니다. 앱을 종료한 뒤 다시 실행하세요.");
                retry.setEnabled(false);
                return true;
            }
        });
        web.setDownloadListener((url, ua, disposition, mime, length) ->
                Toast.makeText(this, "앱 내 다운로드는 지원하지 않습니다.", Toast.LENGTH_SHORT).show());
    }

    private static boolean isTrusted(String value) {
        if (value == null) return false;
        try {
            URI u = new URI(value);
            String host = u.getHost();
            return "https".equalsIgnoreCase(u.getScheme()) && u.getRawUserInfo() == null
                    && (u.getPort() == -1 || u.getPort() == 443)
                    && ("pokesurvivor.com".equalsIgnoreCase(host)
                    || "www.pokesurvivor.com".equalsIgnoreCase(host));
        } catch (Exception ignored) { return false; }
    }

    private static boolean isExternalHttps(String value) {
        try {
            URI u = new URI(value);
            return "https".equalsIgnoreCase(u.getScheme()) && u.getHost() != null
                    && u.getRawUserInfo() == null;
        } catch (Exception ignored) { return false; }
    }

    private boolean route(String url, boolean gesture) {
        if (isTrusted(url)) return false;
        if (gesture && isExternalHttps(url)) {
            showExternalPrompt(url);
        } else {
            Toast.makeText(this, "이동이 차단되었습니다. 공식 게임만 앱 안에서 열 수 있습니다.",
                    Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void readPatch() {
        try (InputStream input = getAssets().open("patch.js");
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[8192];
            int count;
            while ((count = input.read(bytes)) != -1) {
                output.write(bytes, 0, count);
                if (output.size() > 4 * 1024 * 1024) throw new IllegalStateException();
            }
            patch = new String(output.toByteArray(), StandardCharsets.UTF_8);
            if (patch.trim().isEmpty()) throw new IllegalStateException();
            bundledPatch = PatchUpdater.bundled(patch);
            try {
                synchronized (UPDATER_INIT_LOCK) {
                    if (processUpdater == null)
                        processUpdater = new PatchUpdater(new File(getFilesDir(), "locale-cache"), patch);
                    updater = processUpdater;
                }
                recoverPreviousTrial();
            } catch (Exception cacheError) {
                localeUpdateStatus = "한국어 캐시를 사용할 수 없어 번들 패치를 사용합니다.";
            }
        } catch (Exception ignored) {
            patchProblem = "번들 patch.js가 없거나 유효하지 않습니다. 테스트 APK를 다시 빌드해야 합니다.";
        }
    }

    private PatchUpdater.Patch selectPatch() {
        if (updater != null) {
            try {
                PatchUpdater.Patch selected = updater.select();
                if ("staged".equals(selected.source) && (selected.id.equals(recoveryBlockedId)
                        || "unavailable".equals(recoveryBlockedId))) return bundledPatch;
                return selected;
            }
            catch (Exception ignored) { localeUpdateStatus = "한국어 캐시 오류: 번들 패치를 사용합니다."; }
        }
        return bundledPatch;
    }

    private void recoverPreviousTrial() {
        try {
            String id = trialPrefs.getString("patch-id", null);
            if (id == null || updater == null) return;
            PatchUpdater.Patch selected = updater.select();
            if (!id.equals(selected.id)) return;
            if ("current".equals(selected.source)) {
                // Promotion may have committed immediately before process death.
                clearTrial(selected);
            } else if ("staged".equals(selected.source)) {
                recoveryBlockedId = id;
                rejectPatch(selected);
            }
        } catch (Exception ignored) {
            // If trial bookkeeping cannot be read, do not attempt any staged script.
            recoveryBlockedId = "unavailable";
            localeUpdateStatus = "패치 복구 기록을 읽을 수 없어 번들 패치를 사용합니다.";
        }
    }

    private boolean persistTrial(PatchUpdater.Patch candidate) {
        if (recoveryBlockedId != null) return false;
        try {
            if (trialPrefs.edit().putString("patch-id", candidate.id).commit()) return true;
        } catch (Exception ignored) { }
        // A failed commit may still have changed memory or disk. Do not erase it here.
        recoveryBlockedId = candidate.id;
        localeUpdateStatus = "패치 시험 기록을 저장하지 못해 번들 패치를 사용합니다.";
        return false;
    }

    private boolean clearTrial(PatchUpdater.Patch candidate) {
        try {
            String recorded = trialPrefs.getString("patch-id", null);
            if (!candidate.id.equals(recorded)) return true;
            if (!trialPrefs.edit().remove("patch-id").commit()) return false;
            if (candidate.id.equals(recoveryBlockedId)) recoveryBlockedId = null;
            return true;
        } catch (Exception ignored) { return false; }
    }

    private void rejectPatch(PatchUpdater.Patch candidate) {
        if (candidate == null || candidate.bundled || updater == null) return;
        try {
            updater.markBad(candidate);
            clearTrial(candidate); // Never clear before the rejection ledger has committed.
        } catch (Exception ignored) {
            recoveryBlockedId = candidate.id;
            localeUpdateStatus = "실패한 패치의 복구 기록을 유지합니다. 다음 실행에 다시 복구합니다.";
        }
    }

    private void cancelTransportTrial() {
        if (patchExecutionPending && activePatch != null && "staged".equals(activePatch.source)
                && !activePatch.id.equals(recoveryBlockedId)) {
            // A confirmed network failure is not evidence against the patch.
            // Preserve records already needed after failed cache persistence.
            if (!clearTrial(activePatch))
                localeUpdateStatus = "네트워크 오류 후 패치 시험 취소 기록을 저장하지 못했습니다.";
        }
        patchExecutionPending = false;
    }

    private boolean rejectPendingStagedTrial() {
        if (!patchExecutionPending || activePatch == null || !"staged".equals(activePatch.source)) return false;
        rejectPatch(activePatch);
        patchExecutionPending = false;
        return true;
    }

    private void loadHome() {
        if (web == null) return;
        if (patchProblem != null) { fail(patchProblem); return; }
        activePatch = null;
        fallbackAttempted = false;
        beginLoading();
        web.loadUrl(HOME);
        checkUpdates(true);
    }

    private void beginLoading() {
        if (activePatch == null || ready || failed) {
            fallbackAttempted = false;
            activePatch = selectPatch();
        }
        if (activePatch == null) { fail("사용 가능한 번들 한국어 패치가 없습니다."); return; }
        patch = PatchUpdater.wrap(activePatch);
        generation++;
        failed = false; ready = false; patchExecutionPending = false;
        diagnostics = "패치 확인 전";
        blocker.setVisibility(View.VISIBLE);
        web.setVisibility(View.INVISIBLE);
        progress.setVisibility(View.VISIBLE);
        retry.setVisibility(View.GONE);
        status.setText("비공식 한국어 테스트\n공식 게임 및 한국어 패치 확인 중…\n완료 전에는 조작할 수 없습니다.");
        if (timeout != null) handler.removeCallbacks(timeout);
        final int token = generation;
        timeout = () -> {
            if (token == generation && !ready) {
                boolean interruptedTrial = rejectPendingStagedTrial();
                fail(interruptedTrial ? "한국어 패치 실행 시간이 초과되었습니다. 앱을 종료한 뒤 다시 실행하세요."
                        : "불러오기 시간이 초과되었습니다. 다시 시도하세요.");
                if (interruptedTrial) retry.setEnabled(false);
            }
        };
        handler.postDelayed(timeout, 60000);
    }

    private void fail(String text) {
        generation++;
        failed = true; ready = false; patchExecutionPending = false;
        if (timeout != null) handler.removeCallbacks(timeout);
        if (web != null) { web.stopLoading(); web.setVisibility(View.INVISIBLE); }
        blocker.setVisibility(View.VISIBLE);
        progress.setVisibility(View.GONE);
        retry.setVisibility(View.VISIBLE);
        status.setText("비공식 한국어 테스트\n\n" + text);
    }

    private static final String JS_TRUST = "location.protocol==='https:' && "
            + "(location.hostname==='pokesurvivor.com'||location.hostname==='www.pokesurvivor.com')"
            + " && (!location.port||location.port==='443')";

    private void inject(final int token) {
        if (!current(token) || patch == null || patchExecutionPending) return;
        if ("staged".equals(activePatch.source) && !persistTrial(activePatch)) {
            activePatch = bundledPatch;
            fallbackAttempted = true;
            patch = PatchUpdater.wrap(activePatch);
        }
        patchExecutionPending = true;
        // Run as a function body: a patch's own return does not skip our separate verification.
        String script = "(function(){if (!(" + JS_TRUST + ")) return false; globalThis.__PSKO_ANDROID_STATUS=null; try {\n"
                + patch + "\n} catch(e) { return false; } return true;})()";
        web.evaluateJavascript(script, ignored -> {
            if (!current(token)) return;
            String verify = "(function(){if (!(" + JS_TRUST + ")) return null;"
                    + "var p=window.__PSKO,s=window.__PSKO_ANDROID_STATUS||{},d=document.documentElement.dataset;"
                    + "return JSON.stringify({ok:!!p&&s.ok===true&&s.version==="
                    + JSONObject.quote(activePatch.version) + "&&!!d.pskoDom&&"
                    + "d.pskoDom===s.domVersion&&d.pskoCanvas==='native-main'&&"
                    + "s.canvasMode==='native-main',version:typeof s.version==='string'?s.version.substr(0,64):'unknown',"
                    + "canvasMode:s.canvasMode==='native-main'?'native-main':'unverified',"
                    + "fontScale:s.fontScale==='90'||s.fontScale==='100'?s.fontScale:'unknown'});})()";
            web.evaluateJavascript(verify, result -> verifyResult(token, result));
        });
    }

    private boolean current(int token) {
        return !destroyed && !failed && web != null && token == generation && isTrusted(web.getUrl());
    }

    private void verifyResult(int token, String result) {
        if (!current(token)) return;
        try {
            // evaluateJavascript JSON-encodes the JSON string returned by the verifier.
            Object decoded = new org.json.JSONTokener(result).nextValue();
            if (!(decoded instanceof String)) throw new IllegalStateException();
            JSONObject info = new JSONObject((String) decoded);
            if (!info.optBoolean("ok") || activePatch == null
                    || !activePatch.version.equals(info.optString("version"))) throw new IllegalStateException();
            String v = info.optString("version", "unknown");
            // Only a short version token, never arbitrary page text, enters native diagnostics.
            if (!v.matches("[A-Za-z0-9._+\\-]{1,64}")) v = "unknown";
            String scale = info.optString("fontScale", "unknown");
            if (!"90".equals(scale) && !"100".equals(scale)) scale = "unknown";
            diagnostics = "패치 버전: " + v + "\nCanvas 후크: native-main\n한국어 글꼴 배율: " + scale;
            if (updater != null) {
                try {
                    updater.markGood(activePatch);
                    clearTrial(activePatch);
                }
                catch (Exception ignored) {
                    if ("staged".equals(activePatch.source)) recoveryBlockedId = activePatch.id;
                    localeUpdateStatus = "패치는 적용됐지만 캐시에 저장하지 못했습니다. 복구 기록을 유지합니다.";
                }
            }
            patchExecutionPending = false;
            ready = true;
            if (timeout != null) handler.removeCallbacks(timeout);
            web.setVisibility(View.VISIBLE);
            blocker.setVisibility(View.GONE);
            web.requestFocus();
            applySuspension();
        } catch (Exception ignored) {
            patchVerificationFailed(token);
        }
    }

    private void patchVerificationFailed(int token) {
        if (!current(token)) return;
        patchExecutionPending = false;
        PatchUpdater.Patch rejected = activePatch;
        if (rejected != null && !rejected.bundled) {
            rejectPatch(rejected);
            if (!fallbackAttempted) {
                fallbackAttempted = true;
                PatchUpdater.Patch next = selectPatch();
                if (next == null || next.id.equals(rejected.id)) next = bundledPatch;
                if (next != null && !next.id.equals(rejected.id)) {
                    activePatch = next;
                    // A fresh document avoids retaining failed Canvas hooks or prior DOM state.
                    // Do not use loadHome(): it would reset the two-candidate retry bound.
                    beginLoading();
                    status.setText("한국어 패치 검증 실패\n이전 또는 번들 패치로 한 번 다시 확인 중…");
                    web.loadUrl(HOME);
                    return;
                }
            }
        }
        diagnostics = "패치 검증 실패 (DOM / Canvas)";
        fail("한국어 패치의 DOM / Canvas 준비 상태를 확인하지 못했습니다. 게임 조작을 차단했습니다.");
    }

    private static String safeVersion(String value) {
        return value != null && value.matches("[A-Za-z0-9._+\\-]{1,64}") ? value : "unknown";
    }

    private static String localeStateText(String state, String version) {
        if ("staged".equals(state)) return "한국어 " + safeVersion(version) + ": 다음 불러오기에 적용 예정";
        if ("up-to-date".equals(state)) return "한국어 업데이트 확인 완료: 새 패치 없음 (최근 확인 기준)";
        if ("rejected".equals(state)) return "한국어 업데이트가 거부되었습니다. 검증된 캐시/번들을 유지합니다.";
        if ("unavailable".equals(state)) return "한국어 업데이트 확인 불가: 캐시/번들로 계속합니다.";
        if ("invalid-response".equals(state)) return "한국어 업데이트 응답 검증 실패: 캐시/번들을 유지합니다.";
        if ("storage-error".equals(state)) return "한국어 업데이트 저장 실패: 기존 캐시/번들을 유지합니다.";
        return "한국어 업데이트 확인 실패: 캐시/번들로 계속합니다.";
    }

    private void checkUpdates(boolean force) {
        if (destroyed || updateCheckRunning) return;
        long now = SystemClock.elapsedRealtime();
        if (!force && lastUpdateCheck != 0 && now - lastUpdateCheck < CHECK_INTERVAL_MS) return;
        lastUpdateCheck = now;
        updateCheckRunning = true;
        localeUpdateStatus = updater == null ? "한국어 캐시 사용 불가: 번들 패치를 사용합니다." : "한국어 업데이트 확인 중…";
        apkUpdateStatus = "앱 업데이트 확인 중…";
        final PatchUpdater checker = updater;
        final String loadedVersion = activePatch != null ? activePatch.version : bundledPatch != null ? bundledPatch.version : null;
        Thread worker = new Thread(() -> {
            String localeText = "한국어 캐시 사용 불가: 번들 패치를 사용합니다.";
            if (checker != null) {
                try {
                    PatchUpdater.CheckResult result = checker.checkForUpdate();
                    localeText = localeStateText(result.state, result.availableVersion);
                    if ("up-to-date".equals(result.state) && loadedVersion != null) {
                        PatchUpdater.Patch pending = checker.select();
                        if (PatchUpdater.compareVersions(pending.version, loadedVersion) > 0)
                            localeText = "한국어 " + safeVersion(pending.version) + ": 다음 불러오기에 적용 예정";
                    }
                } catch (Exception ignored) {
                    localeText = "한국어 업데이트 확인 실패: 캐시/번들로 계속합니다.";
                }
            }
            AppUpdateChecker.Info apk = null;
            String apkText;
            try {
                apk = AppUpdateChecker.check(VERSION_CODE);
                apkText = apk.newer && apk.versionCode > VERSION_CODE
                        ? "새 APK " + safeVersion(apk.versionName) + " 사용 가능: 앱 업데이트 메뉴에서 다운로드"
                        : "새 APK 없음 (최근 확인 기준)";
            } catch (Exception ignored) { apkText = "앱 업데이트 확인 실패. 최신 버전 여부를 알 수 없습니다."; }
            final String localeResult = localeText;
            final String apkResult = apkText;
            final AppUpdateChecker.Info apkInfo = apk;
            handler.post(() -> {
                if (destroyed) return;
                updateCheckRunning = false;
                localeUpdateStatus = localeResult;
                apkUpdateStatus = apkResult;
                appUpdateInfo = apkInfo;
                // Status only: never reload, replace activePatch, or show a dialog mid-game.
            });
        }, "psko-update-check");
        worker.setDaemon(true);
        worker.start();
    }

    private void showAppUpdates() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this).setTitle("앱 업데이트")
                .setMessage("설치된 APK: " + VERSION + " (" + VERSION_CODE + ")\n\n"
                        + apkUpdateStatus + "\n\n" + localeUpdateStatus
                        + "\n\n한국어 패치는 다음 페이지 불러오기에 적용됩니다. APK는 별도 업데이트입니다."
                        + " 확인 중이라면 잠시 후 메뉴를 다시 열어 주세요. 자동 설치하지 않습니다.")
                .setNegativeButton("닫기", null)
                .setNeutralButton("지금 확인", (d, w) -> {
                    checkUpdates(true);
                    showAppUpdates();
                });
        if (appUpdateInfo != null && appUpdateInfo.newer && appUpdateInfo.versionCode > VERSION_CODE)
            builder.setPositiveButton("APK 다운로드", (d, w) -> confirmApkDownload());
        trackDialog(builder.create());
    }

    private void confirmApkDownload() {
        if (appUpdateInfo == null || !appUpdateInfo.newer || appUpdateInfo.versionCode <= VERSION_CODE) {
            showAppUpdates();
            return;
        }
        final int downloadCode = appUpdateInfo.versionCode;
        trackDialog(new AlertDialog.Builder(this).setTitle("브라우저에서 APK를 다운로드할까요?")
                .setMessage("GuenohPark/pokesurvivor GitHub의 고정 테스트 APK 링크를 외부 브라우저에서 엽니다."
                        + " 다운로드 및 설치는 직접 진행해야 합니다. 앱은 APK를 설치하지 않습니다.")
                .setNegativeButton("취소", null)
                .setPositiveButton("브라우저 열기", (d, w) -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL + "?v=" + downloadCode));
                        intent.addCategory(Intent.CATEGORY_BROWSABLE);
                        startActivity(intent);
                    } catch (ActivityNotFoundException | SecurityException ignored) {
                        Toast.makeText(this, "열 수 있는 브라우저가 없습니다.", Toast.LENGTH_LONG).show();
                    }
                }).create());
    }

    private void trackDialog(AlertDialog dialog) {
        activeDialog = dialog;
        applySuspension();
        dialog.setOnDismissListener(d -> {
            if (activeDialog == dialog) { activeDialog = null; applySuspension(); immersive(); }
        });
        dialog.show();
    }

    private void showMenu() {
        if (destroyed || isFinishing() || activeDialog != null) return;
        AlertDialog d = new AlertDialog.Builder(this)
                .setTitle("비공식 한국어 테스트")
                .setItems(new String[]{"계속", "다시 불러오기", "앱 정보 / 진단", "앱 업데이트", "종료"}, (dialog, which) -> {
                    if (which == 1) confirmReload();
                    else if (which == 2) showAbout();
                    else if (which == 3) showAppUpdates();
                    else if (which == 4) confirmExit();
                }).create();
        trackDialog(d);
    }

    private void confirmReload() {
        trackDialog(new AlertDialog.Builder(this).setTitle("게임을 다시 불러올까요?")
                .setMessage("진행 중인 플레이가 사라질 수 있습니다. 로그인 및 저장 데이터는 삭제하지 않습니다.")
                .setNegativeButton("취소", null).setPositiveButton("다시 불러오기", (d, w) -> loadHome()).create());
    }

    private void showAbout() {
        trackDialog(new AlertDialog.Builder(this).setTitle("PokeSurvivor KO · " + VERSION)
                .setMessage("비공식 테스트 앱입니다. 공식 게임 운영자 또는 Pokémon 권리자와 무관합니다.\n\n"
                        + "공식 게임: https://pokesurvivor.com/\nAPK " + VERSION + "와 한국어 패치 버전은 별개입니다.\n"
                        + "번들 패치와 GitHub 한국어 자동 업데이트를 사용합니다. 캐시된 패치는 오프라인에서도 재사용하지만 게임은 온라인 서비스입니다.\n"
                        + "새 패치는 다음 불러오기에만 적용하며 플레이 중 교체하지 않습니다.\n\n"
                        + localeUpdateStatus + "\n" + apkUpdateStatus + "\n\n"
                        + diagnostics + "\n글꼴 진단은 실제 렌더링 품질을 보장하지 않습니다.\n\n"
                        + "로그인/게임 변경에 따라 번역이 누락될 수 있습니다. Google 로그인과 팝업 로그인은 지원을 보장하지 않습니다.\n"
                        + "메뉴/백그라운드에서는 WebView 타이머를 일시 중지합니다. 게임 서버·오디오·진행 상태의 완전한 일시 정지는 보장하지 않습니다.\n"
                        + "뒤로 가기: 메뉴. 사이트 뒤로 가기는 제공하지 않습니다.\n\n"
                        + "계정 정보는 진단에 수집하지 않으며 앱 시작 시 저장소를 지우지 않습니다.")
                .setNeutralButton("라이선스 / 출처", (d, w) -> showLicenses())
                .setPositiveButton("확인", null).create());
    }

    private void showLicenses() {
        final String[] names = {"앱 정보", "제3자 고지", "패치 라이선스", "게임 라이선스", "Galmuri 글꼴", "PokéAPI"};
        final String[] paths = {"ABOUT.txt", "THIRD-PARTY-NOTICES.md", "LICENSE",
                "licenses/GAME-LICENSE-NONCOMMERCIAL.md", "licenses/Galmuri-LICENSE.txt", "licenses/PokeAPI-LICENSE.md"};
        trackDialog(new AlertDialog.Builder(this).setTitle("라이선스 / 출처")
                .setItems(names, (d, which) -> showLicenseText(names[which], paths[which])).create());
    }

    private void showLicenseText(String title, String assetPath) {
        String text;
        try (InputStream input = getAssets().open(assetPath);
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                if (output.size() > 512 * 1024) throw new IllegalStateException();
            }
            text = new String(output.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception ignored) { text = "번들 라이선스 파일을 읽을 수 없습니다."; }
        TextView body = new TextView(this);
        body.setText(text); body.setTextIsSelectable(true);
        body.setPadding(dp(20), dp(12), dp(20), dp(12));
        android.widget.ScrollView scroll = new android.widget.ScrollView(this);
        scroll.addView(body);
        trackDialog(new AlertDialog.Builder(this).setTitle(title).setView(scroll)
                .setPositiveButton("닫기", null).create());
    }

    private void confirmExit() {
        trackDialog(new AlertDialog.Builder(this).setTitle("앱을 종료할까요?")
                .setMessage("진행 중인 플레이는 보존되지 않을 수 있습니다.")
                .setNegativeButton("취소", null).setPositiveButton("종료", (d, w) -> finish()).create());
    }

    private void showExternalPrompt(final String url) {
        if (activeDialog != null) return;
        // Never display or log the full URL: it may contain authentication parameters.
        trackDialog(new AlertDialog.Builder(this).setTitle("외부 브라우저에서 열까요?")
                .setMessage("게임을 떠나 외부 HTTPS 링크를 엽니다. 앱의 한국어 패치는 적용되지 않습니다.")
                .setNegativeButton("취소", null).setPositiveButton("브라우저 열기", (d, w) -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addCategory(Intent.CATEGORY_BROWSABLE);
                        startActivity(intent);
                    } catch (ActivityNotFoundException | SecurityException ignored) {
                        Toast.makeText(this, "열 수 있는 브라우저가 없습니다.", Toast.LENGTH_LONG).show();
                    }
                }).create());
    }

    private void applySuspension() {
        if (web == null) return;
        if (!resumed || activeDialog != null) {
            web.onPause(); web.pauseTimers();
        } else {
            web.resumeTimers(); web.onResume();
        }
    }

    @Override protected void onResume() {
        super.onResume(); resumed = true;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applySuspension(); immersive();
        checkUpdates(false);
    }
    @Override protected void onPause() {
        resumed = false;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applySuspension();
        CookieManager.getInstance().flush();
        super.onPause();
    }
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus && activeDialog == null) immersive();
    }
    @Override public void onBackPressed() { showMenu(); }
    @Override protected void onDestroy() {
        destroyed = true; generation++;
        handler.removeCallbacksAndMessages(null);
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null)
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        if (activeDialog != null) activeDialog.dismiss();
        if (web != null) {
            web.stopLoading();
            // pauseTimers is process-global: do not leave a surviving WebView frozen.
            web.resumeTimers();
            root.removeView(web); web.destroy(); web = null;
        }
        super.onDestroy();
    }
}
