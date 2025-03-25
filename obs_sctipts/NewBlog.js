const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

  
function getCreateTimeAsFileName() {
     var d = new Date();
     var year = d.getFullYear();
     var month = d.getMonth()+1;
     var day = d.getDate();
     var hour = d.getHours();
     var minute = d.getMinutes();
     var second = d.getSeconds();
     var time = year+"m"+month+"d"+day+"h"+hour+"m"+minute+"s"+second;
     return time;
}

  

// execute command function

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
     const fileName = getCreateTimeAsFileName()+".md";
     try {
         // Find Hugo executable
         const hugoPath = await findHugo();
         const { stdout, stderr } = await exec(hugoPath + ' new posts/' +fileName,{cwd: app.fileManager.vault.adapter.basePath});
         console.log('stdout:', stdout);
         console.log('stderr:', stderr);
         if (stdout) {
             new Notice("New Blog Created["+fileName+"]")
         } else {
             new Notice("New Blog Create Failed. "+stderr)
         }
     } catch (error) {
         // Error executing Hugo
         console.error('Error:', error);
         new Notice("Error creating blog post: " + error.message);
     }
}

  

module.exports = async function(context, req) {
    await executeCommand();
}
