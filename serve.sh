#!/usr/bin/env bash

set -e

./build.sh --watch
python3 -m http.server "$@"
