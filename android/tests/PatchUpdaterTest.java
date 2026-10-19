import io.github.guenohpark.pokesurvivorko.PatchUpdater;
import io.github.guenohpark.pokesurvivorko.PatchUpdater.Patch;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Host-JDK tests only: no network, Android framework, WebView or browser. */
public final class PatchUpdaterTest {
    static int cases;
    static final List<File> roots=new ArrayList<File>();
    static final String BUNDLED=script("0.4.3");
    static String meta(String v){return "// ==UserScript==\n// @version "+v+"\n// @namespace pokesurvivor-ko-local-test\n// @downloadURL https://evil.invalid/must-not-follow\n// ==/UserScript==\n";}
    static String script(String v){return meta(v)+"globalThis.__PSKO={version:'"+v+"',installCanvas:function(){return {ok:true};}};\n";}
    static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
    static final class FakeFetcher implements PatchUpdater.Fetcher {
        byte[] metadata,bundle; boolean offline;int metaCalls,bundleCalls;
        FakeFetcher(String v){metadata=bytes(meta(v));bundle=bytes(script(v));}
        public byte[] get(String url,int max)throws IOException {
            if(offline)throw new IOException("sensitive error must not escape");
            if(url.equals(PatchUpdater.META_URL)){check(max==32768,"metadata bound");metaCalls++;return metadata;}
            if(url.equals(PatchUpdater.BUNDLE_URL)){check(max==8*1024*1024,"bundle bound");bundleCalls++;return bundle;}
            throw new AssertionError("Unapproved URL");
        }
    }
    static File temp()throws IOException {File f=File.createTempFile("psko-test-","");if(!f.delete()||!f.mkdir())throw new IOException();roots.add(f);return f;}
    static void write(File f,byte[] b)throws IOException{FileOutputStream out=new FileOutputStream(f);try{out.write(b);}finally{out.close();}}
    static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    static void eq(Object a,Object b){check(Objects.equals(a,b),"Expected "+b+", got "+a);}
    static void done(String name){cases++;System.out.println("PASS "+name);}
    static void delete(File f){File[] all=f.listFiles();if(all!=null)for(File child:all)delete(child);f.delete();}
    static PatchUpdater updater(File d,FakeFetcher f)throws IOException{return new PatchUpdater(d,BUNDLED,f);}
    public static void main(String[] args)throws Exception {
        try{run(args);}finally{for(File d:roots)delete(d);}
        System.out.println("PatchUpdater: "+cases+" scenarios passed. Host JVM only; no Android runtime tested.");
    }
    static void run(String[] args)throws Exception {
        File d=temp();FakeFetcher f=new FakeFetcher("0.5.0");PatchUpdater u=updater(d,f);
        check(u.select().bundled,"initial bundle");eq(u.select().version,"0.4.3");
        eq(u.checkForUpdate().state,"staged");eq(u.select().source,"staged");
        check(!new File(d,"current.js").exists(),"download must not promote");
        eq(f.bundleCalls,1);done("initial and new download only stages");

        eq(u.checkForUpdate().state,"up-to-date");eq(f.bundleCalls,1);done("same version skips full download");
        Patch p5=u.select();u.markGood(p5);eq(u.select().source,"current");
        f.metadata=bytes(meta("0.6.0"));f.bundle=bytes(script("0.6.0"));eq(u.checkForUpdate().state,"staged");
        check(new File(d,"current.js").isFile(),"old current retained before ack");
        Patch p6=u.select();u.markGood(p6);eq(u.select().version,"0.6.0");
        check(new File(d,"previous.js").isFile(),"previous retained");done("promotion preserves previous good");

        u.markBad(u.select());eq(u.select().version,"0.5.0");eq(u.select().source,"previous");
        PatchUpdater restored=updater(d,f);eq(restored.select().version,"0.5.0");
        int calls=f.bundleCalls;eq(restored.checkForUpdate().state,"rejected");eq(calls,f.bundleCalls);
        done("bad current invalidation persists and falls back");

        FakeFetcher off=new FakeFetcher("0.7");off.offline=true;PatchUpdater empty=updater(temp(),off);
        eq(empty.checkForUpdate().state,"unavailable");check(empty.select().bundled,"offline bundle");done("offline without cache");
        PatchUpdater cached=updater(d,off);eq(cached.checkForUpdate().state,"unavailable");eq(cached.select().version,"0.5.0");done("offline preserves eligible cache");

        FakeFetcher low=new FakeFetcher("0.4.2");PatchUpdater lower=updater(temp(),low);
        eq(lower.checkForUpdate().state,"up-to-date");eq(low.bundleCalls,0);check(lower.select().bundled,"no downgrade below bundled");
        low.metadata=bytes(meta("0.4.9"));PatchUpdater high=updater(d,low);eq(high.checkForUpdate().state,"up-to-date");eq(low.bundleCalls,0);
        done("metadata cannot downgrade bundle or highest cache");

        FakeFetcher mismatch=new FakeFetcher("0.8");mismatch.bundle=bytes(script("0.7"));PatchUpdater m=updater(temp(),mismatch);
        eq(m.checkForUpdate().state,"invalid-response");check(m.select().bundled,"body mismatch fallback");done("metadata body version mismatch");

        FakeFetcher html=new FakeFetcher("0.8");html.metadata=bytes("<!doctype html><html>gateway error</html>");
        eq(updater(temp(),html).checkForUpdate().state,"invalid-response");eq(html.bundleCalls,0);
        html.metadata=bytes(meta("0.8"));html.bundle=bytes("<html>"+script("0.8")+"</html>");
        eq(updater(temp(),html).checkForUpdate().state,"invalid-response");
        html.bundle=bytes(meta("0.8")+"<html>not JavaScript</html>");
        eq(updater(temp(),html).checkForUpdate().state,"invalid-response");done("HTML metadata and bundle rejected");

        FakeFetcher ns=new FakeFetcher("0.8");ns.metadata=bytes(meta("0.8").replace("pokesurvivor-ko-local-test","wrong"));
        eq(updater(temp(),ns).checkForUpdate().state,"invalid-response");eq(ns.bundleCalls,0);
        ns.metadata=bytes(meta("0.8"));ns.bundle=bytes(script("0.8").replace("pokesurvivor-ko-local-test","wrong"));
        eq(updater(temp(),ns).checkForUpdate().state,"invalid-response");done("namespace mismatch in metadata or body");

        FakeFetcher huge=new FakeFetcher("0.8");huge.metadata=new byte[PatchUpdater.META_LIMIT+1];
        eq(updater(temp(),huge).checkForUpdate().state,"invalid-response");
        huge.metadata=bytes(meta("0.8"));huge.bundle=new byte[PatchUpdater.BUNDLE_LIMIT+1];
        eq(updater(temp(),huge).checkForUpdate().state,"invalid-response");done("oversize metadata and bundle checked independently of fetcher");

        for(byte[] invalid:new byte[][]{new byte[0],bytes(script("0.8")+"\0"),bytes(script("0.x")),new byte[]{(byte)0xc3,(byte)0x28},bytes(meta("0.8"))}) {
            FakeFetcher bad=new FakeFetcher("0.8");bad.bundle=invalid;eq(updater(temp(),bad).checkForUpdate().state,"invalid-response");
        }done("empty NUL malformed-version UTF8 and bodyless bundle rejected");

        File corrupt=temp();write(new File(corrupt,"current.js"),bytes("broken"));write(new File(corrupt,"previous.js"),bytes(script("0.3")));
        write(new File(corrupt,"staged.js"),bytes(script("0.8")+"\0"));
        check(updater(corrupt,off).select().bundled,"corrupt or downgraded cache ignored");done("all cache files revalidated");

        File staged=temp();FakeFetcher stagedF=new FakeFetcher("0.8");PatchUpdater stagedU=updater(staged,stagedF);
        stagedU.checkForUpdate();Patch rejected=stagedU.select();stagedU.markBad(rejected);check(stagedU.select().bundled,"bad stage falls back");
        eq(updater(staged,stagedF).checkForUpdate().state,"rejected");done("bad staged version not repeatedly downloaded");

        File io=temp();PatchUpdater ioU=updater(io,new FakeFetcher("0.8"));
        check(new File(io,"staged.js").mkdir(),"create rename obstruction");write(new File(io,"staged.js/keep"),bytes("x"));
        eq(ioU.checkForUpdate().state,"storage-error");check(ioU.select().bundled,"failed commit safe");
        File[] leftovers=io.listFiles();for(File item:leftovers)check(!item.getName().endsWith(".tmp"),"temporary cleaned");
        done("failing atomic rename leaves safe state");

        File promotion=temp();FakeFetcher pf=new FakeFetcher("0.5");PatchUpdater pu=updater(promotion,pf);pu.checkForUpdate();pu.markGood(pu.select());
        pf.metadata=bytes(meta("0.6"));pf.bundle=bytes(script("0.6"));pu.checkForUpdate();
        check(new File(promotion,"previous.js").mkdir(),"block backup");write(new File(promotion,"previous.js/keep"),bytes("x"));
        try{pu.markGood(pu.select());throw new AssertionError("promotion failure expected");}catch(IOException expected){}
        new File(promotion,"staged.js").delete();eq(pu.select().version,"0.5");done("backup IO failure never destroys current good");

        check(PatchUpdater.compareVersions("0.10","0.9")>0,"numeric compare");eq(PatchUpdater.compareVersions("01.2.0","1.02"),0);
        check(PatchUpdater.compareVersions("99999999999999999999","2")>0,"no integer overflow");
        for(String v:new String[]{"", "1..2", "-1", "1.beta", " 1", "1."})try{PatchUpdater.compareVersions(v,"1");throw new AssertionError("bad compare accepted");}catch(IllegalArgumentException expected){}
        done("numeric versions and malformed comparison");

        Patch fallback=PatchUpdater.bundled("/* APK wrapper */\n(function(){\n"+BUNDLED+"\n})();\n");
        String wrapped=PatchUpdater.wrap(fallback);
        check(!wrapped.contains("eval(")&&!wrapped.contains("new Function")&&!wrapped.contains("Function("),"no dynamic eval");
        check(wrapped.contains("api.version!=='0.4.3'")&&wrapped.contains("status.domVersion!=='0.4.3'"),"metadata/runtime guards");
        check(wrapped.contains("location.port!=='443'")&&wrapped.contains("location.protocol!=='https:'"),"HTTPS default port guard");
        check(wrapped.endsWith("JSON.stringify(globalThis.__PSKO_ANDROID_STATUS);"),"ack expression last");
        check(fallback.id.matches("[a-f0-9]{64}"),"SHA256 id");done("APK wrapper factory and static runtime acknowledgement");

        FakeFetcher dup=new FakeFetcher("0.8");dup.metadata=bytes(meta("0.8").replace("// @version 0.8","// @version 0.8\n// @version 0.9"));
        eq(updater(temp(),dup).checkForUpdate().state,"invalid-response");done("ambiguous duplicate metadata rejected");
        if(args.length>0){String asset=new String(read(new File(args[0])),StandardCharsets.UTF_8);Patch real=PatchUpdater.bundled(asset);eq(real.version,"0.4.3");done("actual APK asset metadata parsed");}
    }
    static byte[] read(File f)throws IOException{InputStream in=new FileInputStream(f);ByteArrayOutputStream out=new ByteArrayOutputStream();try{byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}finally{in.close();}}
}
