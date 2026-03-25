const {execSync} = require('child_process');
try {
  execSync('node -e "process.stderr.write(\'ERR\'); process.exit(1)"', {encoding: 'utf8'});
} catch (e) {
  console.log('keys:', Object.keys(e));
  console.log('message:', e.message);
  console.log('stdout:', JSON.stringify(e.stdout));
  console.log('stderr:', JSON.stringify(e.stderr));
  console.log('output:', JSON.stringify(e.output));
}
