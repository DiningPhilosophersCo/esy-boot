open Unix

exception Path_is_not_directory of string

let exists path =
  try
    let path_is_dir = Sys.is_directory path in
    if path_is_dir then true else raise (Path_is_not_directory path)
  with Sys_error _ -> false

let rec mkdirp path =
  match exists path with
  | true -> ()
  | false ->
      let parent = Filename.dirname path in
      let () =
        if not (String.equal parent path) then
          (* We have reached root *)
          mkdirp parent
        else ()
      in
      Sys.mkdir path 0o755

let buffer_size = 8192
let buffer = Bytes.make buffer_size ' '

let copy input_name output_name =
  let fd_in = openfile input_name [ O_RDONLY ] 0 in
  let fd_out = openfile output_name [ O_WRONLY; O_CREAT; O_TRUNC ] 0o766 in
  let rec copy_loop () =
    match read fd_in buffer 0 buffer_size with
    | 0 -> ()
    | r ->
        ignore (write fd_out buffer 0 r);
        copy_loop ()
  in
  copy_loop ();
  close fd_in;
  close fd_out
