package io.github.guenohpark.pokesurvivorko;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import javax.net.ssl.HttpsURLConnection;

/** Availability only: never downloads or installs an APK, and never reads WebView cookies. */
public final class AppUpdateChecker {
    public static final String META_URL = "https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android.meta.properties";
    public static final String APK_URL = "https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-test.apk";
    private static final int LIMIT = 16384;
    private AppUpdateChecker() {}

    public static final class Info {
        public final int versionCode;
        public final String versionName, sha256;
        public final boolean newer;
        private Info(int code, String name, String hash, int installed) {
            versionCode = code; versionName = name; sha256 = hash; newer = code > installed;
        }
    }

    public static Info check(int installedCode) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(META_URL + "?psko_android=" + System.currentTimeMillis()).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setUseCaches(false);
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setRequestProperty("User-Agent", "PSKO-Android-Test/0.1.1");
        try {
            if (connection.getResponseCode() != 200 || connection.getContentLength() > LIMIT) throw new IOException("app-metadata-unavailable");
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > LIMIT) throw new IOException("app-metadata-too-large");
                    output.write(buffer, 0, count);
                }
                return parse(output.toByteArray(), installedCode);
            }
        } finally { connection.disconnect(); }
    }

    public static Info parse(byte[] bytes, int installedCode) throws IOException {
        if (bytes == null || bytes.length == 0 || bytes.length > LIMIT) throw new IOException("invalid-app-metadata");
        String text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        if (text.indexOf('\0') >= 0 || text.trim().startsWith("<")) throw new IOException("invalid-app-metadata");
        Properties values = new Properties();
        try { values.load(new StringReader(text)); } catch (IllegalArgumentException invalid) { throw new IOException("invalid-app-metadata"); }
        String code = values.getProperty("versionCode", ""), name = values.getProperty("versionName", ""), hash = values.getProperty("sha256", "");
        if (!code.matches("[1-9][0-9]{0,8}") || !name.matches("[A-Za-z0-9._+\\-]{1,64}") || !hash.matches("[a-fA-F0-9]{64}")) throw new IOException("invalid-app-metadata");
        try { return new Info(Integer.parseInt(code), name, hash.toLowerCase(java.util.Locale.ROOT), installedCode); }
        catch (NumberFormatException invalid) { throw new IOException("invalid-app-metadata"); }
    }
}
