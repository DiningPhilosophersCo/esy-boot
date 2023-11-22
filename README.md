# Bootstrapping any Reason/OCaml project without Opam or Esy

[esy](https://esy.sh/) can describe each package's build sandbox with `esy build-plan`. I use this and lock files to create a bash scripts that run in an isolated environment to build all the packages in an `esy` project.

> This project is still work in progress and not available on NPM yet. 
> Also needs a final missing piece before using it. See (and subscribe to get notified) https://github.com/ManasJayanth/esy-boot/issues/1

## Usecase

Building native Reason/OCaml projects from source where a package manager isn't available.

## Installation
Not build steps. Just make sure this project's path is available in `$PATH`.

### Example

```sh
git clone https://github.com/ManasJayanth/esy-boot 
export PATH=$PWD/esy-boot:$PATH
cd your-esy-project
```

## Usage

There are two steps.

1. Generating Makefiles on the machine where the project is developed (or a CI)
2. Running the makefiles on the machine where the project is meant to be build from source and installed.

To achieve `#2`, need a small program, target machine bootstrapper, to current working directory on the host and run other utils to install packages. Hence, the makefiles generated in `#1` are actually just templates that are rendered later on the target machine.

### Makefile generatiion

Create makefiles with `esy-boot ./boot.Makefile`

This will,
	
a. Create a `_boot` folder
b. Fetch sources (if not available locally) and create a folder with tarballs of all the sources needed to bootstrap the project.
c. Create a `boot.esy-boot-installer.Makefile` for the target machine installer.
d. Create bash scripts to build all the packages on the target machine.

### Preparing a distribution tarball.

Compress the `_boot` folder.

### User's machine.

Write a script like [this one]()

```sh
make -f ./boot.esy-boot-installer.Makefile boot # not available yet
make -j8 -f ./boot.esy-boot-installer.Makefile esy-boot-installer
make -j8 -f ./boot.Makefile <project-name>
```	

## How does it work?

(TODO)
