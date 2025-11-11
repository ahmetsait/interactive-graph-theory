#!/usr/bin/env bash

set -euo pipefail

watch=0
serve=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		-w|--watch)
			watch=1
			shift
			;;
		-s|--serve)
			serve=1
			shift
			;;
		*)
			break
			;;
	esac
done

if [[ -d bin ]]; then
	export PATH="$(realpath bin):$PATH"
fi

echo "Generating images..."
./gen-icon.sh --background white assets/opengraph.svg assets/twitter.svg &
asset_job=$!
./gen-icon.sh favicon/favicon.svg --sizes=512,256,255,192,180,150,128,96,72,64,48,32,24,20,16 --apple &
favicon_job=$!
wait -n "$asset_job"
wait -n "$favicon_job"
echo "Done"

echo "Compiling Sass..."
sass --update scss:css
if [[ watch -ne 0 ]]; then
	sass --update --watch scss:css &
fi
echo "Done"

if [[ -d node_modules/.bin ]]; then
	export PATH="$(realpath node_modules/.bin):$PATH"
fi

echo "Compiling TypeScript..."
tsc
if [[ watch -ne 0 ]]; then
	tsc --watch --preserveWatchOutput &
fi
echo "Done"

if [[ serve -ne 0 ]]; then
	python3 -m http.server "$@"
fi

wait
