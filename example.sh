#! /bin/bash

set -ex

rm -rf _boot/
esy-boot ./boot.Makefile 
make -f ./boot.esy-boot-installer.Makefile esy-boot-installer
make -f ./boot.Makefile $(jq -r .name package.json)
