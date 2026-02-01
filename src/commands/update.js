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
      output.info(`Current version: ${result.currentVersion}`);
      output.success(`Latest version: ${result.latestVersion}`);
      output.info('');
      output.info('To update, run:');
      output.log(`  npm install -g ${pkg.name}@latest`);
      output.info('');
      
      if (result.changelog) {
        output.printHeader('Recent Changes');
        output.log(result.changelog);
      }
    } else {
      output.success(`You are using the latest version (${result.currentVersion})`);
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
    const response = await axios.get(`https://registry.npmjs.org/${pkg.name}/latest`, {
      timeout: 10000
    });

    const latestVersion = response.data.version;
    const currentVersion = pkg.version;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      changelog: response.data.description || null
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