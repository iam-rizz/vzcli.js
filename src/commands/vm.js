const VmService = require('../services/vm-service');

exports.command = 'vm <action>';
exports.desc = 'Manage virtual machines';

exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      describe: 'Action to perform',
      choices: ['list']
    })
    .option('status', {
      alias: 's',
      describe: 'Filter by status',
      choices: ['up', 'down'],
      type: 'string'
    })
    .option('all-hosts', {
      alias: 'a',
      describe: 'List VMs from all hosts',
      type: 'boolean',
      default: false
    })
    .option('json', {
      alias: 'j',
      describe: 'Output in JSON format',
      type: 'boolean',
      default: false
    })
    .example('vzcli vm list')
    .example('vzcli vm list --status up')
    .example('vzcli vm list --all-hosts')
    .example('vzcli vm list --all-hosts --status up --json');
};

exports.handler = async (argv) => {
  const vmService = new VmService(argv);

  try {
    switch (argv.action) {
      case 'list':
        await vmService.listVMs({
          host: argv.host,
          status: argv.status,
          allHosts: argv.allHosts,
          json: argv.json
        });
        break;
      default:
        vmService.output.error('Unknown action');
        process.exit(1);
    }
  } catch (error) {
    vmService.output.error(error.message);
    vmService.output.debug('VM command error:', error);
    process.exit(1);
  }
};