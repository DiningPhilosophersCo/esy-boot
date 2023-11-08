#! /bin/bash

set -e

ENV_FILE="$1"
PATH_FILE="$2"
ESY_INSTALLER_PATH="$3"
# PREFIX="$4" # TODO stop passing the this argument from caller
# PACKAGE_NAME="$5" # TODO stop passing the this argument from caller

find "${ENV_FILE%.env}" -name '*.install' -maxdepth 1 -exec "$ESY_INSTALLER_PATH" {} ';'
