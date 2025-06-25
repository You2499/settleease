const fs = require('fs');
const path = require('path');
const https = require('https');

const ICONS_DIR = path.join(__dirname, '../lucide-icons');
const GITHUB_API_URL = 'https://api.github.com/repos/lucide-icons/lucide/contents/icons';
const USER_AGENT = 'lucide-downloader-script';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR);
  }
  console.log('Fetching icon list from GitHub...');
  const icons = await fetchJson(GITHUB_API_URL);
  const jsonIcons = icons.filter(icon => icon.name.endsWith('.json'));
  console.log(`Found ${jsonIcons.length} icon JSON files. Downloading...`);
  for (const icon of jsonIcons) {
    const dest = path.join(ICONS_DIR, icon.name);
    await downloadFile(icon.download_url, dest);
    process.stdout.write('.');
  }
  console.log(`\nDownloaded ${jsonIcons.length} icon JSON files to ${ICONS_DIR}`);
}

main().catch(err => {
  console.error('Error downloading Lucide icons:', err);
  process.exit(1);
}); 