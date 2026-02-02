const axios = require('axios');
const pkg = require('../../package.json');
const Output = require('../ui/output');
const Progress = require('../ui/progress');

exports.command = 'update';
exports.desc = 'Check for updates from npm registry';

exports.handler = async (argv) => {
  const output = new Output(argv);
  const progress = new Progress();

  try {
    const result = await progress.withSpinner(
      checkForUpdates(),
      'Checking for updates...',
      null,
      'Failed to check for updates'
    );

    if (result.hasUpdate) {
      output.printHeader('Update Available');
      
      console.log(`${output.noColor ? 'Current version:' : '\x1b[1;37mCurrent version:\x1b[0m'} ${output.noColor ? result.currentVersion : '\x1b[1;31m' + result.currentVersion + '\x1b[0m'}`);
      console.log(`${output.noColor ? 'Latest version:' : '\x1b[1;37mLatest version:\x1b[0m'}  ${output.noColor ? result.latestVersion : '\x1b[1;32m' + result.latestVersion + '\x1b[0m'}`);
      
      output.printSeparator();
      
      if (output.noColor) {
        output.info('To update, run:');
        console.log(`  npm install -g ${pkg.name}@latest`);
      } else {
        console.log('\x1b[1;36mTo update, run:\x1b[0m');
        console.log(`  \x1b[1;33mnpm install -g ${pkg.name}@latest\x1b[0m`);
      }
      
      output.printSeparator();
      
      if (result.releaseNotes && result.releaseNotes.length > 0) {
        output.printHeader('Release Notes');
        result.releaseNotes.forEach(note => {
          console.log(`• ${note}`);
        });
        output.printSeparator();
      }
      
      output.warning('Please update to get the latest features and bug fixes!');
    } else {
      output.success(`You are using the latest version (${result.currentVersion})`);
      output.info('No updates available at this time.');
    }
  } catch (error) {
    output.error(error.message);
    if (argv.debug) {
      output.debug('Update check error:', error);
    }
    process.exit(1);
  }
};

async function checkForUpdates() {
  try {
    const [registryResponse, githubResponse] = await Promise.allSettled([
      axios.get(`https://registry.npmjs.org/${pkg.name}/latest`, {
        timeout: 10000
      }),
      axios.get(`https://api.github.com/repos/iam-rizz/vzcli.js/releases/latest`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'vzcli-update-checker'
        }
      })
    ]);

    let latestVersion, releaseNotes = [];

    if (registryResponse.status === 'fulfilled') {
      latestVersion = registryResponse.value.data.version;
    } else {
      throw new Error('Failed to fetch version from npm registry');
    }

    if (githubResponse.status === 'fulfilled') {
      const release = githubResponse.value.data;
      if (release.body) {
        releaseNotes = release.body
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5);
      }
    }

    const currentVersion = pkg.version;
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseNotes
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Package not found in npm registry');
    }
    throw new Error(`Failed to check for updates: ${error.message}`);
  }
}

function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;

    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }

  return 0;
}