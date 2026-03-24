/**
 * FMList Log Analyzer - Server Plugin
 * Automatically reads FMList CSV exports from a server folder and displays a rich dashboard.
 */

const fs = require('fs');
const path = require('path');
const endpointsRouter = require('../../server/endpoints');
const { logInfo, logError } = require('../../server/console');

// Directories
const FMLIST_DIR = path.resolve(__dirname, '../../web/FMList_Data');
const MEDIA_DIR = path.join(FMLIST_DIR, 'Media');

// Create the directories if they don't exist
if (!fs.existsSync(FMLIST_DIR)) {
    try {
        fs.mkdirSync(FMLIST_DIR, { recursive: true });
        logInfo(`[FMList-Analyzer] Created folder for CSV files: ${FMLIST_DIR}`);
    } catch (e) {
        logError(`[FMList-Analyzer] Could not create folder: ${e.message}`);
    }
}
if (!fs.existsSync(MEDIA_DIR)) {
    try {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
        logInfo(`[FMList-Analyzer] Created Media folder: ${MEDIA_DIR}`);
    } catch (e) {
        logError(`[FMList-Analyzer] Could not create Media folder: ${e.message}`);
    }
}

// 1. API: List all CSV files
endpointsRouter.get('/api/fmlist-files', (req, res) => {
    try {
        if (!fs.existsSync(FMLIST_DIR)) return res.json([]);
        const files = fs.readdirSync(FMLIST_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. API: Serve a specific CSV file
endpointsRouter.get('/api/fmlist-file/:filename', (req, res) => {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) return res.status(403).send('Forbidden');
    
    const filePath = path.join(FMLIST_DIR, filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// 3. API: List available media files
endpointsRouter.get('/api/fmlist-media-list', (req, res) => {
    try {
        if (!fs.existsSync(MEDIA_DIR)) return res.json([]);
        const files = fs.readdirSync(MEDIA_DIR).filter(f => f.match(/\.(mp3|mp4|wav|webm|ogg|m4a|m4v)$/i));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. API: Serve a specific media file
endpointsRouter.get('/api/fmlist-media/:filename', (req, res) => {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) return res.status(403).send('Forbidden');
    
    const filePath = path.join(MEDIA_DIR, filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// 5. GUI: The Web Dashboard (HTML/JS/CSS)
endpointsRouter.get('/FMList', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FMList Log Analyzer</title>
        <link rel="stylesheet" href="https://cdn.datatables.net/1.13.8/css/jquery.dataTables.min.css">
        <style>
            :root {
                --bg: #0f1115; 
                --card-bg: #1c1f26; 
                --text: #e2e8f0; 
                --border: #2d3748; 
                --accent: #3b82f6; 
                --accent-hover: #60a5fa;
                --danger: #ef4444;
                --danger-hover: #f87171;
            }
            body {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                background-color: var(--bg); color: var(--text); margin: 0; padding: 20px;
            }
            h1 { margin-top: 0; color: #fff; border-bottom: 2px solid var(--border); padding-bottom: 10px; font-weight: 600; }
            h2, h3 { color: #fff; font-weight: 500; margin-top: 0; }
            
            .card {
                background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
                padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: box-shadow 0.2s;
            }
            .card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
            
            .filters { display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-start; margin-top: 15px; }
            .filter-group { display: flex; flex-direction: column; font-size: 13px; font-weight: 600; color: #94a3b8; margin: 0; }
            .filters input, .filters select {
                padding: 8px; margin-top: 5px; background: #2d3748; border: 1px solid #4a5568; 
                color: #fff; border-radius: 6px; font-size: 14px; height: 38px; box-sizing: border-box; outline: none; transition: border 0.2s;
            }
            .filters input:focus, .filters select:focus { border-color: var(--accent); }
            
            button {
                background: var(--accent); color: #fff; border: none; padding: 8px 16px;
                border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;
            }
            button:hover { background: var(--accent-hover); }
            button:disabled { background: #4a5568; color: #a0aec0; cursor: not-allowed; }
            .reset-top-btn { background: var(--danger); }
            .reset-top-btn:hover { background: var(--danger-hover); }
            
            /* Tabs */
            .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
            .tab-link { background: transparent; color: #94a3b8; font-size: 15px; padding: 10px 20px; border-radius: 6px; font-weight: 600; }
            .tab-link:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .tab-link.active { background: var(--accent); color: #fff; }
            .tab-content { display: none; animation: fadeIn 0.3s ease; }
            .tab-content.active { display: block; }

            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            
            /* Stats Grid */
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
            .stats-grid .card { margin-bottom: 0; display: flex; flex-direction: column; }
            .stats-grid h3 { border-bottom: 1px solid var(--border); padding-bottom: 10px; font-size: 16px; color: var(--accent-hover); }
            .stats-grid ol, .stats-grid ul { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; overflow-y: auto; max-height: 250px; color: #cbd5e1; }
            .stats-grid li { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 6px 0; }
            .stats-grid b { color: #fff; font-weight: 600; }
            .stats-grid .small-text { color: #94a3b8; font-size: 0.85em; }

            /* Custom Multi-Select Dropdown */
            .multi-select-container { position: relative; display: inline-block; min-width: 130px; margin-top: 5px; }
            .multi-select-btn { 
                background: #2d3748; border: 1px solid #4a5568; color: #fff; 
                padding: 0 12px; border-radius: 6px; cursor: pointer; 
                display: flex; justify-content: space-between; align-items: center; 
                font-size: 14px; height: 38px; font-weight: normal; box-sizing: border-box;
                transition: border 0.2s;
            }
            .multi-select-btn:hover { border-color: var(--accent); }
            .multi-select-menu { 
                position: absolute; top: 100%; left: 0; min-width: 100%; 
                background: #2d3748; border: 1px solid #4a5568; z-index: 100; 
                max-height: 250px; overflow-y: auto; display: none; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.4); border-radius: 6px;
                margin-top: 4px;
            }
            .multi-select-menu.open { display: block; animation: fadeIn 0.15s ease; }
            .multi-select-menu label { 
                display: flex; padding: 10px 12px; cursor: pointer; 
                flex-direction: row; align-items: center; gap: 8px; 
                color: #e2e8f0; font-weight: normal; margin: 0; font-size: 14px;
            }
            .multi-select-menu label:hover { background: var(--accent); color: #fff; }
            .multi-select-menu input[type="checkbox"] { margin: 0; cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent); }

            /* Datatables Overrides for Dark Mode */
            table.dataTable tbody tr { background-color: var(--card-bg); transition: background 0.1s; }
            table.dataTable tbody tr:nth-of-type(even) { background-color: #232730; }
            table.dataTable tbody tr:hover { background-color: #2d3748; }
            .dataTables_wrapper .dataTables_length, .dataTables_wrapper .dataTables_filter, 
            .dataTables_wrapper .dataTables_info, .dataTables_wrapper .dataTables_processing, 
            .dataTables_wrapper .dataTables_paginate { color: #94a3b8; margin-bottom: 10px;}
            table.dataTable thead th { border-bottom: 2px solid var(--border); color: #fff; }
            table.dataTable.display tbody td { border-top: 1px solid var(--border); color: #cbd5e1; }
            .dataTables_wrapper .dataTables_paginate .paginate_button { color: #fff !important; border-radius: 4px; }
            .dataTables_wrapper .dataTables_paginate .paginate_button.current { background: var(--accent) !important; color: #fff !important; border: none; }
            
            /* Sub-row styling */
            .child-details { padding: 15px; background: #0f1115; border-radius: 6px; border-left: 4px solid var(--accent); margin: 5px 0; }
            .first-logged { color: #4ade80; font-size: 12px; font-weight: bold; }

            /* ID Badges / Buttons */
            .badge-btn {
                font-size: 11px; padding: 3px 6px; border-radius: 4px;
                background: #2d3748; border: 1px solid #4a5568; color: #cbd5e1;
                cursor: pointer; user-select: none; transition: all 0.2s;
                display: inline-flex; align-items: center; gap: 4px; font-weight: 600;
            }
            .badge-btn:hover { background: #4a5568; color: #fff; border-color: #718096; }
            .badge-btn.copied { background: #10b981; color: #fff; border-color: #059669; }

            /* Moderne rund play-knapp */
            .play-btn-modern {
                display: inline-flex; 
                width: 36px; height: 36px; border-radius: 50%;
                border: none; cursor: pointer;
                outline: none; flex-shrink: 0;
                box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                
                /* 
                   Her styrer du alt! 
                   - 54% center : Posisjonen (litt til høyre for optisk midte)
                   - 14px 16px  : Størrelsen på trekanten (Bredde Høyde)
                */
                background: 
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='8 5 11 14'%3E%3Cpath d='M8 5v14l11-7z' fill='%23ffffff'/%3E%3C/svg%3E") 54% center / 14px 16px no-repeat,
                    linear-gradient(135deg, #3b82f6, #1d4ed8);
            }
            .play-btn-modern:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 14px rgba(59, 130, 246, 0.6);
            }
            .play-btn-modern.video {
                /* Samme justeringer her for videoknappen */
                background: 
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='8 5 11 14'%3E%3Cpath d='M8 5v14l11-7z' fill='%23ffffff'/%3E%3C/svg%3E") 54% center / 14px 16px no-repeat,
                    linear-gradient(135deg, #f43f5e, #be123c);
                box-shadow: 0 4px 10px rgba(244, 63, 94, 0.4);
            }
            .play-btn-modern.video:hover {
                box-shadow: 0 6px 14px rgba(244, 63, 94, 0.6);
            }
            
            /* Media Modal */
            .media-modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                animation: fadeIn 0.2s ease;
            }
            .media-modal-content {
                background: var(--card-bg); border: 1px solid var(--border);
                border-radius: 10px; width: 90%; max-width: 650px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                display: flex; flex-direction: column; overflow: hidden;
            }
            .media-modal-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 15px 20px; border-bottom: 1px solid var(--border); background: #232730;
            }
            .media-modal-header h3 { margin: 0; font-size: 1.25em; color: #fff; font-weight: 600; display: flex; align-items: center; gap: 8px; }
            .media-modal-close { background: transparent; border: none; color: #94a3b8; font-size: 26px; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s; }
            .media-modal-close:hover { color: var(--danger); background: transparent; }
            
            /* Share Button */
            .share-btn {
                background: #2d3748; border: 1px solid #4a5568; color: #cbd5e1;
                border-radius: 6px; padding: 6px 12px; font-size: 13px; font-weight: 600;
                cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
            }
            .share-btn:hover { background: #4a5568; color: #fff; }
            .share-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
            .share-btn.copied { background: #10b981; border-color: #059669; color: #fff; }

            .media-modal-info { padding: 15px 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1; background: var(--card-bg); }
            .media-modal-info b { color: #fff; font-weight: 600; }
            .media-modal-player { padding: 0; display: flex; justify-content: center; background: #000; border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); }
            .media-modal-player video { width: 100%; max-height: 60vh; outline: none; display: block; }
            .media-modal-player audio { width: 100%; margin: 20px; outline: none; }
            
            .summary-content-wrapper { display: flex; flex-wrap: wrap; gap: 40px; }
            .summary-content-wrapper ul { list-style: none; padding: 0; line-height: 1.8; margin: 0; color: #cbd5e1; }
            .summary-content-wrapper b { color: #fff; }

            /* Loading spinner */
            #loadingMsg { font-size: 16px; color: var(--accent-hover); display: flex; align-items: center; gap: 12px; font-weight: 500; }
            .spinner { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

            /* Scrollbar styling */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: var(--bg); }
            ::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #718096; }
        </style>
    </head>
    <body>
        <h1>FMList Log Analyzer</h1>

        <div id="fmlogger-content">
            
            <div class="card" id="controlPanel">
                <div id="loadingMsg">
                    <div class="spinner"></div> Loading FMList CSV files from the server...
                </div>
                
                <div id="filterControls" style="display:none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <strong style="font-size: 1.1em; color: #fff;">Log data loaded! Use the filters below to refine the view:</strong>
                        <div>
                            <button id="resetFilterBtn" class="reset-top-btn">Reset Filters</button>
                        </div>
                    </div>

                    <div id="filterBar" class="filters">
                        <div class="filter-group"><span>From date:</span><input type="date" id="fromDate" /></div>
                        <div class="filter-group"><span>To date:</span><input type="date" id="toDate" /></div>
                        
                        <div class="filter-group">
                            <span>Years:</span>
                            <div class="multi-select-container">
                                <div class="multi-select-btn" onclick="toggleDropdown('yearDropdownMenu', event)">
                                    <span id="yearBtnText">All</span>
                                    <span style="font-size:10px;">▼</span>
                                </div>
                                <div class="multi-select-menu" id="yearDropdownMenu"></div>
                            </div>
                        </div>

                        <div class="filter-group">
                            <span>Band:</span>
                            <div class="multi-select-container">
                                <div class="multi-select-btn" onclick="toggleDropdown('bandDropdownMenu', event)">
                                    <span id="bandBtnText">All</span>
                                    <span style="font-size:10px;">▼</span>
                                </div>
                                <div class="multi-select-menu" id="bandDropdownMenu"></div>
                            </div>
                        </div>

                        <div class="filter-group">
                            <span>Propagation:</span>
                            <div class="multi-select-container">
                                <div class="multi-select-btn" onclick="toggleDropdown('propaDropdownMenu', event)">
                                    <span id="propaBtnText">All</span>
                                    <span style="font-size:10px;">▼</span>
                                </div>
                                <div class="multi-select-menu" id="propaDropdownMenu"></div>
                            </div>
                        </div>

                        <div class="filter-group">
                            <span>Country:</span>
                            <div class="multi-select-container">
                                <div class="multi-select-btn" onclick="toggleDropdown('ituDropdownMenu', event)">
                                    <span id="ituBtnText">All</span>
                                    <span style="font-size:10px;">▼</span>
                                </div>
                                <div class="multi-select-menu" id="ituDropdownMenu"></div>
                            </div>
                        </div>

                        <div class="filter-group"><span>KM >:</span><input type="number" id="minDistance" min="0" step="1" placeholder="0" style="width: 80px;" /></div>
                    </div>
                </div>
            </div>

            <div id="summary" class="card" style="display:none"></div>

            <!-- TABS NAVIGATION -->
            <div class="tabs" id="mainTabs" style="display:none;">
                <button class="tab-link active" onclick="switchTab('tab-logs')">Logs & Timelines</button>
                <button class="tab-link" onclick="switchTab('tab-stats')">Advanced Statistics</button>
            </div>

            <!-- TAB 1: LOGS & TIMELINES -->
            <div id="tab-logs" class="tab-content active">
                <div id="charts" class="card" style="display:none">
                    <div id="chartControls" style="display: none; margin-bottom: 0.5rem; display: flex; gap: 10px; align-items: center;">
                        <div class="filter-group" style="flex-direction:row; align-items:center; gap:8px; font-weight:bold; color: #fff;">
                            Sort countries by:
                            <select id="sortCriteria" style="margin:0; padding:5px 10px; height:auto; border-radius: 4px;">
                                <option value="logs">Logs</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                        <button id="prevPage" disabled>« Previous</button>
                        <span id="pageInfo" style="color:#fff; font-weight:bold;">1/1</span>
                        <button id="nextPage" disabled>Next »</button>
                    </div>
                    <div id="chartWrap" style="overflow-x: auto;"><canvas id="countryChart"></canvas></div>
                </div>  

                <div id="monthCharts" class="card" style="display:none">
                    <h3 id="monthChartTitle">Number of logged days per month</h3>
                    <canvas id="monthChart" height="260"></canvas>
                </div>

                <div id="dayChartWrap" class="card" style="display:none">
                    <h3 id="dayChartTitle"></h3>
                    <canvas id="dayChart" height="260"></canvas>
                    <small style="display:block; margin-top:.8rem; opacity:.7; color:#94a3b8;">
                    Click a bar/day to show logs for that specific day in the table below. Ctrl/Cmd-click opens the log in the FMList map.
                    </small>
                </div>

                <div class="card" id="tableWrap" style="display:none">
                    <button id="showAllBtn" style="display:none; margin-bottom:1rem;">Show all matched days in table</button>
                    <table id="logTable" class="display" style="width:100%"></table>
                </div>
            </div>

            <!-- TAB 2: ADVANCED STATISTICS -->
            <div id="tab-stats" class="tab-content">
                <div class="stats-grid">
                    <div class="card">
                        <h3>Top 10 Most Logged Transmitters</h3>
                        <ol id="stat-top-tx"></ol>
                    </div>
                    <div class="card">
                        <h3>10 Longest Distances</h3>
                        <ol id="stat-longest-dist"></ol>
                    </div>
                    <div class="card">
                        <h3>10 Weakest Power Transmitters</h3>
                        <ol id="stat-weakest-pwr"></ol>
                    </div>
                    <div class="card">
                        <h3>Average Distances (by Propa)</h3>
                        <ul id="stat-avg-dist"></ul>
                    </div>
                    <div class="card" style="grid-column: 1 / -1;">
                        <h3>Time of Day Distribution (UTC)</h3>
                        <div style="width:100%; height:250px; position:relative;">
                            <canvas id="timeChart"></canvas>
                        </div>
                    </div>
                    <div class="card" style="grid-column: span auto;">
                        <h3>Frequency Distribution</h3>
                        <div style="width:100%; height:320px; position:relative;">
                            <canvas id="freqChart"></canvas>
                        </div>
                    </div>
                    <div class="card" style="grid-column: span auto;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px;">
                            <h3 style="margin:0; border:none; padding:0;">Direction (360° QTF)</h3>
                            <select id="aziMetric" style="background:#2d3748; color:#fff; border:1px solid #4a5568; border-radius:4px; padding:6px; outline:none; font-size:13px; cursor:pointer;">
                                <option value="logs">Number of Logs</option>
                                <option value="distance">Max Distance (km)</option>
                            </select>
                        </div>
                        <div style="width:100%; height:300px; position:relative; display:flex; justify-content:center;">
                            <canvas id="aziChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- MEDIA MODAL -->
        <div id="mediaModal" class="media-modal-overlay" style="display:none;" onclick="closeMediaModal(event)">
            <div class="media-modal-content" onclick="event.stopPropagation()">
                <div class="media-modal-header">
                    <h3 id="mediaModalTitle">Media Player</h3>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <button id="mediaShareBtn" class="share-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                            Share URL
                        </button>
                        <button onclick="closeMediaModal()" class="media-modal-close">&times;</button>
                    </div>
                </div>
                <div id="modalInfoTop" class="media-modal-info"></div>
                <div id="modalPlayerBox" class="media-modal-player"></div>
                <div id="modalInfoBottom" class="media-modal-info"></div>
            </div>
        </div>

        <!-- JS Libraries -->
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
        
        <script>
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
        Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

        // Globals for Media System & URL State
        window.fmlistMedia = {};
        window.fmlistMaster =[];
        let globalTbSearch = '';
        let globalTbSort = null;

        // Modal Media Player Logic
        window.copyLogId = function(id, el) {
            navigator.clipboard.writeText(id).then(() => {
                const oldHtml = el.innerHTML;
                el.innerHTML = '✔ Copied';
                el.classList.add('copied');
                setTimeout(() => { 
                    el.innerHTML = oldHtml; 
                    el.classList.remove('copied'); 
                }, 1500);
            });
        };

        // Advanced Share URL Logic
        window.copyMediaUrl = function(logId, el) {
            // Re-builds the URL to include all active filters, table state PLUS the playMedia param
            const urlObj = new URL(window.location.href);
            urlObj.searchParams.set('playMedia', logId);
            const fullUrl = urlObj.toString();
            
            navigator.clipboard.writeText(fullUrl).then(() => {
                const oldHtml = el.innerHTML;
                el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
                el.classList.add('copied');
                setTimeout(() => { 
                    el.innerHTML = oldHtml; 
                    el.classList.remove('copied'); 
                }, 2000);
            });
        };

        window.openMediaModal = function(id) {
            const media = window.fmlistMedia[id];
            if(!media) return;
            const r = window.fmlistMaster.find(m => m.logId === id);
            if(!r) return;

            const isVideo =['mp4','webm','m4v'].includes(media.ext);
            const mediaUrl = '/api/fmlist-media/' + encodeURIComponent(media.filename);

            const mhzText = r.MHz ? Number(r.MHz).toFixed(2) + ' MHz' : '-';
            const distText = r.DistanceKm ? r.DistanceKm + ' km' : '-';
            const kwText = r.kW ? r.kW + ' kW' : '-';

            // Custom Dynamic Title
            const titleText = \`\${r.Program || 'Unknown Program'} <span style="opacity:0.6; font-size:0.85em; font-weight:normal;">(\${mhzText})</span>\`;
            document.getElementById('mediaModalTitle').innerHTML = titleText;

            // Update Share button to point to this specific log ID
            const shareBtn = document.getElementById('mediaShareBtn');
            shareBtn.setAttribute('onclick', \`copyMediaUrl('\${id}', this)\`);

            const topHtml = \`
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                    <span><b>Date:</b> \${r.DateISO || '-'} at \${fmtUTCtoTime(r.UTC)} UTC</span>
                    <span><b>Propa:</b> \${r.Propa || '-'}</span>
                </div>\`;
            
            const bottomHtml = \`
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><b>Location:</b> \${r.Location || '-'}</div>
                    <div><b>Country:</b> \${r.Country || r.ITU || '-'}</div>
                    <div><b>Distance:</b> \${distText}</div>
                    <div><b>Power:</b> \${kwText}</div>
                </div>\`;

            const playerHtml = isVideo 
                ? \`<video controls autoplay src="\${mediaUrl}"></video>\` 
                : \`<audio controls autoplay src="\${mediaUrl}"></audio>\`;

            document.getElementById('modalInfoTop').innerHTML = topHtml;
            document.getElementById('modalPlayerBox').innerHTML = playerHtml;
            document.getElementById('modalInfoBottom').innerHTML = bottomHtml;
            
            document.getElementById('mediaModal').style.display = 'flex';
        };

        window.closeMediaModal = function(e) {
            if(e && e.target !== document.getElementById('mediaModal')) return;
            
            // Remove the playMedia from URL gracefully when closing the modal
            const urlObj = new URL(window.location.href);
            if (urlObj.searchParams.has('playMedia')) {
                urlObj.searchParams.delete('playMedia');
                window.history.replaceState(null, '', urlObj.toString());
            }

            document.getElementById('mediaModal').style.display = 'none';
            document.getElementById('modalPlayerBox').innerHTML = ''; // Stops playback instantly
        };

        // Tab Switcher
        window.switchTab = function(tabId) {
            $('.tab-link').removeClass('active');
            $('.tab-content').removeClass('active');
            $(\`[onclick="switchTab('\${tabId}')"]\`).addClass('active');
            $(\`#\${tabId}\`).addClass('active');
        };

        // Global dropdown toggler
        window.toggleDropdown = function(id, e) {
            e.stopPropagation();
            document.querySelectorAll('.multi-select-menu').forEach(menu => {
                if (menu.id !== id) menu.classList.remove('open');
            });
            document.getElementById(id).classList.toggle('open');
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select-container')) {
                document.querySelectorAll('.multi-select-menu').forEach(m => m.classList.remove('open'));
            }
        });

        // Date and Time Formatting Helpers
        function fmtDateISOtoNO(iso) {
            if (!iso) return '';
            const[y, m, d] = iso.split('-');
            return \`\${y}-\${m}-\${d}\`;
        }

        function fmtUTCtoTime(utc) {
            if (utc === null || utc === undefined || utc === '') return '';
            const s = String(utc).padStart(4, '0');
            return \`\${s.slice(0, 2)}:\${s.slice(2)}\`;
        }

        $(document).ready(function() {
            let currentPage = 0;
            const pageSize = 20;
            let sortCriteria = 'logs';

            // Utvidet verdenskart med ITU-koder
            const ITU2NAME = {
                ALB:'Albania', D:'Germany', S:'Sweden', I:'Italy', E:'Spain', F:'France', G:'United Kingdom', IRL:'Ireland', ISL:'Iceland', BLR:'Belarus', DNK:'Denmark', EST:'Estonia', HRV:'Croatia', SRB:'Serbia', BIH:'Bosnia & Herzegovina', AUT:'Austria', TUR:'Türkiye', SVN:'Slovenia', MKD:'North Macedonia', MDA:'Moldova', BEL:'Belgium', LVA:'Latvia', FIN:'Finland', LTU:'Lithuania', LUX:'Luxembourg', CYP:'Cyprus', ISR:'Israel', PSE:'Palestine', POL:'Poland', ROU:'Romania', UKR:'Ukraine', RUS:'Russia', BUL:'Bulgaria', ALG:'Algeria', HNG:'Hungary', SUI:'Switzerland', POR:'Portugal', MRC:'Morocco', RKS:'Kosovo', HOL:'Netherlands', NOR:'Norway', GRC:'Greece', CZE:'Czechia', SVK:'Slovakia',
                CUB:'Cuba', USA:'United States', CAN:'Canada', MEX:'Mexico', PRG:'Puerto Rico', EGY:'Egypt', LBY:'Libya', TUN:'Tunisia', SYR:'Syria', LBN:'Lebanon', JOR:'Jordan', KSA:'Saudi Arabia', IRN:'Iran', IRQ:'Iraq', KWT:'Kuwait', QAT:'Qatar', UAE:'UAE', OMA:'Oman', YEM:'Yemen', AFG:'Afghanistan', PAK:'Pakistan', IND:'India', CHN:'China', JPN:'Japan', KOR:'South Korea', PRK:'North Korea', TWN:'Taiwan', AUS:'Australia', NZL:'New Zealand', THA:'Thailand', VNM:'Vietnam', IDN:'Indonesia', PHL:'Philippines', MYS:'Malaysia', SGP:'Singapore', BRS:'Brazil', ARG:'Argentina', CHL:'Chile', COL:'Colombia', VEN:'Venezuela', PER:'Peru', URY:'Uruguay', PRY:'Paraguay', BOL:'Bolivia', ECU:'Ecuador', AFS:'South Africa', NGR:'Nigeria', KEN:'Kenya', TZA:'Tanzania', SEN:'Senegal', CIV:'Ivory Coast', GHA:'Ghana', CMR:'Cameroon', AGO:'Angola', MOZ:'Mozambique', MDG:'Madagascar', ZMB:'Zambia', ZWE:'Zimbabwe', FRO:'Faroe Islands', GRL:'Greenland', SMR:'San Marino', MCO:'Monaco', LIE:'Liechtenstein', AND:'Andorra', MLT:'Malta', VAT:'Vatican', GEO:'Georgia', ARM:'Armenia', AZE:'Azerbaijan', KAZ:'Kazakhstan', UZB:'Uzbekistan', TKM:'Turkmenistan', KGZ:'Kyrgyzstan', TJK:'Tajikistan', CNR:'Canary Islands', AZA:'Azores', MDR:'Madeira', SMO:'Samoa', FJI:'Fiji', TGA:'Tonga', VUT:'Vanuatu'
            };

            let master=[], table=null;
            let chart=null, monthChart=null, dayChart=null, timeChart=null, freqChart=null, aziChart=null;
            let currentList =[];
            let rdsOnly = false;
            let currentAziMetric = 'logs';
            
            const MONTH_LABELS_EN =['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const FIXED_H = 260;

            const PROPA2BAND = {
                '': 'ALL', 'All': 'ALL', 'ES': 'Es', 'Es': 'Es', 'Tropo': 'Tropo', 'MS': 'MS',
                'Au': 'Aurora', 'Aurora': 'Aurora', 'AuroraES': 'AuroraEs', 'Aurora Es': 'AuroraEs', 'TEP': 'TEP'
            };

            const dedup = a => {
                const s = new Set();
                const validItems = a.filter(r => r && typeof r === 'object' && r.DateISO && r.UTC !== undefined && r.MHz !== undefined);
                return validItems.filter(r => {
                    const k = \`\${r.DateISO}|\${r.UTC}|\${r.MHz}\`;
                    if (s.has(k)) return false;
                    s.add(k);
                    return true;
                });
            };

            function openLogMap(year, monthIdx, dayStr) {
                const month = String(monthIdx + 1).padStart(2, '0');
                const pArr = $('.propa-cb:checked').map(function(){ return this.value; }).get();
                const propaVal = pArr.length === 1 ? pArr[0] : '';
                const bandVal  = PROPA2BAND[propaVal] || 'ALL';
                
                const url = \`https://www.fmlist.org/fm_logmap.php?datum=\${year}-\${month}-\${dayStr}&hours=0&band=\${bandVal}&rxin=ALL\`;
                window.open(url, '_blank');
            }

            function innerWidth(elem) {
                const style = getComputedStyle(elem);
                return elem.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            }

            function parseSafeFloat(val) {
                if(val === undefined || val === null || String(val).trim() === '') return null;
                const parsed = parseFloat(String(val).replace(',', '.'));
                return isNaN(parsed) ? null : parsed;
            }

            function nrm(r) {
                const mhz = parseSafeFloat(r.MHz);
                const dist = parseSafeFloat(r['QRB km'] ?? r.QRB);
                const kw = parseSafeFloat(r.kW ?? r['Power kW'] ?? r.ERP);
                const qtf = parseSafeFloat(r.QTF ?? r.Azi ?? r.Dir);
                
                const p = (r.Date || '').split('.');
                let d = null; let iso = ''; let yr = '';
                
                if (p.length === 3) {
                    let yearInt = parseInt(p[2], 10);
                    if (yearInt < 100) yearInt += 2000;
                    d = new Date(Date.UTC(yearInt, parseInt(p[1], 10) - 1, parseInt(p[0], 10)));
                }

                if (d && !isNaN(d.getTime())) {
                    iso = d.toISOString().slice(0, 10);
                    yr = d.getFullYear();
                }
                
                let b = r.Band || '';
                if (!b && mhz) {
                    b = (mhz >= 87.5 && mhz <= 108) ? 'FM' : (mhz >= 65 && mhz <= 74 ? 'OIRT' : '');
                }

                // Generer unik Log ID (Dato-UTC-Frekvens)
                let logId = '';
                if (iso && r.UTC !== undefined && mhz) {
                    const dateStr = iso.replace(/-/g, '');
                    const utcStr = String(r.UTC).padStart(4, '0');
                    const mhzStr = Math.round(mhz * 100).toString();
                    logId = \`\${dateStr}-\${utcStr}-\${mhzStr}\`;
                }

                return { 
                    ...r, 
                    MHz: mhz, 
                    DistanceKm: dist,
                    kW: kw,
                    QTF: qtf,
                    DateISO: iso, 
                    Year: yr, 
                    Band: b,
                    Country: ITU2NAME[r.ITU] || r.ITU, 
                    UTC: r.UTC || '',
                    logId: logId
                };
            }

            function readUrlParams() {
                const params = new URLSearchParams(window.location.search);
                if (params.has('from')) $('#fromDate').val(params.get('from'));
                if (params.has('to')) $('#toDate').val(params.get('to'));
                if (params.has('km')) $('#minDistance').val(params.get('km'));
                if (params.has('rds')) {
                    rdsOnly = params.get('rds') === 'true';
                    $('#rdsOnlyChk').prop('checked', rdsOnly);
                }
                if (params.has('year')) {
                    const years = params.get('year').split(',');
                    $('.year-cb').each(function() { if (years.includes(this.value)) this.checked = true; });
                    updateMultiBtnText('.year-cb', 'yearBtnText');
                }
                if (params.has('band')) {
                    const bands = params.get('band').split(',');
                    $('.band-cb').each(function() { if (bands.includes(this.value)) this.checked = true; });
                    updateMultiBtnText('.band-cb', 'bandBtnText');
                }
                if (params.has('propa')) {
                    const propas = params.get('propa').split(',');
                    $('.propa-cb').each(function() { if (propas.includes(this.value)) this.checked = true; });
                    updateMultiBtnText('.propa-cb', 'propaBtnText');
                }
                if (params.has('itu')) {
                    const itus = params.get('itu').split(',');
                    $('.itu-cb').each(function() { if (itus.includes(this.value)) this.checked = true; });
                    updateMultiBtnText('.itu-cb', 'ituBtnText');
                }
                if (params.has('sort')) {
                    sortCriteria = params.get('sort');
                    $('#sortCriteria').val(sortCriteria);
                }
                if (params.has('page')) {
                    currentPage = parseInt(params.get('page'), 10) || 0;
                }
                
                // Table State parameters
                if (params.has('tbSearch')) {
                    globalTbSearch = params.get('tbSearch');
                }
                if (params.has('tbSort')) {
                    globalTbSort = params.get('tbSort');
                }
            }

            async function loadServerFiles() {
                try {
                    // Fetch Media list first
                    const mediaRes = await fetch('/api/fmlist-media-list');
                    const mediaList = await mediaRes.json();
                    
                    window.fmlistMedia = {};
                    mediaList.forEach(f => {
                        const parts = f.split('.');
                        const ext = parts.pop().toLowerCase();
                        const id = parts.join('.');
                        window.fmlistMedia[id] = { filename: f, ext: ext };
                    });

                    // Fetch CSV list
                    const res = await fetch('/api/fmlist-files');
                    const fileNames = await res.json();
                    
                    if (!fileNames || fileNames.length === 0) {
                        $('#loadingMsg').html('<span style="color:var(--danger);">⚠️ No CSV files found. Please drop exported CSV files into the <b>web/FMList_Data</b> folder on your server.</span>');
                        return;
                    }

                    const parsedArrays = await Promise.all(fileNames.map(async file => {
                        const response = await fetch('/api/fmlist-file/' + encodeURIComponent(file));
                        const buf = await response.arrayBuffer();
                        const utf8 = new TextDecoder().decode(buf);
                        const lat = new TextDecoder('iso-8859-1').decode(buf);
                        
                        const bad = s => (s.match(/\\uFFFD/g)||[]).length;
                        const txt = bad(utf8) <= bad(lat) ? utf8 : lat;
                        
                        const rows = txt.split(/\\r?\\n/).map(l => l.split(';'));
                        const h = rows.findIndex(r => r.some(col => col.trim().replace(/"/g, '') === 'Propa'));
                        if (h === -1) return[];
                        
                        const csvText =[rows[h].join(';'), ...rows.slice(h+1).map(r => r.join(';'))].join('\\n');

                        return new Promise((resolve) => {
                            Papa.parse(csvText, {
                                delimiter: ';', header: true, skipEmptyLines: true,
                                complete: res => {
                                    try { resolve(res.data.map(nrm)); } catch (err) { resolve([]); }
                                },
                                error: () => resolve([])
                            });
                        });
                    }));

                    master = dedup(parsedArrays.flat());
                    window.fmlistMaster = master; // Global reference for Modal

                    $('#loadingMsg').hide();
                    $('#filterControls').fadeIn();
                    $('#mainTabs').fadeIn();
                    
                    filters();
                    readUrlParams(); 
                    apply();
                    
                    // Check if we need to automatically open the media modal (from Share URL)
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('playMedia')) {
                        const playId = urlParams.get('playMedia');
                        setTimeout(() => { openMediaModal(playId); }, 300); // Slight delay for smooth UI transition
                    }

                } catch(e) {
                    $('#loadingMsg').html('<span style="color:var(--danger);">⚠️ Error loading data: ' + e.message + '</span>');
                }
            }

            function updateMultiBtnText(selector, textId) {
                const checked = $(selector + ':checked').map(function(){ return $(this).parent().text().trim(); }).get();
                if (checked.length === 0) {
                    $('#' + textId).text('All');
                } else if (checked.length === 1) {
                    $('#' + textId).text(checked[0]);
                } else {
                    $('#' + textId).text(checked.length + ' selected');
                }
            }

            $(document).on('change', '.year-cb', function() { updateMultiBtnText('.year-cb', 'yearBtnText'); currentPage = 0; apply(); });
            $(document).on('change', '.band-cb', function() { updateMultiBtnText('.band-cb', 'bandBtnText'); currentPage = 0; apply(); });
            $(document).on('change', '.propa-cb', function() { updateMultiBtnText('.propa-cb', 'propaBtnText'); currentPage = 0; apply(); });
            $(document).on('change', '.itu-cb', function() { updateMultiBtnText('.itu-cb', 'ituBtnText'); currentPage = 0; apply(); });

            $('#resetFilterBtn').on('click', function() {
                $('#fromDate, #toDate, #minDistance').val('');
                $('.year-cb, .band-cb, .propa-cb, .itu-cb').prop('checked', false); 
                updateMultiBtnText('.year-cb', 'yearBtnText');
                updateMultiBtnText('.band-cb', 'bandBtnText');
                updateMultiBtnText('.propa-cb', 'propaBtnText');
                updateMultiBtnText('.itu-cb', 'ituBtnText');
                $('#rdsOnlyChk').prop('checked', false); rdsOnly = false;  
                
                // Clear table state manually as well
                globalTbSearch = '';
                globalTbSort = null;
                currentPage = 0;
                apply();
            });

            $('#sortCriteria').on('change', function() {
                sortCriteria = this.value;   
                currentPage = 0;             
                apply();
            });

            $('#showAllBtn').on('click', () => buildTable(currentList));

            $('#prevPage').on('click', () => {
                if (currentPage > 0) { currentPage--; apply(); }
            });
            
            $('#nextPage').on('click', () => {
                const uniqueCountries = new Set(currentList.map(r => r.Country)).size;
                const totalPages = Math.ceil(uniqueCountries / pageSize);
                if (currentPage < totalPages - 1) { currentPage++; apply(); }
            });

            // Handle direction chart toggle
            $('#aziMetric').on('change', function() {
                currentAziMetric = this.value;
                renderAziChart(currentList);
            });

            function filters() {
                const uniqueYears =[...new Set(master.map(r => r.Year))].filter(Boolean).sort((a,b)=>b-a);
                const yearHtml = uniqueYears.map(y => \`<label onclick="event.stopPropagation();"><input type="checkbox" value="\${y}" class="year-cb"> <span>\${y}</span></label>\`).join('');
                
                const bandOptions =[...new Set(master.map(r => r.Band))].filter(Boolean).sort();
                const bandHtml = bandOptions.map(b => \`<label onclick="event.stopPropagation();"><input type="checkbox" value="\${b}" class="band-cb"> <span>\${b}</span></label>\`).join('');

                const propaOptions =[...new Set(master.map(r => r.Propa))].filter(Boolean).sort();
                const propaHtml = propaOptions.map(p => \`<label onclick="event.stopPropagation();"><input type="checkbox" value="\${p}" class="propa-cb"> <span>\${p}</span></label>\`).join('');

                const ituOptions =[...new Set(master.map(r => r.ITU))].filter(Boolean).sort();
                const ituHtml = ituOptions.map(c => \`<label onclick="event.stopPropagation();"><input type="checkbox" value="\${c}" class="itu-cb"> <span>\${ITU2NAME[c] || c}</span></label>\`).join('');

                $('#yearDropdownMenu').html(yearHtml);
                $('#bandDropdownMenu').html(bandHtml);
                $('#propaDropdownMenu').html(propaHtml);
                $('#ituDropdownMenu').html(ituHtml);

                if (!$('#rdsOnlyChk').length) {
                    $('#filterBar').append(\`
                        <div class="filter-group" style="flex-direction:row; align-items:center; gap:8px; height:38px; margin-left:10px;">
                            <input type="checkbox" id="rdsOnlyChk" style="margin:0; width:18px; height:18px;">
                            <span style="color:#fff; font-weight:normal; font-size:14px;">Show RDS only</span>
                        </div>
                    \`);
                    $('#rdsOnlyChk').on('change', function () { rdsOnly = this.checked; currentPage = 0; apply(); });
                }

                $('#fromDate,#toDate,#minDistance').off('change input').on('change input', function() {
                    currentPage = 0;
                    apply();
                });
            }

            function apply() {
                const minDist = parseFloat($('#minDistance').val()) || 0;
                const f = $('#fromDate').val();
                const t = $('#toDate').val();
                
                const yArr = $('.year-cb:checked').map(function(){ return this.value; }).get();
                const bArr = $('.band-cb:checked').map(function(){ return this.value; }).get();
                const pArr = $('.propa-cb:checked').map(function(){ return this.value; }).get();
                const iArr = $('.itu-cb:checked').map(function(){ return this.value; }).get();
                
                const isRdsLike = r => r.RDS === 'X' || /via\\s+fmdx\\.org\\s+webserver/i.test(r.Remarks || '');
                
                const list = master.filter(r =>
                    (yArr.length === 0 || yArr.includes(String(r.Year))) && 
                    (bArr.length === 0 || bArr.includes(r.Band)) && 
                    (pArr.length === 0 || pArr.includes(r.Propa)) && 
                    (iArr.length === 0 || iArr.includes(r.ITU)) &&
                    (!f || r.DateISO >= f) && (!t || r.DateISO <= t) && 
                    (r.DistanceKm >= minDist) && (!rdsOnly || isRdsLike(r))
                );
                
                const params = new URLSearchParams();
                if (f) params.set('from', f);
                if (t) params.set('to', t);
                if (minDist > 0) params.set('km', minDist);
                if (rdsOnly) params.set('rds', 'true');
                if (yArr.length > 0) params.set('year', yArr.join(','));
                if (bArr.length > 0) params.set('band', bArr.join(','));
                if (pArr.length > 0) params.set('propa', pArr.join(','));
                if (iArr.length > 0) params.set('itu', iArr.join(','));
                if (sortCriteria !== 'logs') params.set('sort', sortCriteria);
                if (currentPage > 0) params.set('page', currentPage);

                // Preserve table state and media modal in URL if they exist
                const currentUrlParams = new URLSearchParams(window.location.search);
                if (currentUrlParams.has('playMedia')) params.set('playMedia', currentUrlParams.get('playMedia'));
                if (currentUrlParams.has('tbSearch')) params.set('tbSearch', currentUrlParams.get('tbSearch'));
                if (currentUrlParams.has('tbSort')) params.set('tbSort', currentUrlParams.get('tbSort'));

                const newQuery = params.toString();
                const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
                window.history.replaceState(null, '', newUrl);

                if (dayChart) { dayChart.destroy(); dayChart = null; }
                $('#dayChartWrap').hide();
                
                render(list); 
            }

            function render(l) {
                currentList = l;
                summary(l); 
                landChart(l); 
                buildMonthChart(l);
                buildTable(l);
                buildStats(l);
            }

            function summary(l) {
                const uniqueDays = new Set(l.map(r => r.DateISO).filter(Boolean)).size;
                const box = $('#summary');
                if (!l.length) { box.hide(); return; }

                const fre = l.map(r => r.MHz).filter(Boolean);
                const c =[...new Set(l.map(r => r.Country))];
                const dates = l.map(r => r.DateISO).filter(Boolean).sort();
                const propa = {};
                l.forEach(r => { if (!r.DistanceKm) return; (propa[r.Propa] = propa[r.Propa] ||[]).push(r.DistanceKm); });
                const lines = Object.entries(propa).map(([k, a]) => \`<li>\${k}: \${Math.min(...a)}–\${Math.max(...a)} km</li>\`).join('');

                box.html(\`
                    <h3 style="margin-top:0; color:var(--accent-hover);">Selection Summary</h3>
                    <div class="summary-content-wrapper">
                        <div>
                            <ul>
                                <li><b>Logs:</b> \${l.length}</li>
                                <li><b>Countries:</b> \${c.length}</li>
                                <li><b>Unique days:</b> \${uniqueDays}</li>
                                <li><b>Frequency:</b> \${fre.length ? Math.min(...fre).toFixed(2) : '–'}–\${fre.length ? Math.max(...fre).toFixed(2) : '–'} MHz</li>
                                <li><b>Period:</b> \${dates[0] || ''} to \${dates.at(-1) || ''}</li>
                            </ul>
                        </div>
                        <div>
                            <ul>\${lines.length > 0 ? lines : '<li>-</li>'}</ul>
                        </div>
                    </div>
                \`).show();
            }

            function landChart(l) {
                const cnt = {}, daySets = {};
                l.forEach(r => {
                    cnt[r.Country] = (cnt[r.Country] || 0) + 1;
                    if (!daySets[r.Country]) daySets[r.Country] = new Set();
                    if (r.DateISO) daySets[r.Country].add(r.DateISO);
                });

                const combined = Object.keys(cnt).map(country => ({ country, logs: cnt[country], days: daySets[country] ? daySets[country].size : 0 }));
                combined.sort((a, b) => b[sortCriteria] - a[sortCriteria]);

                const totalPages = Math.ceil(combined.length / pageSize) || 1;
                currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));
                const pageArr = combined.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

                const labels = pageArr.map(o => o.country);
                const logsData = pageArr.map(o => o.logs);
                const daysData = pageArr.map(o => o.days);

                $('#chartControls').show();
                $('#pageInfo').text(\`\${currentPage + 1}/\${totalPages}\`);
                $('#prevPage').prop('disabled', currentPage === 0);
                $('#nextPage').prop('disabled', currentPage === totalPages - 1);

                $('#charts').show(); 
                const wrap = document.getElementById('chartWrap');
                wrap.style.display = 'block';

                const cv = document.getElementById('countryChart');
                if (chart) chart.destroy();                   

                cv.setAttribute('width', innerWidth(wrap));  
                cv.setAttribute('height', labels.length * 28 + 50);

                chart = new Chart(cv, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets:[
                            { label: "Logs", data: logsData, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 3 },
                            { label: "Days", data: daysData, backgroundColor: 'rgba(168, 85, 247, 0.7)', borderColor: '#a855f7', borderWidth: 1, borderRadius: 3 }
                        ]
                    },
                    options: {
                        indexAxis: 'y', responsive: false, maintainAspectRatio: false,
                        // Fjernet 'index' modusen her for å unngå at landene hopper feil!
                        scales: { 
                            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                            y: { grid: { display: false }, ticks: { autoSkip: false, color: '#e2e8f0' } }
                        },
                        plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } },
                        onClick: (e, els) => {
                            if (!els.length) return;
                            const land = chart.data.labels[els[0].index];
                            const code = Object.keys(ITU2NAME).find(k => ITU2NAME[k] === land) || land;
                            
                            const checkbox = document.querySelector(\`.itu-cb[value="\${code}"]\`);
                            if (checkbox) {
                                $('.itu-cb').prop('checked', false); 
                                checkbox.checked = true;
                                updateMultiBtnText('.itu-cb', 'ituBtnText');
                                currentPage = 0; 
                                apply();
                            }
                        }
                    }
                });
            }

            function buildMonthChart(list) {
                if (dayChart) { dayChart.destroy(); dayChart = null; $('#dayChartWrap').hide(); }
                
                const yArr = $('.year-cb:checked').map(function(){ return this.value; }).get();
                let uniqueYears = yArr.map(Number).sort((a,b)=>a-b);
                
                if (uniqueYears.length === 0) {
                    uniqueYears =[...new Set(list.map(r => r.Year))].filter(Boolean).sort((a,b)=>a-b);
                }
                
                const titleElem = document.getElementById('monthChartTitle');
                if (titleElem) {
                    titleElem.textContent = uniqueYears.length === 1 ? \`Number of logged days per month – \${uniqueYears[0]}\` : \`Number of logged days per month (Compared)\`;
                }

                const colors =['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#d946ef', '#06b6d4', '#f97316', '#84cc16', '#ec4899'];

                const datasets = uniqueYears.map((yr, idx) => {
                    const monthSets = Array.from({length:12}, () => new Set());
                    list.forEach(r => {
                        if (r.Year === yr && r.DateISO) {
                            const [, m] = r.DateISO.split('-');
                            monthSets[+m-1].add(r.DateISO);
                        }
                    });
                    const counts = monthSets.map(s => s.size);
                    const c = colors[idx % colors.length];
                    
                    return {
                        label: String(yr),
                        data: counts,
                        backgroundColor: c + 'A0',
                        borderColor: c,
                        borderWidth: 1,
                        borderRadius: 3
                    };
                });

                const totalCounts = datasets.reduce((sum, ds) => sum + ds.data.reduce((a,b)=>a+b, 0), 0);
                if (totalCounts === 0) { $('#monthCharts, #dayChartWrap').hide(); return; }

                const cv = document.getElementById('monthChart');
                const cardElem = document.getElementById('monthCharts');

                if (monthChart) monthChart.destroy();
                cardElem.style.display = 'block';
                const cardWidth = innerWidth(cardElem) || 600;

                cv.setAttribute('width', cardWidth);
                cv.setAttribute('height', FIXED_H);
                cv.style.height = FIXED_H + 'px';

                monthChart = new Chart(cv, {
                    type: 'bar',
                    data: { labels: MONTH_LABELS_EN, datasets: datasets },
                    options: {
                        responsive: false, maintainAspectRatio: false, 
                        // Bruker 'nearest' for å unngå å blande tooltip og år
                        interaction: { mode: 'nearest', intersect: false },
                        scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } },
                        plugins: { legend: { display: uniqueYears.length > 1, labels: { color: '#cbd5e1' } } },
                        onClick: (_e, els) => {
                            if (!els.length) return;
                            const clickedMonthIdx = els[0].index;
                            const datasetIndex = els[0].datasetIndex;
                            const targetYear = parseInt(datasets[datasetIndex].label);
                            buildDayChart(currentList, targetYear, clickedMonthIdx);
                        }
                    }
                });

                $('#monthCharts').show();
            }

            function buildDayChart(list, year, monthIdx) {
                const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();   
                const dayMap = Array.from({ length: daysInMonth }, () => 0);

                list.forEach(r => {
                    if (!r.DateISO) return;
                    const[y, m, d] = r.DateISO.split('-');
                    if (+y === year && +m === monthIdx + 1) dayMap[+d - 1]++;               
                });

                const labels = dayMap.map((_, i) => String(i + 1).padStart(2, '0'));
                if (!labels.length) { $('#dayChartWrap').hide(); return; }

                const wrap = document.getElementById('dayChartWrap');
                wrap.style.display = 'block';                
                const cardWidth = innerWidth(wrap) || 600;

                let cv;
                if (dayChart) {
                    dayChart.destroy();                        
                    cv = document.createElement('canvas');     
                    cv.id = 'dayChart';
                    wrap.querySelector('canvas')?.replaceWith(cv);
                } else {
                    cv = document.getElementById('dayChart');  
                }
                cv.setAttribute('width', cardWidth);
                cv.setAttribute('height', FIXED_H);          

                const bgColors = dayMap.map(c => c === 0 ? 'rgba(120,120,120,0.1)' : c === 1 ? 'rgba(245,158,11,0.8)' : 'rgba(59,130,246,0.8)');

                dayChart = new Chart(cv, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets:[{ label: 'Logs', data: dayMap, backgroundColor: bgColors, borderColor: bgColors.map(c => c.replace(/0\\.\\d+\\)$/, '1)')), borderWidth: 1, borderRadius: 2 }]
                    },
                    options: {
                        responsive: false, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        onClick: (e, els) => {
                            if (!els.length) return;
                            const idx = els[0].index;
                            const dayStr = labels[idx];                    
                            const dateISO = \`\${year}-\${String(monthIdx+1).padStart(2,'0')}-\${dayStr}\`;

                            buildTable(currentList.filter(r => r.DateISO === dateISO));
                            const domEvt = e.native ?? e;
                            if (domEvt.ctrlKey || domEvt.metaKey) openLogMap(year, monthIdx, dayStr);
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { afterBody: () => 'Click to filter table – Ctrl/Cmd-click opens FMList map', label: ctx => \`\${ctx.parsed.y} logs\` } }
                        },
                        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
                    }
                });

                $('#dayChartTitle').text(\`\${MONTH_LABELS_EN[monthIdx]} \${year}\`);
            }

            function buildTable(l) {
                const tableWrap = $('#tableWrap');
                if (!l.length) {
                    if (table) { 
                        table.off('order.dt search.dt');
                        table.destroy(); 
                        table = null; 
                        $('#logTable').empty(); 
                    }
                    tableWrap.hide(); return;
                }

                function info(r) {
                    const all = master.filter(m => m.MHz === r.MHz && m.Program === r.Program && m.Location === r.Location);
                    if (all.length === 1) return '<span class="first-logged">Logged once</span>';
                    const counts = {};
                    all.forEach(m => counts[m.Propa] = (counts[m.Propa]||0) + 1);
                    return Object.entries(counts).sort(([,a],[,b]) => b - a).map(([p,c]) => \`\${p}: \${c}\`).join(', ');
                }

                const rows = l.map(r => {
                    const dateTimeSort = (r.DateISO || '0000-00-00') + ' ' + (r.UTC || '0000');
                    const rowData = [ dateTimeSort ]; 
                    rowData._orig = r;
                    
                    rowData.push(r.Propa || '');
                    rowData.push(r.Date || '');
                    rowData.push(r.UTC || '');
                    rowData.push(r.MHz !== null && r.MHz !== undefined ? r.MHz : '');
                    rowData.push(r.ITU || '');
                    
                    const detailsHtml = info(r);
                    rowData.push(r.Program ? \`\${r.Program}<br><small>\${detailsHtml}</small>\` : '');
                    
                    rowData.push(r.Location || '');
                    rowData.push(r.kW !== null && r.kW !== undefined ? r.kW : '');
                    rowData.push(r.DistanceKm !== null && r.DistanceKm !== undefined ? r.DistanceKm : '');
                    rowData.push(r.QTF !== null && r.QTF !== undefined ? r.QTF : '');
                    rowData.push(r.Details || '');
                    rowData.push(r.Remarks || '');
                    rowData.push(r.logId || '');
                    
                    return rowData;
                });

                tableWrap.show();
                if (l.length && l !== currentList) $('#showAllBtn').show();
                else $('#showAllBtn').hide();

                if (table) {
                    table.clear().rows.add(rows).columns.adjust().draw(true);
                } else {
                    // Start array based on tbSort variable or default
                    const defaultOrder = globalTbSort ? [[ parseInt(globalTbSort.split(',')[0]), globalTbSort.split(',')[1] ]] : [[0, 'desc']];

                    table = $('#logTable').DataTable({
                        data: rows,
                        search: { search: globalTbSearch },
                        columns:[
                            { title: 'SortDate', data: 0, visible: false, searchable: false },
                            { title: 'Propa', data: 1, orderable: false, 
                                render: function(d, t, row) {
                                    if(t !== 'display') return d;
                                    const r = row._orig;
                                    const id = r.logId;
                                    let html = \`<div style="font-weight:600; margin-bottom:6px; color:#fff;">\${d || '-'}</div>\`;
                                    if(id) {
                                        html += \`<div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                                                    <span class="badge-btn" title="ID: \${id}\\nClick to copy" onclick="event.stopPropagation(); copyLogId('\${id}', this)">🆔 ID</span>
                                                 </div>\`;
                                    }
                                    return html;
                                }
                            },
                            { title: 'Date', data: 2, orderable: true, orderData:[0] },
                            { title: 'UTC', data: 3, orderable: true, orderData:[0] },
                            { title: 'MHz', data: 4, orderable: true, 
                              render: function(d, t) { 
                                  if(d === '') return '';
                                  return (t === 'display' || t === 'filter') ? Number(d).toFixed(2) : d; 
                              } 
                            },
                            { title: 'ITU', data: 5, orderable: false },
                            { title: 'Program', data: 6, orderable: false },
                            { title: 'Location', data: 7, orderable: false },
                            { title: 'kW', data: 8, orderable: true, 
                              render: function(d, t) { 
                                  if(d === '') return '';
                                  return (t === 'display' || t === 'filter') ? d + ' kW' : d; 
                              } 
                            },
                            { title: 'Dist', data: 9, orderable: true, 
                              render: function(d, t) { 
                                  if(d === '') return '';
                                  return (t === 'display' || t === 'filter') ? d + ' km' : d; 
                              } 
                            },
                            { title: 'QTF', data: 10, orderable: false, 
                              render: function(d, t) { 
                                  if(d === '') return '';
                                  return (t === 'display' || t === 'filter') ? d + '°' : d; 
                              } 
                            },
                            { title: 'Details', data: 11, orderable: false },
                            { title: 'Remarks', data: 12, orderable: false },
                            { title: 'Media', data: 13, orderable: false, searchable: false,
                                render: function(d, t) {
                                    if(t !== 'display') return d;
                                    const media = d ? window.fmlistMedia[d] : null;
                                    if(!media) return '';
                                    
                                    const isVid =['mp4','webm','m4v'].includes(media.ext);
                                    const btnClass = isVid ? 'play-btn-modern video' : 'play-btn-modern';
                                    const titleStr = isVid ? 'Play Video' : 'Play Audio';
                                    
                                    // Knappen er nå HELT TOM inni, fordi ikonet tegnes av CSS-bakgrunnen
                                    return \`
                                    <div style="display:flex; justify-content:center;">
                                        <button class="\${btnClass}" title="\${titleStr}" onclick="event.stopPropagation(); openMediaModal('\${d}')"></button>
                                    </div>\`;
                                }
                            }
                        ],
                        pageLength: 25, 
                        order: defaultOrder,
                        scrollX: true, 
                        deferRender: true, 
                        autoWidth: false
                    });
                    
                    // Listen for changes in sorting and search to keep URL strictly synced
                    table.on('order.dt search.dt', function() {
                        const order = table.order();
                        const search = table.search();
                        
                        const urlObj = new URL(window.location.href);
                        
                        if (order && order.length > 0) {
                            urlObj.searchParams.set('tbSort', order[0][0] + ',' + order[0][1]);
                            globalTbSort = order[0][0] + ',' + order[0][1];
                        }
                        
                        if (search) {
                            urlObj.searchParams.set('tbSearch', search);
                            globalTbSearch = search;
                        } else {
                            urlObj.searchParams.delete('tbSearch');
                            globalTbSearch = '';
                        }
                        
                        window.history.replaceState(null, '', urlObj.toString());
                    });
                    
                    table.on('page.dt', function () {
                        setTimeout(() => { const top = $('#tableWrap').offset().top; window.scrollTo({ top, behavior: 'smooth' }); }, 0);
                    });
                    
                    $('#logTable tbody').on('click', 'tr', function () {
                        const dtRow = table.row(this);
                        if (dtRow.child.isShown()) {
                            dtRow.child.hide(); $(this).removeClass('shown'); return;
                        }
                        const rowArr = dtRow.data();
                        const r = rowArr._orig;
                        const histEvents = master.filter(m => m.MHz === r.MHz && m.Program === r.Program && m.Location === r.Location).sort((a,b) => a.DateISO.localeCompare(b.DateISO));

                        const listItems = histEvents.map(e => \`<li>\${fmtDateISOtoNO(e.DateISO)} \${fmtUTCtoTime(e.UTC)} – \${e.Propa || ''}\${e.Remarks ? ' – ' + e.Remarks : ''}</li>\`).join('');
                        dtRow.child(\`<div class="child-details"><strong>History:</strong><ul style="margin:0.5em 0 0 1em; padding:0;">\${listItems}</ul></div>\`).show();
                        $(this).addClass('shown');
                    });
                    setTimeout(() => table.columns.adjust(), 100);
                }
            }

            function renderAziChart(list) {
                const bins = Array(36).fill(0);
                list.forEach(r => {
                    if(r.QTF !== null && r.QTF !== undefined) {
                        let deg = Math.round(r.QTF) % 360;
                        if(deg < 0) deg += 360;
                        const binIdx = Math.floor(deg / 10) % 36;
                        
                        if(currentAziMetric === 'logs') {
                            bins[binIdx]++;
                        } else {
                            if(r.DistanceKm > bins[binIdx]) {
                                bins[binIdx] = r.DistanceKm;
                            }
                        }
                    }
                });

                const labels = Array.from({length:36}, (_, i) => \`\${i*10}°\`);
                
                if(aziChart) aziChart.destroy();
                aziChart = new Chart(document.getElementById('aziChart'), {
                    type: 'radar',
                    data: { 
                        labels: labels, 
                        datasets:[{ 
                            label: currentAziMetric === 'logs' ? 'Logs' : 'Max Distance (km)', 
                            data: bins, 
                            backgroundColor: 'rgba(168, 85, 247, 0.4)', 
                            borderColor: '#a855f7', 
                            pointBackgroundColor: '#a855f7',
                            pointRadius: 2
                        }] 
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { 
                            r: { 
                                angleLines: { color: 'rgba(255,255,255,0.1)' }, 
                                grid: { color: 'rgba(255,255,255,0.1)' }, 
                                pointLabels: { 
                                    color: '#e2e8f0', 
                                    font: { size: 11 },
                                    callback: function(val, index) {
                                        return index % 3 === 0 ? val : ''; 
                                    }
                                }, 
                                ticks: { display: false, beginAtZero: true } 
                            } 
                        }, 
                        plugins: { 
                            legend: { display: false },
                            tooltip: { 
                                callbacks: { 
                                    title: (ctx) => \`\${ctx[0].label} - \${parseInt(ctx[0].label)+9}°\`
                                } 
                            }
                        } 
                    }
                });
            }

            function buildStats(list) {
                // Top 10 Transmitters
                const txCount = {};
                list.forEach(r => {
                    if(!r.Program) return;
                    const key = r.Program + (r.Location ? " ("+r.Location+")" : "");
                    txCount[key] = (txCount[key] || 0) + 1;
                });
                const topTx = Object.entries(txCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
                $('#stat-top-tx').html(topTx.length ? topTx.map(t => \`<li><b>\${t[0]}</b>: \${t[1]} logs</li>\`).join('') : '<li>No data</li>');

                // Longest distances
                const dists = list.filter(r => r.DistanceKm > 0).sort((a,b)=>b.DistanceKm - a.DistanceKm);
                const uniqueDists =[];
                const seenDistTx = new Set();
                for(let r of dists) {
                    if(uniqueDists.length >= 10) break;
                    const key = r.Program + r.Location;
                    if(!seenDistTx.has(key)) { seenDistTx.add(key); uniqueDists.push(r); }
                }
                $('#stat-longest-dist').html(uniqueDists.length ? uniqueDists.map(r => \`<li><b>\${r.DistanceKm} km</b>: \${r.Program} (\${r.Location}) <span class="small-text">[\${fmtDateISOtoNO(r.DateISO)}]</span></li>\`).join('') : '<li>No data</li>');

                // Weakest transmitters
                const weak = list.filter(r => r.kW > 0).sort((a,b)=>a.kW - b.kW);
                const uniqueWeak =[];
                const seenWeakTx = new Set();
                for(let r of weak) {
                    if(uniqueWeak.length >= 10) break;
                    const key = r.Program + r.Location;
                    if(!seenWeakTx.has(key)) { seenWeakTx.add(key); uniqueWeak.push(r); }
                }
                $('#stat-weakest-pwr').html(uniqueWeak.length ? uniqueWeak.map(r => \`<li><b>\${r.kW} kW</b>: \${r.Program} (\${r.Location}) <span class="small-text">[\${r.DistanceKm} km]</span></li>\`).join('') : '<li>No kW data available</li>');

                // Average distance per propa
                const propaDist = {};
                list.forEach(r => {
                    if(r.DistanceKm > 0 && r.Propa) {
                        if(!propaDist[r.Propa]) propaDist[r.Propa] = [];
                        propaDist[r.Propa].push(r.DistanceKm);
                    }
                });
                const avgHtml = Object.entries(propaDist).map(([p, arr]) => {
                    const avg = (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(0);
                    const max = Math.max(...arr).toFixed(0);
                    return \`<li><b>\${p}</b>: Average \${avg} km <span class="small-text">(Max \${max} km, \${arr.length} logs)</span></li>\`;
                }).join('');
                $('#stat-avg-dist').html(avgHtml || '<li>No data</li>');

                // Time of Day Distribution
                const hours = Array(24).fill(0);
                list.forEach(r => {
                    if (r.UTC) {
                        const utcStr = String(r.UTC).padStart(4, '0');
                        const hr = parseInt(utcStr.substring(0,2), 10);
                        if (!isNaN(hr) && hr >= 0 && hr <= 23) hours[hr]++;
                    }
                });
                const timeLabels = Array.from({length:24}, (_, i) => \`\${String(i).padStart(2,'0')}:00\`);
                
                if(timeChart) timeChart.destroy();
                timeChart = new Chart(document.getElementById('timeChart'), {
                    type: 'bar',
                    data: { labels: timeLabels, datasets:[{ label: 'Logs', data: hours, backgroundColor: '#10b981', borderRadius: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
                });

                // Frequency Distribution
                const freqBins = {};
                list.forEach(r => {
                    if(!r.MHz) return;
                    const bin = Math.floor(r.MHz);
                    freqBins[bin] = (freqBins[bin] || 0) + 1;
                });
                const fLabels = Object.keys(freqBins).sort((a,b)=>a-b);
                const fData = fLabels.map(k => freqBins[k]);
                
                if(freqChart) freqChart.destroy();
                freqChart = new Chart(document.getElementById('freqChart'), {
                    type: 'bar',
                    data: { labels: fLabels.map(l => l + ' MHz'), datasets:[{ label: 'Logs', data: fData, backgroundColor: '#3b82f6', borderRadius: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
                });

                // Render Azimuth Chart
                renderAziChart(list);
            }

            // Start loading process
            loadServerFiles();
        });
        </script>
    </body>
    </html>
    `);
});

module.exports = { provides: 'fmlist_analyzer' };