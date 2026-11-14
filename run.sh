#!/bin/sh
# Run the BrightAgent sample agent.
#   ./run.sh <key-file> [bounty-slug]
# The key file lives OUTSIDE this repo and is never printed or committed.
#   ./run.sh /root/keys/idx6.txt                    # forecast-btc-7d (default)
#   ./run.sh /root/keys/idx6.txt --self-submit --repo-url <url> --commit <sha> --transcript-file <log>
set -e
cd "$(dirname "$0")"
node --check agent.mjs
exec node agent.mjs "$@"
