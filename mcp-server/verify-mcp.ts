import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyMCP() {
  console.log('--- MCP Server Verification ---');
  
  const serverPath = path.join(__dirname, 'src', 'index.ts');
  const child = spawn('npx', ['tsx', serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    shell: true
  });

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.stderr.on('data', (data) => {
    errorOutput += data.toString();
    if (data.toString().includes('Firebase MCP Server running on stdio')) {
      console.log('✅ Server started successfully.');
      
      // Send tools/list request
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }) + '\n';
      
      child.stdin.write(request);
    }
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      child.kill();
      
      if (output.includes('tools')) {
        console.log('✅ Server responded to tools/list.');
        const result = JSON.parse(output.split('\n').find(line => line.includes('"result"')) || '{}');
        console.log(`📦 Found ${result.result?.tools?.length || 0} tools.`);
        resolve(true);
      } else {
        console.error('❌ Server failed to respond to tools/list.');
        console.error('STDOUT:', output);
        console.error('STDERR:', errorOutput);
        resolve(false);
      }
    }, 5000);
  });
}

verifyMCP().then(success => {
  if (success) {
    console.log('\n✨ MCP Server protocol is working correctly.');
    console.log('⚠️  Note: Database tools will still require valid Firebase credentials.');
  } else {
    console.log('\n❌ MCP Server has protocol issues.');
  }
  process.exit(success ? 0 : 1);
});
