const ConfigManager = require('../lib/config-manager');
const ApiClient = require('../lib/api-client');
const Output = require('../ui/output');
const Prompts = require('../ui/prompts');
const Progress = require('../ui/progress');
const Utils = require('../lib/utils');

exports.command = 'config <action>';
exports.desc = 'Manage host configurations';

exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      describe: 'Action to perform',
      choices: ['add', 'remove', 'list', 'test', 'set-default']
    })
    .option('name', {
      alias: 'n',
      describe: 'Host name',
      type: 'string'
    })
    .option('url', {
      alias: 'u',
      describe: 'API URL',
      type: 'string'
    })
    .option('key', {
      alias: 'k',
      describe: 'API Key',
      type: 'string'
    })
    .option('pass', {
      alias: 'p',
      describe: 'API Password',
      type: 'string'
    })
    .option('default', {
      alias: 'd',
      describe: 'Set as default host',
      type: 'boolean',
      default: false
    })
    .option('interactive', {
      alias: 'i',
      describe: 'Interactive mode',
      type: 'boolean',
      default: false
    })
    .example('vzcli config add production --url "https://panel.com:4083" --key "abc123" --pass "secret"')
    .example('vzcli config add -i')
    .example('vzcli config list')
    .example('vzcli config test')
    .example('vzcli config remove staging');
};

exports.handler = async (argv) => {
  const output = new Output(argv);
  const configManager = new ConfigManager();
  const progress = new Progress();

  try {
    switch (argv.action) {
      case 'add':
        await handleAdd(argv, configManager, output);
        break;
      case 'remove':
        await handleRemove(argv, configManager, output);
        break;
      case 'list':
        await handleList(configManager, output);
        break;
      case 'test':
        await handleTest(argv, configManager, output, progress);
        break;
      case 'set-default':
        await handleSetDefault(argv, configManager, output);
        break;
      default:
        output.error('Unknown action');
        process.exit(1);
    }
  } catch (error) {
    output.error(error.message);
    output.debug('Config command error:', error);
    process.exit(1);
  }
};

async function handleAdd(argv, configManager, output) {
  let config;

  if (argv.interactive) {
    config = await Prompts.getHostConfig();
    if (!config.name) {
      output.error('Configuration cancelled');
      return;
    }
  } else {
    if (!argv.name || !argv.url || !argv.key || !argv.pass) {
      output.error('Missing required parameters. Use --interactive or provide --name, --url, --key, --pass');
      return;
    }

    if (!Utils.validateUrl(argv.url)) {
      output.error('Invalid URL format');
      return;
    }

    config = {
      name: argv.name,
      apiUrl: argv.url,
      apiKey: argv.key,
      apiPassword: argv.pass,
      setDefault: argv.default
    };
  }

  const existingHosts = await configManager.listHosts();
  if (existingHosts.includes(config.name)) {
    const overwrite = await Prompts.confirmAction(`Host '${config.name}' already exists. Overwrite?`);
    if (!overwrite) {
      output.info('Operation cancelled');
      return;
    }
  }

  output.verbose(`Adding host: ${config.name}`);
  
  const success = await configManager.addHost(
    config.name,
    config.apiUrl,
    config.apiKey,
    config.apiPassword,
    config.setDefault
  );

  if (success) {
    output.success(`Host '${config.name}' added successfully`);
    if (config.setDefault) {
      output.info(`Set as default host`);
    }
  } else {
    output.error('Failed to save configuration');
  }
}

async function handleRemove(argv, configManager, output) {
  let hostName = argv.name;

  if (!hostName) {
    const hosts = await configManager.listHosts();
    if (hosts.length === 0) {
      output.info('No hosts configured');
      return;
    }

    hostName = await Prompts.selectHost(hosts, 'Select host to remove:');
    if (!hostName) {
      output.info('Operation cancelled');
      return;
    }
  }

  const host = await configManager.getHost(hostName);
  if (!host) {
    output.error(`Host '${hostName}' not found`);
    return;
  }

  const confirmed = await Prompts.confirmAction(`Remove host '${hostName}'?`);
  if (!confirmed) {
    output.info('Operation cancelled');
    return;
  }

  const success = await configManager.removeHost(hostName);
  if (success) {
    output.success(`Host '${hostName}' removed successfully`);
  } else {
    output.error('Failed to remove host');
  }
}

async function handleList(configManager, output) {
  const hosts = await configManager.getAllHosts();
  const defaultHost = await configManager.getDefaultHost();

  if (Object.keys(hosts).length === 0) {
    output.info('No hosts configured');
    output.info('Use "vzcli config add" to add a host');
    return;
  }

  output.printHeader('Configured Hosts');

  const tableData = Object.values(hosts).map(host => ({
    Name: output.formatHostname(host.name + (host.name === defaultHost ? ' (default)' : '')),
    URL: output.formatDomain(host.api_url),
    Storage: host.storage_method === 'keyring' ? 
      output.formatSize('OS Keyring', '') : 
      output.formatSize('Encrypted File', '')
  }));

  output.table(tableData);
}

async function handleTest(argv, configManager, output, progress) {
  const hostName = argv.name;
  
  if (hostName) {
    await testSingleHost(hostName, configManager, output, progress);
  } else {
    await testAllHosts(configManager, output, progress);
  }
}

async function testSingleHost(hostName, configManager, output, progress) {
  const host = await configManager.getHost(hostName);
  if (!host) {
    output.error(`Host '${hostName}' not found`);
    return;
  }

  const credentials = await configManager.getHostCredentials(hostName);
  if (!credentials) {
    output.error(`Credentials not found for host: ${hostName}`);
    return;
  }

  const apiClient = new ApiClient(credentials.apiUrl, credentials.apiKey, credentials.apiPassword);
  
  try {
    const result = await progress.withSpinner(
      apiClient.testConnection(),
      `Testing connection to ${hostName}...`,
      null,
      null
    );

    if (result.success) {
      output.success(`Connected to ${hostName} ${output.formatResponseTime(result.responseTime)}`);
    } else {
      output.error(`Failed to connect to ${hostName}: ${result.error}`);
    }
  } catch (error) {
    output.error(`Connection failed: ${error.message}`);
  }
}

async function testAllHosts(configManager, output, progress) {
  const hosts = await configManager.listHosts();
  
  if (hosts.length === 0) {
    output.info('No hosts configured');
    return;
  }

  output.printHeader('Testing All Hosts');

  const results = [];

  for (const hostName of hosts) {
    const credentials = await configManager.getHostCredentials(hostName);
    
    if (!credentials) {
      results.push({
        host: hostName,
        status: 'error',
        message: 'Credentials not found',
        responseTime: null
      });
      continue;
    }

    const apiClient = new ApiClient(credentials.apiUrl, credentials.apiKey, credentials.apiPassword);
    
    try {
      const result = await apiClient.testConnection();
      
      results.push({
        host: hostName,
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Connected' : result.error,
        responseTime: result.responseTime
      });
    } catch (error) {
      results.push({
        host: hostName,
        status: 'error',
        message: error.message,
        responseTime: null
      });
    }
  }

  const tableData = results.map(result => ({
    Host: result.host,
    Status: result.status === 'success' ? output.formatVMStatus('up') : output.formatVMStatus('down'),
    Message: result.message,
    'Response Time': result.responseTime ? output.formatResponseTime(result.responseTime) : 'N/A'
  }));

  output.table(tableData);

  const successCount = results.filter(r => r.status === 'success').length;
  output.info(`${successCount}/${results.length} hosts connected successfully`);
}

async function handleSetDefault(argv, configManager, output) {
  let hostName = argv.name;

  if (!hostName) {
    const hosts = await configManager.listHosts();
    if (hosts.length === 0) {
      output.info('No hosts configured');
      return;
    }

    hostName = await Prompts.selectHost(hosts, 'Select default host:');
    if (!hostName) {
      output.info('Operation cancelled');
      return;
    }
  }

  const host = await configManager.getHost(hostName);
  if (!host) {
    output.error(`Host '${hostName}' not found`);
    return;
  }

  const success = await configManager.setDefaultHost(hostName);
  if (success) {
    output.success(`Default host set to '${hostName}'`);
  } else {
    output.error('Failed to set default host');
  }
}