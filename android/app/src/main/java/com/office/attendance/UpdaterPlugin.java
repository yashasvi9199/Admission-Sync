package com.office.attendance;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            String versionName = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0).versionName;
            JSObject ret = new JSObject();
            ret.put("version", versionName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error getting app version: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null) {
            call.reject("URL is required");
            return;
        }

        // Check Unknown App Sources permission for Android O (API 26) and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                try {
                    Intent settingsIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:" + getContext().getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(settingsIntent);
                    call.reject("Install permission missing. Redirected user to Settings. Please enable the permission and try again.");
                } catch (Exception e) {
                    Intent settingsIntent = new Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS);
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(settingsIntent);
                    call.reject("Install permission missing. Redirected to Security Settings. Please enable 'Install unknown apps' and try again.");
                }
                return;
            }
        }

        new Thread(() -> {
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection c = (HttpURLConnection) url.openConnection();
                c.setRequestMethod("GET");
                c.setInstanceFollowRedirects(true);

                int status = c.getResponseCode();
                int redirectCount = 0;
                while ((status == HttpURLConnection.HTTP_MOVED_TEMP || 
                        status == HttpURLConnection.HTTP_MOVED_PERM || 
                        status == 307 || status == 308) && redirectCount < 3) {
                    String newUrl = c.getHeaderField("Location");
                    c = (HttpURLConnection) new URL(newUrl).openConnection();
                    c.setRequestMethod("GET");
                    c.setInstanceFollowRedirects(true);
                    status = c.getResponseCode();
                    redirectCount++;
                }

                if (status != HttpURLConnection.HTTP_OK) {
                    call.reject("Server returned HTTP status " + status);
                    return;
                }

                File path = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                File outputFile = new File(path, "aeropunchin-update.apk");
                if (outputFile.exists()) {
                    outputFile.delete();
                }

                FileOutputStream fos = new FileOutputStream(outputFile);
                InputStream is = c.getInputStream();

                byte[] buffer = new byte[1024];
                int len1;
                while ((len1 = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, len1);
                }
                fos.close();
                is.close();

                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        outputFile
                    );
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    apkUri = Uri.fromFile(outputFile);
                }

                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error downloading or installing APK: " + e.getMessage(), e);
            }
        }).start();
    }
}
