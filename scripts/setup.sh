#!/bin/sh

# This script sets up the hds-support-js build environment

# working dir fix
scriptsFolder=$(cd $(dirname "$0"); pwd)
cd $scriptsFolder/..

# check for well known prereqs that might be missing
hash npm 2>&- || { echo >&2 "I require node and npm."; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
  echo "Error: Node.js >= 24 required (found $(node -v))"
  exit 1
fi

echo "
Installing Node modules from 'package.json' if necessary...
"
npm install

echo "


If no errors were listed above, the setup is complete.
See the README for more info.
"
