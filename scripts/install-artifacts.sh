#! /bin/bash

set -e

ENV_FILE="$1"
PATH_FILE="$2"
ESY_INSTALLER_PATH="$3"
PREFIX="$4"
# PACKAGE_NAME="$5" # TODO stop passing the this argument from caller

if [ -d _build/install/default ]
then
    rm -rf "$PREFIX"
    cp -L -R _build/install/default "$PREFIX"
else
    # ${PACKAGE_NAME#@opam/} isn't good enough. Users could have custom namespaces on NPM. Eg: @grain
    find "${ENV_FILE%.env}" -name '*.install' -exec env -i -P "$(cat "$PATH_FILE")" -S "$(cat "$ENV_FILE")" "$ESY_INSTALLER_PATH" {} + | bash -x
fi

