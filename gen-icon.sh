#!/usr/bin/env bash 

set -uo pipefail

app_name="$(basename "${BASH_SOURCE[0]}")"

print_help() {
	expand -t 4 << EOF
Usage:
	$app_name <SVG_FILES...>
		Generate PNG images from SVG files.

Options:
	-s, --sizes=<SIZE_LIST>
		Which sizes to render SVG files formatted as comma separated integer
		values. Original size from the SVG file is used when this option is
		missing or 0 is used.

	-b, --background=<COLOR>
		Background color to use while rendering SVG.

	-a, --apple=[SIZE[,PADDING]]
		Apple touch icon size to generate. "180,25" is used when no size or
		padding argument is given. Padding is automatically calculated as 1/7
		of size if only size is given.

	--color, --no-color
		Enabe/Disable terminal color output.

	-v, --verbose
		Enabe diagnostic output.

	-?, --help
		Show this help information and exit.
EOF
}

for ((i = 1; i <= $#; i++)); do
	opt="${!i}"
	case "$opt" in
		-\?|--help)
			print_help
			exit 0
			;;
		--)
			break
			;;
	esac
done

getopt -q -T
if [[ $? -ne 4 ]]; then
	echo "$app_name: [Error] This script requires an enhanced getopt version." >&2
	exit 1
fi

args=()
opts=$(getopt -o 's:b:a::v' -l 'sizes:,background:,apple::,color,no-color,verbose' -n "$app_name" -- "$@") || exit $?

eval "opts=($opts)"

sizes=0
apple=0
verbose=0
if [[ -n NO_COLOR ]]; then
	color=0
else
	color=
fi

for ((i = 0; i < ${#opts[@]}; i++)); do
	opt="${opts["$i"]}"
	case "$opt" in
		-s|--sizes)
			((i++))
			readarray -t -d, png_sizes < <(printf "%s" "${opts["$i"]}")
			sizes=1
			;;
		-b|--background)
			((i++))
			background="${opts["$i"]}"
			;;
		-a|--apple)
			((i++))
			readarray -t -d, apple_sizes < <(printf "%s" "${opts["$i"]}")
			apple=1
			;;
		--color)
			color=1
			;;
		--no-color)
			color=0
			;;
		-v|--verbose)
			verbose=1
			;;
		--)
			args+=("${opts[@]:i+1}")
			break
			;;
	esac
done

if (( apple != 0 )); then
	apple_touch_icon_size="${apple_sizes[0]:-180}"
	apple_touch_icon_padding="${apple_sizes[1]:-((apple_touch_icon_size / 7))}" # 25
	apple_touch_icon_content_size="$((apple_touch_icon_size - apple_touch_icon_padding))"
fi

set -- "${args[@]}"

command -v resvg > /dev/null; resvg=$?

if [[ resvg -ne 0 ]]; then
	echo "[Error] Cannot find 'resvg' command. Make sure resvg is installed and reachable from the current working directory. See: https://github.com/RazrFalcon/resvg" >&2
	exit 1
fi

command -v magick > /dev/null; magick=$?

if [[ magick -ne 0 ]]; then
	echo "[Error] Cannot find 'magick' command. Make sure ImageMagick is installed and reachable from the current working directory. See: https://www.imagemagick.org" >&2
	exit 1
fi

if [[ -z "$color" ]]; then
	if [[ -t 1 ]]; then
		color=1
	else
		color=0
	fi
fi

status=0

export_png() {
	if [[ $2 -nt $3 || ${BASH_SOURCE[0]} -nt $3 ]]; then
		if (( $1 == 0 )); then
			resvg ${background:+--background "$background"} "$2" "$3"
		else
			resvg ${background:+--background "$background"} -w "$1" -h "$1" "$2" "$3"
		fi &&
		if [[ verbose -ne 0 ]]; then
			if [[ color -ne 0 ]]; then
				echo -e "\E[0;90mGenerate:\E[m $3"
			else
				echo -e "Generate: $3"
			fi
		fi
	fi
}

if (( apple == 0 && sizes == 0 )); then
	png_sizes=(0) # Original size of SVG
fi

readarray -d '' -t png_sizes < <(for s in "${png_sizes[@]}"; do printf '%s\0' "$s"; done | sort -r -u -n -z)

for f in "$@"; do
	name="${f%.*}"
	pngs=()
	declare -A size2job
	declare -A job2png
	for i in "${png_sizes[@]}"; do
		if (( i == 0 )); then
			png="$name.g.png"
		else
			png="$name-$i.g.png"
		fi
		export_png "$i" "$f" "$png" &
		size2job["$i"]=$!
		job2png[$!]="$png"
	done
	if (( apple != 0 )); then
		apple_icon="$(dirname "$name")/apple-touch-icon.g.png"
		export_png "$apple_touch_icon_content_size" "$f" "$apple_icon" &
		apple_job=$!
	fi
	
	for i in "${png_sizes[@]}"; do
		if (( i != 0 && i < 256 )); then
			j="${size2job["$i"]}"
			if wait -n "$j"; then
				pngs+=("${job2png["$j"]}")
				unset job2png["$j"]
			else
				status=1
			fi
		fi
	done
	
	if (( ${#pngs[@]} > 0 )); then
		ico="$name.g.ico"
		magick -background none "${pngs[@]}" "$ico"
	fi
	
	if (( apple != 0 )); then
		if wait -n "$apple_job"; then
			magick "$apple_icon" -define png:exclude-chunks=date,time -background white -gravity center -extent "${apple_touch_icon_size}x${apple_touch_icon_size}" "$apple_icon"
		else
			status=1
		fi
	fi
done

for j in "${!job2png[@]}"; do
	if ! wait "$j"; then
		status=1
	fi
done

exit "$status"
