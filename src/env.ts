import { execSync, exec } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function getEnvVariables() {
  const vars = {
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || '',
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
    ANTHROPIC_CUSTOM_HEADERS: process.env.ANTHROPIC_CUSTOM_HEADERS || ''
  };

  const platform = os.platform();
  if (platform === 'win32') {
    try {
      const output = execSync('reg query "HKCU\\Environment"').toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('ANTHROPIC_BASE_URL')) vars.ANTHROPIC_BASE_URL = line.split('REG_SZ')[1]?.trim() || vars.ANTHROPIC_BASE_URL;
        if (line.includes('ANTHROPIC_MODEL')) vars.ANTHROPIC_MODEL = line.split('REG_SZ')[1]?.trim() || vars.ANTHROPIC_MODEL;
        if (line.includes('ANTHROPIC_AUTH_TOKEN')) vars.ANTHROPIC_AUTH_TOKEN = line.split('REG_SZ')[1]?.trim() || vars.ANTHROPIC_AUTH_TOKEN;
        if (line.includes('ANTHROPIC_CUSTOM_HEADERS')) vars.ANTHROPIC_CUSTOM_HEADERS = line.split('REG_SZ')[1]?.trim() || vars.ANTHROPIC_CUSTOM_HEADERS;
      }
    } catch (e) {
    }
  } else {
    const home = os.homedir();
    const files = ['.zshrc', '.bashrc', '.bash_profile', '.zshenv'].map(f => path.join(home, f));
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          for (const line of lines) {
            if (line.startsWith('export ANTHROPIC_BASE_URL=')) vars.ANTHROPIC_BASE_URL = line.split('=')[1].replace(/"/g, '').trim();
            if (line.startsWith('export ANTHROPIC_MODEL=')) vars.ANTHROPIC_MODEL = line.split('=')[1].replace(/"/g, '').trim();
            if (line.startsWith('export ANTHROPIC_AUTH_TOKEN=')) vars.ANTHROPIC_AUTH_TOKEN = line.split('=')[1].replace(/"/g, '').trim();
            if (line.startsWith('export ANTHROPIC_CUSTOM_HEADERS=')) vars.ANTHROPIC_CUSTOM_HEADERS = line.split('=')[1].replace(/"/g, '').trim();
          }
        } catch (e) {
        }
      }
    }
  }
  return vars;
}

export async function deleteEnvVariables(keys: string[]) {
  const platform = os.platform();
  const errors: string[] = [];

  if (platform === 'win32') {
    for (const key of keys) {
      try {
        await execAsync(`reg delete "HKCU\\Environment" /v ${key} /f`);
      } catch (e: any) {
      }
    }
  } else {
    const home = os.homedir();
    const rcFiles = [
      path.join(home, '.zshrc'),
      path.join(home, '.zshenv'),
      path.join(home, '.bashrc'),
      path.join(home, '.bash_profile')
    ];

    for (const file of rcFiles) {
      if (fs.existsSync(file)) {
        try {
          let content = fs.readFileSync(file, 'utf8');
          let changed = false;

          for (const key of keys) {
            const regex = new RegExp(`^export ${key}=.*$`, 'gm');
            if (regex.test(content)) {
              content = content.replace(regex, '');
              changed = true;
            }
          }

          if (changed) {
            content = content.replace(/\n\s*\n/g, '\n\n').trim() + '\n';
            fs.writeFileSync(file, content);
          }
        } catch (e: any) {
          errors.push(`Failed to update ${file}: ${e.message}`);
        }
      }
    }
  }
  return { success: errors.length === 0, errors };
}

export async function setEnvVariables(vars: Record<string, string>) {
  const platform = os.platform();
  const errors: string[] = [];

  if (platform === 'win32') {
    for (const [key, value] of Object.entries(vars)) {
      try {
        await execAsync(`setx ${key} "${value}"`);
      } catch (e: any) {
        errors.push(`Failed to set ${key} on Windows: ${e.message}`);
      }
    }
  } else {
    const shell = process.env.SHELL || '';
    const home = os.homedir();
    const rcFiles: string[] = [];

    if (shell.includes('zsh')) {
      rcFiles.push(path.join(home, '.zshrc'), path.join(home, '.zshenv'));
    } else if (shell.includes('bash')) {
      rcFiles.push(path.join(home, '.bashrc'), path.join(home, '.bash_profile'));
    } else {
      rcFiles.push(path.join(home, '.zshrc'), path.join(home, '.bashrc'));
    }

    let modifiedFiles = 0;
    for (const file of rcFiles) {
      if (fs.existsSync(file)) {
        try {
          let content = fs.readFileSync(file, 'utf8');
          let changed = false;

          for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`^export ${key}=.*$`, 'm');
            const exportLine = `export ${key}="${value}"`;

            if (regex.test(content)) {
              content = content.replace(regex, exportLine);
              changed = true;
            } else {
              content += `\n${exportLine}\n`;
              changed = true;
            }
          }

          if (changed) {
            fs.writeFileSync(file, content);
            modifiedFiles++;
          }
        } catch (e: any) {
          errors.push(`Failed to update ${file}: ${e.message}`);
        }
      }
    }

    if (modifiedFiles === 0 && rcFiles.length > 0) {
      const file = rcFiles[0];
      try {
        let content = '';
        for (const [key, value] of Object.entries(vars)) {
          content += `export ${key}="${value}"\n`;
        }
        fs.writeFileSync(file, content);
      } catch (e: any) {
        errors.push(`Failed to create ${file}: ${e.message}`);
      }
    }
  }

  return { success: errors.length === 0, errors };
}
