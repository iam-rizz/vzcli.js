const ForwardService = require('../services/forward-service');
const Utils = require('../lib/utils');

exports.command = 'forward <action>';
exports.desc = 'Manage port/domain forwarding rules';

exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      describe: 'Action to perform',
      choices: ['list', 'add', 'edit', 'delete']
    })
    .option('vpsid', {
      alias: 'v',
      describe: 'VM ID',
      type: 'string'
    })
    .option('vdfid', {
      alias: 'f',
      describe: 'Forwarding rule ID (comma-separated for multiple)',
      type: 'string'
    })
    .option('protocol', {
      alias: 'p',
      describe: 'Protocol',
      choices: ['HTTP', 'HTTPS', 'TCP'],
      type: 'string'
    })
    .option('domain', {
      alias: 'd',
      describe: 'Domain or IP address',
      type: 'string'
    })
    .option('src-port', {
      alias: 's',
      describe: 'Source port',
      type: 'number'
    })
    .option('dest-port', {
      alias: 't',
      describe: 'Destination port',
      type: 'number'
    })
    .option('interactive', {
      alias: 'i',
      describe: 'Interactive mode',
      type: 'boolean',
      default: false
    })
    .option('auto', {
      describe: 'Auto-select if only one VM available',
      type: 'boolean',
      default: false
    })
    .option('force', {
      describe: 'Skip confirmation prompts',
      type: 'boolean',
      default: false
    })
    .option('json', {
      alias: 'j',
      describe: 'Output in JSON format',
      type: 'boolean',
      default: false
    })
    .example('vzcli forward list --vpsid 103')
    .example('vzcli forward list -i')
    .example('vzcli forward add --vpsid 103 --protocol HTTP --domain mysite.com')
    .example('vzcli forward add -i')
    .example('vzcli forward edit --vpsid 103 --vdfid 596 --domain newsite.com')
    .example('vzcli forward delete --vpsid 103 --vdfid 596,597 --force');
};

exports.handler = async (argv) => {
  const forwardService = new ForwardService(argv);

  if (argv.srcPort && !Utils.validatePort(argv.srcPort)) {
    forwardService.output.error('Invalid source port number');
    process.exit(1);
  }

  if (argv.destPort && !Utils.validatePort(argv.destPort)) {
    forwardService.output.error('Invalid destination port number');
    process.exit(1);
  }

  if (argv.protocol && !Utils.validateProtocol(argv.protocol)) {
    forwardService.output.error('Invalid protocol. Use HTTP, HTTPS, or TCP');
    process.exit(1);
  }

  try {
    switch (argv.action) {
      case 'list':
        await forwardService.listForwardingRules({
          vpsid: argv.vpsid,
          host: argv.host,
          auto: argv.auto,
          interactive: argv.interactive,
          json: argv.json
        });
        break;

      case 'add':
        const addSuccess = await forwardService.addForwardingRule({
          vpsid: argv.vpsid,
          protocol: argv.protocol,
          domain: argv.domain,
          srcPort: argv.srcPort,
          destPort: argv.destPort,
          host: argv.host,
          interactive: argv.interactive
        });
        
        if (!addSuccess) {
          process.exit(1);
        }
        break;

      case 'edit':
        const editSuccess = await forwardService.editForwardingRule({
          vpsid: argv.vpsid,
          vdfid: argv.vdfid,
          protocol: argv.protocol,
          domain: argv.domain,
          srcPort: argv.srcPort,
          destPort: argv.destPort,
          host: argv.host,
          interactive: argv.interactive
        });
        
        if (!editSuccess) {
          process.exit(1);
        }
        break;

      case 'delete':
        const deleteSuccess = await forwardService.deleteForwardingRule({
          vpsid: argv.vpsid,
          vdfid: argv.vdfid,
          host: argv.host,
          interactive: argv.interactive,
          force: argv.force
        });
        
        if (!deleteSuccess) {
          process.exit(1);
        }
        break;

      default:
        forwardService.output.error('Unknown action');
        process.exit(1);
    }
  } catch (error) {
    forwardService.output.error(error.message);
    forwardService.output.debug('Forward command error:', error);
    process.exit(1);
  }
};