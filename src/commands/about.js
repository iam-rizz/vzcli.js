const chalk = require('chalk');
const pkg = require('../../package.json');

exports.command = 'about';
exports.desc = 'Show version and author information';

exports.handler = (argv) => {
  const noColor = argv.noColor;

  console.log('');
  
  if (noColor) {
    console.log(`${pkg.name} v${pkg.version}`);
    console.log('');
    console.log(pkg.description);
    console.log('');
    console.log(`Author: ${pkg.author.name}`);
    console.log(`Email: ${pkg.author.email}`);
    console.log(`GitHub: ${pkg.author.url}`);
    console.log(`Repository: ${pkg.repository.url}`);
    console.log(`License: ${pkg.license}`);
  } else {
    console.log(chalk.bold.cyan(`${pkg.name} v${pkg.version}`));
    console.log('');
    console.log(chalk.gray(pkg.description));
    console.log('');
    console.log(`${chalk.bold('Author:')} ${pkg.author.name}`);
    console.log(`${chalk.bold('Email:')} ${chalk.blue(pkg.author.email)}`);
    console.log(`${chalk.bold('GitHub:')} ${chalk.blue(pkg.author.url)}`);
    console.log(`${chalk.bold('Repository:')} ${chalk.blue(pkg.repository.url)}`);
    console.log(`${chalk.bold('License:')} ${pkg.license}`);
  }
  
  console.log('');
};