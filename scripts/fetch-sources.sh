#! /bin/sh

set -e

# shellcheck disable=SC2001
#   2001 complains bash variable substitution could be considered instead of echo/sed pattern
#   3060 complains of missing echo/sed pattern support in POSIX shell
#   We chose to ignore 2001

print_usage () {
    echo ""
    echo "untar-sources.sh"
    echo "--help                          Show this help message"
    echo "--tarballs=<path/to/download/tarballs/to> Specifies path where tarball can be downloaded"
    echo "--sources-cache=</path/to/esy/sources/cache>      Specifies url of the tarball to be downloaded"
    echo ""
}

# process command line options
while test $# -ge 1
do
case "$1" in
    -h* | --help)
	print_usage;
        exit 0 ;;
    --tarballs=*)
	TARBALLS=$(echo "$1" | sed 's/.*=//')
	shift;
	;;
    --project=*)
	PROJECT_PATH=$(echo "$1" | sed 's/.*=//')
	shift;
	;;
    --sources-cache=*)
	SOURCE_CACHE_PATH=$(echo "$1" | sed 's/.*=//')
	shift;
	;;
    *)
	;;
esac
done

if [ -z "$PROJECT_PATH" ]
then
   PROJECT_PATH="$PWD"
fi

esy i --project "$PROJECT_PATH" --cache-tarballs-path="$TARBALLS"

for TARBALL_PATH in $(find "$TARBALLS" -print)
do
    echo "Extracting $TARBALL_PATH"
    FILENAME="$(basename "$TARBALL_PATH")"
    DIR="${FILENAME%.tgz}"
    echo "File: $FILENAME"
    echo "Dir: $DIR"
    SOURCE_CACHE_ENTRY="$SOURCE_CACHE_PATH/$DIR"
    mkdir -p "$SOURCE_CACHE_ENTRY"
    tar -xf "$TARBALL_PATH" -C "$SOURCE_CACHE_ENTRY" || true
done
