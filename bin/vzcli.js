#!/usr/bin/env node

const yargs = require('yargs');
const pkg = require('../package.json');

try {
  const updateNotifier = require('update-notifier');
  updateNotifier({ pkg }).notify();
} catch (error) {
  // Silently fail if update-notifier is not available
}

yargs
  .commandDir('../src/commands')
  .demandCommand(1, 'You need at least one command before moving on')
  .help('h')
  .alias('h', 'help')
  .version(pkg.version)
  .alias('V', 'version')
  .option('host', {
    alias: 'H',
    describe: 'Use specific host profile',
    type: 'string'
  })
  .option('no-color', {
    describe: 'Disable colored output',
    type: 'boolean'
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Verbose output',
    type: 'boolean'
  })
  .option('debug', {
    describe: 'Debug mode (show stack traces)',
    type: 'boolean'
  })
  .strict()
  .argv;