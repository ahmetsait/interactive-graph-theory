#!/usr/bin/env bash 

command -v inkscape > /dev/null; inkscape=$?

if [[ $inkscape != 0 ]]; then
	echo $'Cannot find \'inkscape\' command. Make sure Inkscape is installed and reachable from the current working directory. See: https://inkscape.org' >&2
	exit 1
fi

command -v magick > /dev/null; magick=$?

if [[ $magick != 0 ]]; then
	echo $'Cannot find \'magick\' command. Make sure ImageMagick is installed and reachable from the current working directory. See: https://www.imagemagick.org' >&2
	exit 1
fi

name="${1%.*}"
ico="$name.ico"
pngs=()

for i in 512 256 192 180 150 128 96 64 48 32 16; do
	png="$name-$i.png"
	inkscape -C -y 0 -w $i -h $i -o "$png" "$1" 2>/dev/null && magick identify "$png" && pngs+=("$png")
done

echo
echo "${pngs[@]}"
magick -background none "${pngs[@]}" "$ico" && magick identify "$ico"
