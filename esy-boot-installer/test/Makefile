all: fs_test.exe

../src/fs.$(OCAML_OBJECT_EXT):
	make -C ../src $(shell basename $@)

fs_test.$(OCAML_OBJECT_EXT): ../src/fs.$(OCAML_OBJECT_EXT) fs_test.ml 
	$(OCAML_COMPILER) -I ../src -c $^

fs_test.exe: ../src/fs.$(OCAML_OBJECT_EXT) fs_test.$(OCAML_OBJECT_EXT)
	$(OCAML_COMPILER) -o $@ -I +unix unix.$(OCAML_ARCHIVE_EXT) $^
