package io.github.guenohpark.pokesurvivorko;

import java.io.*;
import java.net.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.security.*;
import java.util.*;
import java.util.regex.*;

/** Downloads only stage code. The caller must acknowledge actual runtime success. */
public final class PatchUpdater {
    public static final String BASE="https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/";
    public static final String META_URL=BASE+"pokesurvivor-ko-menu.meta.js";
    public static final String BUNDLE_URL=BASE+"pokesurvivor-ko-menu.user.js";
    public static final int META_LIMIT=32768, BUNDLE_LIMIT=8*1024*1024;
    private static final String NAMESPACE="pokesurvivor-ko-local-test";
    private static final Pattern VERSION=Pattern.compile("[0-9]+(?:\\.[0-9]+)*");
    private static final Pattern START=Pattern.compile("(?m)^[ \\t]*//[ \\t]*==UserScript==[ \\t]*\\r?$");
    private static final Pattern END=Pattern.compile("(?m)^[ \\t]*//[ \\t]*==/UserScript==[ \\t]*\\r?$");
    private static final Pattern FIELD=Pattern.compile("^[ \\t]*//[ \\t]*@(version|namespace)[ \\t]+([^\\r\\n]+?)[ \\t]*$");
    private final File directory;
    private final Fetcher fetcher;
    private final Patch bundled;
    private final Set<String> rejected=new LinkedHashSet<String>();

    public interface Fetcher { byte[] get(String url,int maxBytes) throws IOException; }
    public static final class Patch {
        public final String script,version,id,source;
        public final boolean bundled;
        private Patch(String script,String version,String id,String source,boolean bundled) {
            this.script=script;this.version=version;this.id=id;this.source=source;this.bundled=bundled;
        }
    }
    public static final class CheckResult {
        public final String state,availableVersion;
        private CheckResult(String state,String version) { this.state=state;this.availableVersion=version; }
    }
    private static final class Invalid extends IOException { Invalid(){super("Invalid patch response");} }
    /** Validated APK fallback even when the private cache cannot be created. */
    public static Patch bundled(String script)throws IOException {
        if(script==null)throw new IOException("Missing bundled patch");
        return parse(script.getBytes(StandardCharsets.UTF_8),BUNDLE_LIMIT,"bundled",true,true);
    }
    public PatchUpdater(File directory,String bundledScript) throws IOException {
        this(directory,bundledScript,new HttpFetcher());
    }
    public PatchUpdater(File directory,String bundledScript,Fetcher fetcher) throws IOException {
        if(directory==null||bundledScript==null||fetcher==null)throw new IOException("Missing updater input");
        this.directory=directory;this.fetcher=fetcher;
        bundled=parse(bundledScript.getBytes(StandardCharsets.UTF_8),BUNDLE_LIMIT,"bundled",true,true);
        if(!directory.isDirectory()&&!directory.mkdirs()&&!directory.isDirectory())throw new IOException("Cache directory unavailable");
        readRejected();
    }
    /** Unbounded-width numeric segments, ignoring leading and trailing zeroes. */
    public static int compareVersions(String a,String b) {
        if(!validVersion(a)||!validVersion(b))throw new IllegalArgumentException("Malformed version");
        String[] aa=a.split("\\."),bb=b.split("\\.");
        for(int i=0;i<Math.max(aa.length,bb.length);i++) {
            String x=i<aa.length?segment(aa[i]):"0",y=i<bb.length?segment(bb[i]):"0";
            if(x.length()!=y.length())return x.length()<y.length()?-1:1;
            int c=x.compareTo(y);if(c!=0)return c<0?-1:1;
        }
        return 0;
    }
    private static String segment(String s){int i=0;while(i<s.length()-1&&s.charAt(i)=='0')i++;return s.substring(i);}
    private static boolean validVersion(String v){return v!=null&&v.length()<=128&&VERSION.matcher(v).matches();}
    private static String versionKey(String v) {
        String[] parts=v.split("\\.");int end=parts.length;
        while(end>1&&segment(parts[end-1]).equals("0"))end--;
        StringBuilder out=new StringBuilder();
        for(int i=0;i<end;i++){if(i>0)out.append('.');out.append(segment(parts[i]));}return out.toString();
    }
    public synchronized Patch select() {
        Patch best=bundled;
        for(String source:new String[]{"current","staged","previous"}) {
            Patch p=readPatch(source);
            if(p!=null&&!rejected.contains(versionKey(p.version))&&compareVersions(p.version,bundled.version)>=0
                    &&(compareVersions(p.version,best.version)>0||(best.bundled&&compareVersions(p.version,best.version)==0)))best=p;
        }
        return best;
    }
    public synchronized void markGood(Patch p)throws IOException {
        if(p==null||p.bundled)return;
        Patch actual=matching(p);
        if(actual==null||rejected.contains(versionKey(p.version))||compareVersions(p.version,bundled.version)<0)return;
        Patch current=readPatch("current");
        if(current!=null&&current.id.equals(p.id))return;
        if(current!=null&&!rejected.contains(versionKey(current.version))&&compareVersions(current.version,p.version)>0)return;
        if(current!=null&&!rejected.contains(versionKey(current.version)))atomicWrite(file("previous"),current.script.getBytes(StandardCharsets.UTF_8));
        atomicWrite(file("current"),actual.script.getBytes(StandardCharsets.UTF_8));
        deleteMatching("staged",p.id);
    }
    public synchronized void markBad(Patch p)throws IOException {
        if(p==null||p.bundled||matching(p)==null)return;
        rejected.add(versionKey(p.version));
        StringBuilder out=new StringBuilder();for(String v:rejected)out.append(v).append('\n');
        byte[] bytes=out.toString().getBytes(StandardCharsets.UTF_8);
        if(bytes.length>META_LIMIT)throw new IOException("Rejection ledger full");
        atomicWrite(new File(directory,"rejected.txt"),bytes);
        deleteMatching("staged",p.id);deleteMatching("current",p.id);
    }
    /** Run on caller's background thread. No network call holds the bookkeeping lock. */
    public CheckResult checkForUpdate() {
        String version=null;
        try {
            Patch meta=parse(fetcher.get(META_URL,META_LIMIT),META_LIMIT,"metadata",false,false);
            version=meta.version;
            synchronized(this) {
                if(rejected.contains(versionKey(version)))return result("rejected",version);
                if(compareVersions(version,select().version)<=0)return result("up-to-date",version);
            }
            Patch download=parse(fetcher.get(BUNDLE_URL,BUNDLE_LIMIT),BUNDLE_LIMIT,"staged",false,true);
            if(!version.equals(download.version))return result("invalid-response",version);
            synchronized(this) {
                if(rejected.contains(versionKey(version)))return result("rejected",version);
                if(compareVersions(version,select().version)<=0)return result("up-to-date",version);
                try{atomicWrite(file("staged"),download.script.getBytes(StandardCharsets.UTF_8));}
                catch(IOException e){return result("storage-error",version);}
            }
            return result("staged",version);
        }catch(Invalid e){return result("invalid-response",version);}
        catch(IOException e){return result("unavailable",version);}
        catch(RuntimeException e){return result("unavailable",version);}
    }
    private static CheckResult result(String state,String version){return new CheckResult(state,version);}
    private File file(String source){return new File(directory,source+".js");}
    private Patch matching(Patch p) {
        for(String source:new String[]{"current","staged","previous"}){
            Patch found=readPatch(source);if(found!=null&&found.id.equals(p.id))return found;
        }return null;
    }
    private void deleteMatching(String source,String id)throws IOException {
        Patch p=readPatch(source);
        if(p!=null&&p.id.equals(id)&&!file(source).delete())throw new IOException("Cache cleanup failed");
    }
    private Patch readPatch(String source) {
        try{return parse(readBytes(file(source),BUNDLE_LIMIT),BUNDLE_LIMIT,source,false,true);}
        catch(IOException e){return null;}catch(RuntimeException e){return null;}
    }
    private void readRejected() {
        try{
            String s=decode(readBytes(new File(directory,"rejected.txt"),META_LIMIT));
            for(String line:s.split("\n"))if(validVersion(line))rejected.add(versionKey(line));
        }catch(IOException ignored){ }
    }
    private static byte[] readBytes(File file,int cap)throws IOException {
        if(file.length()>cap||!file.isFile())throw new IOException("Cache unavailable");
        InputStream in=new FileInputStream(file);
        try{return boundedRead(in,cap);}finally{in.close();}
    }
    private static byte[] boundedRead(InputStream in,int cap)throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream(Math.min(cap,8192));byte[] buffer=new byte[8192];int n;
        while((n=in.read(buffer))!=-1){if(n>cap-out.size())throw new Invalid();out.write(buffer,0,n);}
        return out.toByteArray();
    }
    private void atomicWrite(File destination,byte[] bytes)throws IOException {
        File temporary=File.createTempFile("patch-",".tmp",directory);
        try{
            FileOutputStream out=new FileOutputStream(temporary);
            try{out.write(bytes);out.flush();out.getFD().sync();}finally{out.close();}
            // Android/Linux replaces atomically. Never delete the destination to force a rename.
            if(!temporary.renameTo(destination))throw new IOException("Cache commit failed");
        }finally{if(temporary.exists())temporary.delete();}
    }
    private static String decode(byte[] bytes)throws Invalid {
        try{return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();}
        catch(CharacterCodingException e){throw new Invalid();}
    }
    private static Patch parse(byte[] bytes,int cap,String source,boolean bundled,boolean bodyRequired)throws IOException {
        if(bytes==null||bytes.length==0||bytes.length>cap)throw new Invalid();
        String script=decode(bytes);
        if(script.indexOf('\0')>=0||script.trim().length()==0||script.trim().startsWith("<"))throw new Invalid();
        Matcher start=START.matcher(script),end=END.matcher(script);
        if(!start.find())throw new Invalid();int begin=start.end();
        String prefix=script.substring(0,start.start()).replace("\uFEFF","").trim();
        if(!bundled&&!prefix.isEmpty())throw new Invalid();
        if(start.find()||!end.find()||end.start()<begin)throw new Invalid();
        int finish=end.end();String header=script.substring(begin,end.start());
        if(end.find())throw new Invalid();
        String version=null,namespace=null;
        for(String line:header.split("\n")) {
            Matcher field=FIELD.matcher(line.replace("\r",""));if(!field.matches())continue;
            if(field.group(1).equals("version")){if(version!=null)throw new Invalid();version=field.group(2).trim();}
            else{if(namespace!=null)throw new Invalid();namespace=field.group(2).trim();}
        }
        if(!validVersion(version)||!NAMESPACE.equals(namespace))throw new Invalid();
        String body=script.substring(finish).trim();
        if(body.startsWith("<")||(bodyRequired&&body.isEmpty()))throw new Invalid();
        String id;
        try{
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder hex=new StringBuilder();
            for(byte b:hash)hex.append(Character.forDigit((b>>>4)&15,16)).append(Character.forDigit(b&15,16));
            id=hex.toString();
        }catch(NoSuchAlgorithmException e){throw new IOException("SHA-256 unavailable");}
        return new Patch(script,version,id,source,bundled);
    }
    private static final class HttpFetcher implements Fetcher {
        public byte[] get(String url,int maxBytes)throws IOException {
            if(!META_URL.equals(url)&&!BUNDLE_URL.equals(url))throw new IOException("Endpoint denied");
            URL endpoint=new URL(url);
            if(!"https".equals(endpoint.getProtocol()))throw new IOException("HTTPS required");
            HttpURLConnection c=(HttpURLConnection)endpoint.openConnection();
            c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setUseCaches(false);
            c.setRequestProperty("Accept","text/plain");
            c.setRequestProperty("Cache-Control","no-cache");
            // No WebView cookie manager, credentials, or request headers are consulted.
            c.setRequestProperty("Cookie","");c.setRequestProperty("Cookie2","");c.setRequestProperty("Authorization","");
            try{
                if(c.getResponseCode()!=200)throw new IOException("Fetch failed");
                if(c.getContentLength()>maxBytes)throw new Invalid();
                InputStream in=c.getInputStream();try{return boundedRead(in,maxBytes);}finally{in.close();}
            }finally{c.disconnect();}
        }
    }
    /** Static function body insertion, not dynamic evaluation. Final expression is the native ack. */
    public static String wrap(Patch p) {
        if(p==null)throw new IllegalArgumentException("Missing patch");
        String v=p.version;
        return "(function(){\n'use strict';\n"+
            "var status={ok:false,version:'"+v+"',domVersion:'',canvasMode:'',fontScale:'',errorCode:''};\n"+
            "globalThis.__PSKO_ANDROID_STATUS=status;\ntry{\n"+
            "if(location.protocol!=='https:'||(location.hostname!=='pokesurvivor.com'&&location.hostname!=='www.pokesurvivor.com')||(location.port!==''&&location.port!=='443')||location.username||location.password){status.errorCode='wrong-origin';return;}\n"+
            "globalThis.__PSKO=undefined;\n(function(){\n"+p.script+"\n;}).call(globalThis);\n"+
            "var api=globalThis.__PSKO;\nif(!api||api.version!=='"+v+"'){status.errorCode='runtime-version-mismatch';return;}\n"+
            "var installed=api.installCanvas();\nvar root=document.documentElement;var font=document.getElementById('ps-ko-pixel-font');\n"+
            "status.domVersion=root.dataset.pskoDom||'';status.canvasMode=root.dataset.pskoCanvas||'';status.fontScale=font?font.dataset.pskoKoreanFontScale||'':'';\n"+
            "if(status.domVersion!=='"+v+"'){status.errorCode='dom-version-mismatch';return;}\n"+
            "status.ok=!!(installed&&installed.ok===true);if(!status.ok)status.errorCode='canvas-install-failed';\n"+
            "}catch(error){status.ok=false;status.errorCode='patch-execution-failed';}\n"+
            "finally{globalThis.__PSKO_ANDROID_STATUS=status;}\n})();\nJSON.stringify(globalThis.__PSKO_ANDROID_STATUS);";
    }
}
