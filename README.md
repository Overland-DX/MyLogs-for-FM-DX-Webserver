# FMList Analyzer for FM-DX Webserver

<img width="1899" height="909" alt="Skjermbilde fra 2026-03-24 01-51-50" src="https://github.com/user-attachments/assets/e44a239c-040d-482e-9c57-9abc80653abb" />


A powerful plugin for the **FM-DX Webserver** that makes it easy to explore, analyze, and share your personal fmlist.org logs. 

Originally ported from a legacy PHP script, this modern dashboard brings your FM DXing logs to life with rich statistics, interactive charts, and integrated media playback for your catches.

## ✨ Features
* **Interactive Dashboard:** Filter your logs by date, year, band, propagation mode, country, and distance.
* **Advanced Statistics:** Automatically generates charts, top 10 lists, and azimuth/direction radars.
* **Auto-merging:** Drop as many CSV files as you want. The plugin automatically merges them and removes duplicate entries.
* **Integrated Media Player:** Link audio and video recordings directly to your logs.
* **Shareable URLs:** Generate direct links to specific logs and media files to share with the DX community.

---

## 💾 Supported Media Formats
You can attach media recordings to your logs. The plugin currently supports the following formats:
* **Video:** `.mp4`, `.webm`, `.m4v`
* **Audio:** `.mp3`, `.wav`, `.ogg`, `.m4a`

---

## 🛠️ Installation

1. **Copy** the plugin files into your FM-DX Webserver `plugins` folder.
2. **Restart** the FM-DX Webserver.
3. **Enable** the plugin by logging into the FM-DX Webserver Admin Panel and toggling the plugin to *Active*.
4. **Restart** the server one final time to apply the changes.

---

## 📊 How to import your Log Data

To populate the analyzer with your own catches, you need to export your logs from FMLIST:

1. Log in to [fmlist.org](https://www.fmlist.org) and navigate to **Logbook**.
2. Click on **Select date** and choose either **ALL** or a specific year.
3. Click the **Export (CSV)** button to download your logbook.
4. Place the downloaded `.csv` file into the `web/FMList_Data/` folder on your server.

> **Tip:** You can add multiple CSV files (for example, one for each year). If multiple files contain overlapping data, the plugin will automatically merge them and ensure no duplicate entries are shown.

---

## 🎵 How to add Audio/Video Media

If you have a video or audio recording of a specific catch, you can easily link it to your logbook:

1. Place your media file inside the `web/FMList_Data/Media/` folder.
2. Open the FMList Analyzer in your browser and find the specific log entry in the table.
3. Click the **ID** badge next to the propagation mode to copy the unique **Log ID** to your clipboard.
4. Rename your media file to match this exact Log ID. 
   * *Example: If the Log ID is `20250604-0857-9470`, rename your video to `20250604-0857-9470.mp4`.*
5. Refresh the page! A play button will now appear on that log entry in the table.

---

## 🔗 Live Example
Check out an example of a shared media file with active filters applied:  
👉 [View Live DX Catch Example](https://odx-1.fmdx.no/FMList?year=2026%2C2025%2C2024%2C2023&propa=AuEs%2CEs&sort=days&tbSort=9%2Cdesc&playMedia=20250604-0859-9050)
