#! /bin/bash

set -ex

ENV_FILE="$1"
PATH_FILE="$2"
ESY_INSTALLER_PATH="$3"
PREFIX="$4"
PACKAGE_NAME="$5"

if [ -d _build/install/default ]
then
    rm -rf "$PREFIX"
    cp -L -R _build/install/default "$PREFIX"
elif [ -f *.install ] # TODO -f maynot work on globs everywhere 
then
    PACKAGE_NAME=$(echo "$PACKAGE_NAME" | sed -E 's/@[^\/]+\///g') # ${PACKAGE_NAME#@opam/} wasn't good enough. Users could have custom namespaces on NPM. Eg: @grain
    env -i -P "$(cat $PATH_FILE)" -S "$(cat $ENV_FILE)" "$ESY_INSTALLER_PATH" "./$PACKAGE_NAME.install" | bash
fi
