#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');
const os = require('os');
const pkg = require('./package.json');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  const configPath = path.join(os.homedir(), '.claude-code-profile-switcher.json');
  console.log(`
Claude Code Profile Switcher v${pkg.version}

Usage:
  claude-code-profile-switcher [options]

Options:
  -h, --help     Show help information
  -V, --version  Show version information

Config Location:
  ${configPath}

Repository:
  https://github.com/bariskisir/ClaudeCodeProfileSwitcher
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-V')) {
  console.log(pkg.version);
  process.exit(0);
}

const child = spawn(electron, [__dirname], { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code);
});
