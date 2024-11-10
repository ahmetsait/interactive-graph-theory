#!/usr/bin/env bash

watch=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		-w|--watch)
			watch=1
			shift
			;;
		*)
			break
			;;
	esac
done

set -e

if [[ -d bin ]]; then
	export PATH="$(realpath bin):$PATH"
fi

echo "Generating images..."
./gen-icon.sh assets/opengraph.svg assets/twitter.svg &
asset_job=$!
./gen-icon.sh favicon/favicon.svg --sizes=512,256,255,192,180,150,128,96,72,64,48,32,24,20,16 --apple &
favicon_job=$!
wait -n "$asset_job"
wait -n "$favicon_job"
echo "Done"

if [[ -d node_modules/.bin ]]; then
	export PATH="$(realpath node_modules/.bin):$PATH"
fi

echo "Compiling TypeScript..."
tsc
if [[ watch -ne 0 ]]; then
	tsc --watch &
fi
echo "Done"
