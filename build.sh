#! /bin/bash

set -ex

rm -rf _boot/
BOOT_SEQ_PATH="./_boot/sources/$(esy build-plan -p @opam/seq | jq -r .sourcePath | xargs basename)"
mkdir -p "$BOOT_SEQ_PATH"
SEQ_PACKAGEID=$(jq -r 'keys[]' ./_esy/default/installation.json | grep opam/seq)
SEQ_SOURCE_PATH_QUERY=".[\"$SEQ_PACKAGEID\"]"
SEQ_SOURCE_PATH=$(jq -r "$SEQ_SOURCE_PATH_QUERY" ./_esy/default/installation.json)
mkdir -p _boot/store/3/b _boot/store/b _boot/store/i
esy-boot ./boot.Makefile 
cp -r "$SEQ_SOURCE_PATH" "$(dirname $BOOT_SEQ_PATH)"
make -f ./boot.esy-boot-installer.Makefile esy-boot-installer
make -f ./boot.Makefile $(jq -r .name esy.json)
