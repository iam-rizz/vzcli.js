const BatchService = require('../services/batch-service');

exports.command = 'batch <action>';
exports.desc = 'Batch operations for forwarding rules';

exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      describe: 'Action to perform',
      choices: ['export', 'import', 'template']
    })
    .option('vpsid', {
      describe: 'VM ID',
      type: 'string'
    })
    .option('output', {
      alias: 'o',
      describe: 'Output file path',
      type: 'string'
    })
    .option('file', {
      alias: 'f',
      describe: 'Input file path',
      type: 'string'
    })
    .option('dry-run', {
      describe: 'Validate import without executing',
      type: 'boolean',
      default: false
    })
    .example('vzcli batch export --vpsid 103 --output rules.json')
    .example('vzcli batch import --vpsid 104 --file rules.json')
    .example('vzcli batch import --vpsid 104 --file rules.json --dry-run')
    .example('vzcli batch template --output template.json');
};

exports.handler = async (argv) => {
  const batchService = new BatchService(argv);

  try {
    switch (argv.action) {
      case 'export':
        if (!argv.vpsid) {
          batchService.output.error('VM ID is required for export. Use --vpsid');
          process.exit(1);
        }

        if (!argv.output) {
          batchService.output.error('Output file is required for export. Use --output');
          process.exit(1);
        }

        const exportSuccess = await batchService.exportRules({
          vpsid: argv.vpsid,
          host: argv.host,
          outputFile: argv.output
        });

        if (!exportSuccess) {
          process.exit(1);
        }
        break;

      case 'import':
        if (!argv.vpsid) {
          batchService.output.error('VM ID is required for import. Use --vpsid');
          process.exit(1);
        }

        if (!argv.file) {
          batchService.output.error('Input file is required for import. Use --file');
          process.exit(1);
        }

        const importSuccess = await batchService.importRules({
          vpsid: argv.vpsid,
          host: argv.host,
          inputFile: argv.file,
          dryRun: argv.dryRun
        });

        if (!importSuccess && !argv.dryRun) {
          process.exit(1);
        }
        break;

      case 'template':
        if (!argv.output) {
          batchService.output.error('Output file is required for template. Use --output');
          process.exit(1);
        }

        const templateSuccess = await batchService.generateTemplate(argv.output);
        
        if (!templateSuccess) {
          process.exit(1);
        }
        break;

      default:
        batchService.output.error('Unknown action');
        process.exit(1);
    }
  } catch (error) {
    batchService.output.error(error.message);
    batchService.output.debug('Batch command error:', error);
    process.exit(1);
  }
};