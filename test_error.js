const {execSync} = require('child_process');
try {
  execSync(process.execPath + ' -e "console.error(\'ERR\'); process.exit(1)"', {encoding: 'utf8', stdio: ['pipe','pipe','pipe']});
} catch (e) {
  console.log('typeof stderr:', typeof e.stderr);
  console.log('stderr instanceof Buffer:', e.stderr instanceof Buffer);
  console.log('stderr:', JSON.stringify(e.stderr));
}
