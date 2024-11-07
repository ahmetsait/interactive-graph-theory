#!/usr/bin/env bash 

app_name="$(basename "${BASH_SOURCE[0]}")"

USAGE=$(cat << EOF
Usage:
    $app_name
        Generate PNG images from SVG files.

Options:
    -s, --sizes=<SIZE_LIST>
        Which sizes to render SVG files formatted as comma separated integer
        values. Original size from the SVG file is used when this option is
        missing or 0 is used.

    -a, --apple=[SIZE,PADDING]
        Apple touch icon size to generate. "180,25" is used when no size or
        padding argument is given. Padding is automatically calculated as 1/7
        of size if only size is given.

    -h, --help
        Show this help information and exit.
EOF
)

getopt -q -T
if [[ $? -ne 4 ]]; then
	echo "$app_name: This script requires an enhanced getopt version." >&2
	exit 1
fi

opts=$(getopt -o 'hs:a::' -l 'help,sizes:,apple::' -n "$app_name" -- "$@") || exit $?

eval "opts=($opts)"

args=()
apple=0
sizes=0

for ((i = 0; i < ${#opts[@]}; i++)); do
	opt="${opts["$i"]}"
	case "$opt" in
		-s|--sizes)
			((i++))
			readarray -t -d, png_sizes < <(printf "%s" "${opts["$i"]}")
			sizes=1
			;;
		-a|--apple)
			((i++))
			readarray -t -d, apple_sizes < <(printf "%s" "${opts["$i"]}")
			apple=1
			;;
		-h|--help)
			echo "$USAGE"
			exit 0
			;;
		--)
			args+=("${opts[@]:((i+1))}")
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
	echo "Cannot find 'resvg' command. Make sure resvg is installed and resvg reachable from the current working directory. See: https://github.com/RazrFalcon/resvg" >&2
	exit 1
fi

command -v convert > /dev/null; magick=$?

if [[ magick -ne 0 ]]; then
	echo "Cannot find 'convert' command. Make sure ImageMagick is installed and reachable from the current working directory. See: https://www.imagemagick.org" >&2
	exit 1
fi

status=0

export_png() {
	if [[ $2 -nt $3 ]]; then
		if (( $1 == 0 )); then
			resvg "$2" "$3"
		else
			resvg -w "$1" -h "$1" "$2" "$3"
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
		convert -background none "${pngs[@]}" "$ico"
	fi
	
	if (( apple != 0 )); then
		if wait -n "$apple_job"; then
			convert "$apple_icon" -define png:exclude-chunks=date,time -background white -gravity center -extent "${apple_touch_icon_size}x${apple_touch_icon_size}" "$apple_icon"
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
