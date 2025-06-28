const fs = require('fs');
const path = require('path');
const https = require('https');
const chalk = require('chalk');

const ICONS_DIR = path.join(__dirname, '../lucide-icons');
const GITHUB_API_URL = 'https://api.github.com/repos/lucide-icons/lucide/git/trees/main?recursive=1';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/';
const USER_AGENT = 'lucide-downloader-script';
const PARALLEL_LIMIT = 16;
const RETRY_LIMIT = 3;

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

function downloadFile(url, dest, attempt = 1) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode !== 200) {
        if (attempt < RETRY_LIMIT) {
          setTimeout(() => {
            downloadFile(url, dest, attempt + 1).then(resolve).catch(reject);
          }, 500 * attempt);
        } else {
          reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        }
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {
        if (attempt < RETRY_LIMIT) {
          setTimeout(() => {
            downloadFile(url, dest, attempt + 1).then(resolve).catch(reject);
          }, 500 * attempt);
        } else {
          reject(err);
        }
      });
    });
  });
}

async function downloadAll(files) {
  let idx = 0;
  let active = 0;
  let done = 0;
  return new Promise((resolve, reject) => {
    function next() {
      if (done === files.length) return resolve();
      while (active < PARALLEL_LIMIT && idx < files.length) {
        const { url, dest } = files[idx++];
        active++;
        downloadFile(url, dest)
          .then(() => {
            process.stdout.write('.');
            done++;
            active--;
            next();
          })
          .catch((err) => {
            console.error(`\nFailed to download ${url}: ${err.message}`);
            done++;
            active--;
            next();
          });
      }
    }
    next();
  });
}

async function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR);
  }
  console.log(chalk.blue('🔽 Fetching icon list from GitHub (recursive tree)...'));
  const tree = await fetchJson(GITHUB_API_URL);
  const jsonIcons = tree.tree.filter(entry => entry.path.startsWith('icons/') && entry.path.endsWith('.json'));
  console.log(chalk.yellow(`🔎 Found ${jsonIcons.length} icon JSON files. Downloading in parallel...`));
  const files = jsonIcons.map(icon => ({
    url: RAW_BASE_URL + icon.path,
    dest: path.join(ICONS_DIR, path.basename(icon.path)),
  }));
  await downloadAll(files);
  console.log(chalk.green(`\n✅ Downloaded ${jsonIcons.length} icon JSON files to ${ICONS_DIR}`));
}

main().catch(err => {
  console.error('Error downloading Lucide icons:', err);
  process.exit(1);
}); 