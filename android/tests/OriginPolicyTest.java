import java.lang.reflect.Method;

public final class OriginPolicyTest {
    public static void main(String[] args) throws Exception {
        Class<?> activity = Class.forName("io.github.guenohpark.pokesurvivorko.MainActivity");
        Method trusted = activity.getDeclaredMethod("isTrusted", String.class);
        trusted.setAccessible(true);
        String[] allowed = {"https://pokesurvivor.com/", "https://www.pokesurvivor.com/", "https://pokesurvivor.com:443/dev.html", "HTTPS://POKESURVIVOR.COM/path"};
        String[] denied = {null, "", "http://pokesurvivor.com/", "https://pokesurvivor.com:444/", "https://pokesurvivor.com.evil.example/", "https://pokesurvivor.com@evil.example/", "https://user@pokesurvivor.com/", "https://pokesurvivor.com%2eevil.example/", "file:///data/local/", "content://private/", "javascript:alert(1)", "data:text/html,hi", "/relative", "https://pokesurvivor.com\\@evil.example/"};
        for (String value : allowed) if (!Boolean.TRUE.equals(trusted.invoke(null, value))) throw new AssertionError("Trusted official URL rejected");
        for (String value : denied) if (!Boolean.FALSE.equals(trusted.invoke(null, value))) throw new AssertionError("Untrusted URL accepted");
        System.out.println("Origin policy: " + (allowed.length + denied.length) + " cases passed. No Android runtime/UI was tested.");
    }
}
