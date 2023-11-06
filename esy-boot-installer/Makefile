ifndef PREFIX
$(error PREFIX is not set. PREFIX is usually set to installation directory prefix)
endif


OCAML_OBJECT_EXT = cmx
OCAML_ARCHIVE_EXT = cmxa

OCAML_OBJECTS = src/lexer.$(OCAML_OBJECT_EXT) src/parser.$(OCAML_OBJECT_EXT) src/esy_installer.$(OCAML_OBJECT_EXT)

OCAML_COMPILER = ocamlopt

${OCAML_OBJECTS}:
	make OCAML_COMPILER=$(OCAML_COMPILER) OCAML_OBJECT_EXT=$(OCAML_OBJECT_EXT) -C src $(shell basename $@)

esy-installer: $(OCAML_OBJECTS)
	$(OCAML_COMPILER) -o $@ str.$(OCAML_ARCHIVE_EXT) $^ # all dependencies, regardless of whether they're new or old, are needed in the command to build the target

install:
	install esy-installer $(PREFIX)/bin/esy-installer
