lexer.ml: lexer.mll parser.$(OCAML_OBJECT_EXT)
	ocamllex $< # only name of the first pre-requisite, lexer.mll

parser.ml parser.mli: parser.mly
	ocamlyacc -v $?

parser.$(OCAML_OBJECT_EXT): parser.mli parser.ml # make sure mli is before ml. Otherwise, you'll see, Error: Could not find the .cmi file for interface parser.mli.
	$(OCAML_COMPILER) -c $?

lexer.$(OCAML_OBJECT_EXT): lexer.ml
	$(OCAML_COMPILER) -c $?

fs.$(OCAML_INTERFACE_EXT) fs.$(OCAML_OBJECT_EXT): fs.ml
	$(OCAML_COMPILER) -I +unix -c $?

esy_installer.$(OCAML_OBJECT_EXT): fs.$(OCAML_OBJECT_EXT) esy_installer.mli esy_installer.ml
	$(OCAML_COMPILER) -c -I +str $? # only dependencies newer than target need to be built

