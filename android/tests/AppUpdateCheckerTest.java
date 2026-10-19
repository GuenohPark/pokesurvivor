import io.github.guenohpark.pokesurvivorko.AppUpdateChecker;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class AppUpdateCheckerTest {
    private static String hash() { char[] c = new char[64]; Arrays.fill(c, 'a'); return new String(c); }
    private static AppUpdateChecker.Info parse(String text, int current) throws IOException { return AppUpdateChecker.parse(text.getBytes(StandardCharsets.UTF_8), current); }
    private static void reject(String text) throws Exception { try { parse(text, 2); throw new AssertionError("Invalid app metadata accepted"); } catch (IOException expected) {} }
    public static void main(String[] args) throws Exception {
        String current = "versionCode=2\nversionName=0.1.1-test\nsha256=" + hash() + "\n";
        if (parse(current, 2).newer) throw new AssertionError("Same version considered newer");
        if (!parse(current, 1).newer) throw new AssertionError("New app version missed");
        if (parse(current, 3).newer) throw new AssertionError("Downgrade offered");
        reject(""); reject("<html>error</html>"); reject(current.replace("versionCode=2", "versionCode=-1"));
        reject(current.replace("0.1.1-test", "bad version")); reject(current.replace(hash(), "short"));
        reject(current.replace("versionCode=2", "versionCode=999999999999999999999"));
        reject(current + "\0");
        try { AppUpdateChecker.parse(new byte[16385], 2); throw new AssertionError("Oversize accepted"); } catch (IOException expected) {}
        try { AppUpdateChecker.parse(new byte[]{(byte)0xff}, 2); throw new AssertionError("Malformed UTF-8 accepted"); } catch (IOException expected) {}
        parse(current + "downloadUrl=https://untrusted.invalid/evil.apk\n", 2);
        if (!AppUpdateChecker.APK_URL.equals("https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-android-test.apk")) throw new AssertionError("Download URL is not fixed");
        System.out.println("APK availability metadata: 14 checks passed. No APK auto-install permission or behavior.");
    }
}
