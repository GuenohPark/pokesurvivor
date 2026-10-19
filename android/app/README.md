# PokeSurvivor KO Android test shell

Native Java/platform APIs only. Platform-only source; build with the root build.cjs script. No Gradle dependencies.

- Package: io.github.guenohpark.pokesurvivorko
- Version: 0.1.1-test / 2; min SDK 23, target SDK 35. Compile against SDK 35.
- Entry: src/main/java/io/github/guenohpark/pokesurvivorko/MainActivity.java
- Manifest includes INTERNET only. It disables backup and cleartext traffic.
- src/main/assets includes the bundled patch.js and license assets.

## Packaging contract

Manual aapt2/javac/d8/apksigner is expected. The manifest package is used for resources;
Java intentionally does not reference generated R. Package all src/main/res and src/main/assets.
Use Java 8 or newer source support for lambdas and a matching d8 pipeline. There is no
AndroidX or JavaScript/native bridge.

The bundled patch is executed with WebView.evaluateJavascript inside an origin-checked
function body. A second evaluation verifies window.__PSKO and __PSKO_ANDROID_STATUS,
status.ok === true, matching nonempty documentElement.dataset.pskoDom/status.domVersion,
and dataset.pskoCanvas/status.canvasMode === 'native-main'. The JSON-string callback is
decoded with JSONTokener then JSONObject. Only a constrained version token, fixed canvas
mode, and font scale (90/100/unknown) become native diagnostics. Native errors never include
URLs, page exception strings, account information, or WebView console messages.

The WebView remains invisible and touch-blocked until verification succeeds. Failures and
60-second load timeouts show native retry UI. A missing patch fails closed. Fixed GitHub locale checks download only staged candidates, never hot-swap the active page.
Private caches retain previous known-good code and fall back to the bundled patch offline. The game itself, its normal resources, and online functionality still need network.

## Security and navigation

Only exact HTTPS pokesurvivor.com or www.pokesurvivor.com (default/443 port, no userinfo)
can navigate the main WebView. The same restriction guards injection. External HTTPS main
frame links require a WebView user gesture plus native confirmation and then use ACTION_VIEW
in the user's external browser. API 23 uses a recent touch plus exact link hit-test fallback;
some unusual link types may be conservatively blocked. Non-HTTPS/deep-link schemes are blocked.
HTTPS/about:blank subframes are allowed for official game integrations such as Firebase
Auth helpers. SOP remains enabled and native patch injection is main-frame-only. On API23,
the legacy callback cannot identify frames: background HTTPS loads are allowed, while an
untrusted main frame is stopped by onPageStarted and the execution-time origin gate.
Third-party HTTPS subresources used by the official game are not categorically blocked. File/content access, mixed content,
file chooser, geolocation and runtime permission requests are disabled/denied. No TLS bypass,
custom UA, arbitrary remote code endpoint, downloaded APK installation, or JS bridge is provided.
WebView Safe Browsing is enabled on supported providers/API levels. OS/provider protection
may be unavailable on old devices. Popup WebViews and downloads are not supported.

Cookies and DOM storage persist; third-party cookies are disabled. Nothing clears app storage
at startup or update. Uninstall/OS Clear storage removes it. Export/backup is intentionally disabled.

## Interaction and known limitations

The activity is immersive, with transient bars and insets/cutout/IME padding. Back opens the
native menu instead of navigating browser history. On gesture-navigation devices, swipe from
the edge to reveal Back. About includes test labeling, patch diagnostics, and native scrolling
license text from bundled assets. Reload and exit require confirmation.

Menu/background use WebView.onPause + pauseTimers; foreground dismissal resumes them.
Screen wake lock flag exists only while resumed. Game state cannot be reliably inferred from
its public page contract, so the shell deliberately does not dispatch Escape, which might
unpause or otherwise toggle an unknown game state. WebView timer suspension is best-effort,
not a verified in-game pause: networking, audio, workers, or server-side progression may continue.
Process death/recreation loads the homepage, not a guaranteed in-progress game restore.
Google/provider login and popup OAuth may be blocked by provider policy; support is NOT
claimed and user-agent spoofing is not used. Opening an OAuth link externally does not promise
that its session returns to this WebView. A renderer crash requires restarting the app.

Translation coverage and canvas/font readiness flags are not a visual gameplay test. Game
updates can break the patch. The fixed app version is distinct from patch version 0.4.3.
Compilation, signature/alignment checks and origin-policy tests do not prove Android runtime behavior.
Test on-device before broader distribution: cold load, airplane-mode retry, patch failure, TLS,
external links, Android 23/35 inset/back behavior, pause/resume, license views, and persistence.

This is an unofficial noncommercial test wrapper, not an official Pokémon product. See bundled
ABOUT.txt, THIRD-PARTY-NOTICES.md, LICENSE and licenses/ for game/data/font terms and sources.

## Automatic updates (0.1.1-test)

PatchUpdater uses only fixed HTTPS GitHub metadata/bundle endpoints; namespace, version and byte limits are rechecked. Downloads stage for a later page load, runtime acknowledgement promotes known-good code, and rejected candidates fall back. MainActivity keeps one process-wide cache owner across Activity recreation. APK availability is separate: metadata SHA is parsed, but the browser downloads the APK and Android/user handle installation. It is not checksum-verified auto-installation.
