const fs = require('fs');
const path = require('path');

function readEnvFile() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return {};

  return fs.readFileSync(file, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#')) return values;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
    return values;
  }, {});
}

module.exports = function inlineEnv({types: t}) {
  const env = readEnvFile();
  return {
    name: 'inline-project-env',
    visitor: {
      Identifier(p) {
        if (p.node.name === '__AEP_APP_ID__') {
          p.replaceWith(t.stringLiteral(env.AEP_APP_ID || ''));
        }
      },
    },
  };
};
