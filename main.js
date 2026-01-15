const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LLC Governance Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .btn { padding: 15px 30px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
        .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .debug { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏠 LLC Governance Dashboard</h1>
        <p>Member-managed governance and finance hub for families and LLCs</p>
        
        <div>
            <button class="btn btn-primary" onclick="launchFullApp()" id="launchBtn">🚀 Launch Full App</button>
            <button class="btn btn-warning" onclick="testBackend()" id="testBtn">🧪 Test Backend</button>
            <button class="btn btn-success" onclick="checkStatus()" id="statusBtn">Check Status</button>
        </div>
        
        <div id="status" class="status status-success">
            🟢 Standalone Mode - Ready to launch full app
        </div>
        
        <div id="debug" class="debug hidden">
            <strong>Debug Info:</strong><br>
            <span id="debugText">Loading...</span>
        </div>
    </div>
    
    <script>
        function showDebug(text) {
            const debug = document.getElementById('debug');
            const debugText = document.getElementById('debugText');
            debugText.textContent = text;
            debug.classList.remove('hidden');
        }
        
        function appendDebug(text) {
            const debugText = document.getElementById('debugText');
            debugText.textContent += '\\n' + text;
        }
        
        function launchFullApp() {
            const btn = document.getElementById('launchBtn');
            const status = document.getElementById('status');
            
            btn.disabled = true;
            btn.textContent = '🔄 Starting...';
            status.className = 'status status-error';
            status.innerHTML = '🟡 Starting backend server...';
            
            showDebug('Attempting to start backend server...');
            
            if (window.electronAPI) {
                window.electronAPI.startBackend()
                    .then(result => {
                        showDebug('Backend start result: ' + JSON.stringify(result));
                        if (result.success) {
                            setTimeout(() => checkStatus(), 3000);
                        } else {
                            throw new Error(result.error || 'Failed to start backend');
                        }
                    })
                    .catch(error => {
                        showDebug('Error: ' + error.message);
                        status.innerHTML = '🔴 Error: ' + error.message;
                        btn.textContent = '🚀 Launch Full App';
                        btn.disabled = false;
                    });
            } else {
                showDebug('electronAPI not available');
                status.innerHTML = '🔴 Error: electronAPI not available';
                btn.textContent = '🚀 Launch Full App';
                btn.disabled = false;
            }
        }
        
        function testBackend() {
            const btn = document.getElementById('testBtn');
            const status = document.getElementById('status');
            
            btn.disabled = true;
            btn.textContent = '🧪 Testing...';
            status.className = 'status status-error';
            status.innerHTML = '🟡 Testing backend startup...';
            
            showDebug('Testing backend startup process...');
            
            if (window.electronAPI) {
                window.electronAPI.testProcessSpawn()
                    .then(result => {
                        appendDebug('Process spawn test: ' + JSON.stringify(result));
                        
                        if (result.success) {
                            appendDebug('✅ Process spawning works!');
                            appendDebug('🚀 Attempting to start backend...');
                            
                            return window.electronAPI.startBackend();
                        } else {
                            throw new Error('Process spawn test failed: ' + result.error);
                        }
                    })
                    .then(result => {
                        appendDebug('Backend start result: ' + JSON.stringify(result));
                        
                        if (result.success) {
                            appendDebug('✅ Backend startup initiated!');
                            setTimeout(() => checkStatus(), 5000);
                        } else {
                            throw new Error(result.error || 'Failed to start backend');
                        }
                    })
                    .catch(error => {
                        appendDebug('❌ Error: ' + error.message);
                        status.innerHTML = '🔴 Test failed: ' + error.message;
                        btn.textContent = '🧪 Test Backend';
                        btn.disabled = false;
                    });
            } else {
                appendDebug('❌ electronAPI not available');
                status.innerHTML = '🔴 Error: electronAPI not available';
                btn.textContent = '🧪 Test Backend';
                btn.disabled = false;
            }
        }
        
        function checkStatus() {
            const status = document.getElementById('status');
            const btn = document.getElementById('launchBtn');
            const testBtn = document.getElementById('testBtn');
            
            appendDebug('Checking backend status...');
            
            fetch('http://localhost:3000/api/household/status')
                .then(response => {
                    if (response.ok) {
                        status.className = 'status status-success';
                        status.innerHTML = '🔵 Full Mode - Backend server running';
                        btn.textContent = '✅ Full App Running';
                        btn.disabled = true;
                        testBtn.disabled = true;
                        
                        appendDebug('🎉 Backend server is running!');
                        
                        document.querySelector('.container').innerHTML = \`
                            <h1>🏠 LLC Governance Dashboard</h1>
                            <p>Full Application Mode - All Features Available</p>
                            <div class="status status-success">
                                🔵 Full Mode Active - Backend server running on port 3000
                            </div>
                            <button class="btn btn-primary" onclick="location.reload()">Restart App</button>
                        \`;
                    } else {
                        throw new Error('Backend not responding');
                    }
                })
                .catch(error => {
                    status.className = 'status status-success';
                    status.innerHTML = '🟢 Standalone Mode - Backend server not running';
                    btn.textContent = '🚀 Launch Full App';
                    btn.disabled = false;
                    testBtn.disabled = false;
                    
                    appendDebug('Backend check failed: ' + error.message);
                });
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            showDebug('Page loaded, checking initial status...');
            checkStatus();
        });
    </script>
</body>
</html>`;

  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackendServer() {
  if (backendProcess) {
    console.log('Backend server already running');
    return { success: true, message: 'Server already running' };
  }

  console.log('Starting backend server...');
  console.log('App packaged:', app.isPackaged);
  console.log('Current directory:', __dirname);
  console.log('Process cwd:', process.cwd());
  console.log('HOME env:', process.env.HOME);
  
  // Use a simple, reliable approach - always use the user's home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (!homeDir) {
    const error = 'No HOME directory found';
    console.error(error);
    return { success: false, error: error };
  }
  
  const backendPath = path.join(homeDir, 'vassell-finance-app', 'src', 'index.js');
  const workingDir = path.join(homeDir, 'vassell-finance-app');
  
  console.log('Using home directory approach:');
  console.log('Home dir:', homeDir);
  console.log('Backend path:', backendPath);
  console.log('Working dir:', workingDir);
  
  // Check if backend file exists
  if (!fs.existsSync(backendPath)) {
    const error = `Backend file not found: ${backendPath}`;
    console.error(error);
    return { success: false, error: error };
  }
  
  // Check if working directory exists and is a directory
  if (!fs.existsSync(workingDir)) {
    const error = `Working directory does not exist: ${workingDir}`;
    console.error(error);
    return { success: false, error: error };
  }
  
  try {
    const workingDirStats = fs.statSync(workingDir);
    if (!workingDirStats.isDirectory()) {
      const error = `Working directory is not a directory: ${workingDir}`;
      console.error(error);
      return { success: false, error: error };
    }
  } catch (error) {
    const errorMsg = `Cannot access working directory ${workingDir}: ${error.message}`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
  
  console.log('Final backend path:', backendPath);
  console.log('Final working directory:', workingDir);
  console.log('Backend file exists:', fs.existsSync(backendPath));
  console.log('Working dir exists:', fs.existsSync(workingDir));
  console.log('Working dir is directory:', fs.statSync(workingDir).isDirectory());
  
  try {
    console.log('Spawning backend process...');
    console.log('Command: node', backendPath);
    console.log('Working directory:', workingDir);
    
    backendProcess = spawn('node', [backendPath], {
      cwd: workingDir,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    console.log('Backend process spawned with PID:', backendProcess.pid);

    backendProcess.stdout.on('data', (data) => {
      console.log('Backend stdout:', data.toString());
    });

    backendProcess.stderr.on('data', (data) => {
      console.log('Backend stderr:', data.toString());
    });

    backendProcess.on('close', (code) => {
      console.log('Backend server closed with code:', code);
      backendProcess = null;
    });

    backendProcess.on('error', (error) => {
      console.error('Backend process error:', error);
      backendProcess = null;
    });

    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('Backend server should be running on port 3000');
      }
    }, 3000);
    
    return { success: true, message: 'Backend server starting...' };
    
  } catch (error) {
    console.error('Error starting backend:', error);
    return { success: false, error: error.message };
  }
}

function stopBackendServer() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
    return { success: true, message: 'Backend server stopped' };
  }
  return { success: true, message: 'No backend server running' };
}

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Launch Full App',
        click: () => {
          const result = startBackendServer();
          console.log('Menu launch result:', result);
        }
      },
      {
        label: 'Stop Backend',
        click: () => {
          const result = stopBackendServer();
          console.log('Menu stop result:', result);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          stopBackendServer();
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('start-backend', () => {
  console.log('IPC: start-backend called');
  const result = startBackendServer();
  console.log('IPC: start-backend result:', result);
  return result;
});

ipcMain.handle('stop-backend', () => {
  console.log('IPC: stop-backend called');
  const result = stopBackendServer();
  console.log('IPC: stop-backend result:', result);
  return result;
});

ipcMain.handle('test-process-spawn', async () => {
  console.log('Testing process spawn capability...');
  try {
    const testProcess = spawn('echo', ['hello world'], {
      stdio: 'pipe'
    });
    
    return new Promise((resolve) => {
      testProcess.on('close', (code) => {
        console.log('Test process closed with code:', code);
        resolve({ success: true, code: code, message: 'Process spawn test successful' });
      });
      
      testProcess.on('error', (error) => {
        console.error('Test process error:', error);
        resolve({ success: false, error: error.message });
      });
      
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill();
        }
      }, 1000);
    });
  } catch (error) {
    console.error('Test process spawn failed:', error);
    return { success: false, error: error.message };
  }
});
