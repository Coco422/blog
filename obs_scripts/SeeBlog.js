const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

async function findHugo() {
    // Try to find Hugo in common locations
    const possiblePaths = [
        'hugo', // From PATH
        '/opt/homebrew/bin/hugo', // macOS Homebrew
        '/usr/local/bin/hugo', // Common Linux/macOS location
        '/usr/bin/hugo', // Common Linux location
        'C:\\Hugo\\bin\\hugo.exe' // Windows
    ];
    
    for (const path of possiblePaths) {
        try {
            await exec(`${path} version`);
            return path;
        } catch (e) {
            // Continue trying other paths
        }
    }
    
    throw new Error("Hugo not found. Please install Hugo or add it to your PATH.");
}

async function executeCommand() {
    try {
        // Find Hugo executable
        const hugoPath = await findHugo();
        
        // Start Hugo server with watch mode
        const { stdout, stderr } = await exec(hugoPath + ' server -w', {
            cwd: app.fileManager.vault.adapter.basePath
        });
        
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        
        if (stdout) {
            new Notice("Hugo server started successfully. Visit http://localhost:1313 to preview your blog.");
        } else {
            new Notice("Failed to start Hugo server: " + stderr);
        }
    } catch (error) {
        // Error executing Hugo
        console.error('Error:', error);
        new Notice("Error starting Hugo server: " + error.message);
    }
}

module.exports = async function(context, req) {
    await executeCommand();
}
