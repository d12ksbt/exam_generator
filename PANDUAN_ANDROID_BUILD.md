# Panduan Build APK Android (Offline/Lokal)

## Langkah Perbaikan (Jika Blank Screen / Error XML)

### 1. Update Kode React & Build Ulang
Karena kita telah memodifikasi `vite.config.ts` untuk menangani `process.env`, Anda wajib melakukan build ulang:

1.  Buka terminal di folder project React.
2.  Jalankan: `npm run build`
3.  Di Android Studio, buka folder `app/src/main/`.
4.  **Hapus folder lain yang membingungkan** (seperti `public` jika ada). Folder `public` TIDAK digunakan di Android Native.
5.  Buat folder baru bernama `assets` (jika belum ada) tepat di dalam `app/src/main/`.
6.  Copy **isi** folder `dist` (hasil build React) ke `app/src/main/assets`.

**Struktur Folder yang WAJIB (Hierarki):**
```text
app
 └── src
     └── main
         ├── java
         ├── res
         ├── AndroidManifest.xml
         └── assets              <-- FOLDER INI DIBUAT MANUAL
              ├── assets         <-- Folder ini dari dist/assets
              │     ├── index-xyz.js
              │     └── index-xyz.css
              ├── index.html     <-- File ini dari dist/index.html
              └── vite.svg       <-- Opsional
```

*(Jangan sampai menjadi `app/src/main/assets/dist/index.html`, itu salah)*

### 2. Update AndroidManifest.xml
Gunakan kode di bawah ini untuk `app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Izin Internet (Wajib untuk Gemini AI) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Izin Penyimpanan -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="28" />

    <!-- Izin Notifikasi (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"
        android:usesCleartextTraffic="true"
        tools:targetApi="31">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
```

### 3. Update MainActivity.java (Lengkap dengan Fitur Notifikasi & Dialog Keluar)
Copy kode berikut ke `app/src/main/java/com/smk/examgen/MainActivity.java`.

**Fitur Baru:**
*   Tombol notifikasi "Buka Unduhan" dan "Tutup".
*   Konfirmasi "Yakin ingin keluar?" saat tombol Back ditekan.
*   Perbaikan izin notifikasi Android 13+.

```java
package com.smk.examgen; // Sesuaikan dengan package project Anda

import android.Manifest;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.StrictMode;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private String TARGET_URL = "file:///android_asset/index.html";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // HACK: Mengizinkan File URI (file://) agar tombol 'Buka PDF' bisa jalan tanpa crash
        // (Solusi cepat tanpa harus setup FileProvider di XML)
        StrictMode.VmPolicy.Builder builder = new StrictMode.VmPolicy.Builder();
        StrictMode.setVmPolicy(builder.build());

        // Minta izin notifikasi untuk Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        PERMISSION_REQUEST_CODE);
            }
        }

        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();

        // Konfigurasi WebView
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient());

        // Listener download
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                if (url.startsWith("data:")) {
                    handleDataUriDownload(url, mimetype);
                } else {
                    handleNormalDownload(url, mimetype, contentDisposition, userAgent);
                }
            }
        });

        webView.loadUrl(TARGET_URL);

        // Tombol back HP dengan konfirmasi keluar
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Tampilkan dialog konfirmasi keluar
                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Konfirmasi")
                            .setMessage("Apakah Anda yakin ingin keluar aplikasi?")
                            .setPositiveButton("Ya", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialog, int which) {
                                    finishAffinity();
                                }
                            })
                            .setNegativeButton("Tidak", null)
                            .show();
                }
            }
        });
    }

    // Download biasa (HTTP/HTTPS)
    private void handleNormalDownload(String url, String mimetype, String contentDisposition, String userAgent) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimetype);
            String cookies = CookieManager.getInstance().getCookie(url);
            request.addRequestHeader("cookie", cookies);
            request.addRequestHeader("User-Agent", userAgent);
            request.setDescription("Mengunduh file...");
            String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
            request.setTitle(filename);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            dm.enqueue(request);

            Toast.makeText(getApplicationContext(), "Mulai mengunduh...", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(getApplicationContext(), "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // Download dari Data URI (Base64 hasil generate React)
    private void handleDataUriDownload(String url, String mimeType) {
        try {
            String extension = ".bin";
            if (mimeType.contains("pdf")) extension = ".pdf";
            else if (mimeType.contains("word") || mimeType.contains("officedocument")) extension = ".docx";

            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
            String fileName = "Soal_" + timeStamp + extension;

            File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File file = new File(path, fileName);

            String base64Data = url.substring(url.indexOf(",") + 1);
            byte[] fileData = Base64.decode(base64Data, Base64.DEFAULT);

            FileOutputStream os = new FileOutputStream(file);
            os.write(fileData);
            os.close();

            // Tambahkan ke DownloadManager agar tercatat di sistem
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            dm.addCompletedDownload(fileName, "Soal Ujian SMK", true, mimeType, file.getAbsolutePath(), file.length(), true);

            // Tampilkan Notifikasi Custom (Ada tombol Buka & Tutup)
            showDownloadNotification(file, mimeType);
            
            Toast.makeText(this, "Berhasil disimpan: " + fileName, Toast.LENGTH_LONG).show();

        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Gagal simpan: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    // Notifikasi download selesai dengan tombol aksi
    private void showDownloadNotification(File file, String mimeType) {
        try {
            // Cek izin notifikasi (Android 13+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return; 
                }
            }

            NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            String channelId = "download_channel_smk";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(channelId, "Unduhan Soal", NotificationManager.IMPORTANCE_HIGH);
                notificationManager.createNotificationChannel(channel);
            }

            // Intent Buka File
            Intent intentOpen = new Intent(Intent.ACTION_VIEW);
            intentOpen.setDataAndType(Uri.fromFile(file), mimeType);
            intentOpen.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            PendingIntent pendingOpen = PendingIntent.getActivity(this, 0, intentOpen, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Intent Tutup (Hanya dismiss notifikasi via autoCancel, intent kosong)
            Intent intentClose = new Intent(); 
            PendingIntent pendingClose = PendingIntent.getActivity(this, 1, intentClose, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle("Unduhan Selesai")
                    .setContentText(file.getName())
                    .setAutoCancel(true) // Hilang saat diklik
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .addAction(android.R.drawable.ic_menu_view, "Buka Unduhan", pendingOpen)
                    .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Tutup", pendingClose);

            notificationManager.notify((int) System.currentTimeMillis(), builder.build());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Handle respon user terhadap request izin
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Izin diberikan
            } else {
                Toast.makeText(this, "Izin notifikasi ditolak, notifikasi unduhan tidak akan muncul di status bar", Toast.LENGTH_LONG).show();
            }
        }
    }
}
```

### 4. Clean & Rebuild
1.  **Build** > **Clean Project**.
2.  **Build** > **Rebuild Project**.
3.  Run.
