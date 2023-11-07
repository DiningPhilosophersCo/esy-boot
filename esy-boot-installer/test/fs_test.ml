let () =
  Fs.mkdirp "./foo/bar";
  assert (Sys.is_directory "./foo/bar")
