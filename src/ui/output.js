const chalk = require('chalk');

let logSymbols;
try {
  logSymbols = require('log-symbols');
  if (logSymbols.default) {
    logSymbols = logSymbols.default;
  }
} catch (error) {
  logSymbols = {
    success: '✔',
    error: '✖',
    warning: '⚠',
    info: 'ℹ'
  };
}

class Output {
  constructor(options = {}) {
    this.noColor = options.noColor || false;
    this.verboseMode = options.verbose || false;
    this.debugMode = options.debug || false;
  }

  success(message) {
    const symbol = this.noColor ? '✓' : logSymbols.success;
    console.log(`${symbol} ${this.noColor ? message : chalk.green(message)}`);
  }

  error(message) {
    const symbol = this.noColor ? '✗' : logSymbols.error;
    console.log(`${symbol} ${this.noColor ? message : chalk.red(message)}`);
  }

  warning(message) {
    const symbol = this.noColor ? '⚠' : logSymbols.warning;
    console.log(`${symbol} ${this.noColor ? message : chalk.yellow(message)}`);
  }

  info(message) {
    const symbol = this.noColor ? 'ℹ' : logSymbols.info;
    console.log(`${symbol} ${this.noColor ? message : chalk.blue(message)}`);
  }

  log(message) {
    console.log(message);
  }

  verbose(message) {
    if (this.verboseMode) {
      console.log(`${this.noColor ? '[VERBOSE]' : chalk.gray('[VERBOSE]')} ${message}`);
    }
  }

  debug(message, error = null) {
    if (this.debugMode) {
      console.log(`${this.noColor ? '[DEBUG]' : chalk.magenta('[DEBUG]')} ${message}`);
      if (error && error.stack) {
        console.log(error.stack);
      }
    }
  }

  table(data, headers = null) {
    if (!data || data.length === 0) {
      this.info('No data to display');
      return;
    }

    if (headers) {
      console.table(data, headers);
    } else {
      console.table(data);
    }
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  formatVMStatus(status) {
    if (this.noColor) {
      return status === 'up' ? '● up' : '● down';
    }
    return status === 'up' ? chalk.green('● up') : chalk.red('● down');
  }

  formatResponseTime(ms) {
    if (this.noColor) {
      return `${ms}ms`;
    }
    
    if (ms < 100) return chalk.green(`${ms}ms`);
    if (ms < 500) return chalk.yellow(`${ms}ms`);
    return chalk.red(`${ms}ms`);
  }

  formatProtocol(protocol) {
    if (this.noColor) {
      return protocol;
    }

    switch (protocol.toUpperCase()) {
      case 'HTTP':
        return chalk.blue(protocol);
      case 'HTTPS':
        return chalk.green(protocol);
      case 'TCP':
        return chalk.cyan(protocol);
      default:
        return protocol;
    }
  }

  printHeader(title) {
    if (this.noColor) {
      console.log(`\n=== ${title} ===\n`);
    } else {
      console.log(`\n${chalk.bold.cyan(`=== ${title} ===`)}\n`);
    }
  }

  printSeparator() {
    console.log('');
  }
}

module.exports = Output;