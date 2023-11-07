let main ~install_file =
  let package_name =
    install_file |> Filename.basename |> Filename.remove_extension
  in
  let in_channel = open_in install_file in
  let lexbuf = Lexing.from_channel in_channel in
  let fold_entries acc entry =
    let section, artifacts = entry in
    let prefix = Sys.getenv "cur__install" in
    let cur_root = Sys.getenv "cur__root" in
    let fold_artifacts acc (artifact_build_path, custom_destination_path) =
      let src =
        match Filename.is_relative artifact_build_path with
        | true ->
            if String.starts_with ~prefix:"?" artifact_build_path then
              let artifact_build_path_len = String.length artifact_build_path in
              let artifact_build_path =
                String.sub artifact_build_path 1 (artifact_build_path_len - 1)
              in
              let src = Filename.concat cur_root artifact_build_path in
              if Sys.file_exists src then Some src else None
            else Some (Filename.concat cur_root artifact_build_path)
        | false -> Some artifact_build_path
      in
      let artifact_filename = Filename.basename artifact_build_path in
      let artifact_path_within_prefix =
        match (section, custom_destination_path) with
        | "lib", None ->
            Printf.sprintf "lib/%s/%s" package_name artifact_filename
        | "lib", Some p ->
            if Filename.is_relative p then
              Printf.sprintf "lib/%s/%s" package_name p
            else p
        | "lib_root", None -> Printf.sprintf "lib/%s" artifact_filename
        | "lib_root", Some p ->
            if Filename.is_relative p then Printf.sprintf "lib/%s" p else p
        | "libexec", None ->
            Printf.sprintf "lib/%s/%s" package_name artifact_filename
        | "libexec", Some p ->
            if Filename.is_relative p then
              Printf.sprintf "lib/%s/%s" package_name p
            else p
        | "bin", None -> Printf.sprintf "bin/%s" artifact_filename
        | "bin", Some p ->
            if Filename.is_relative p then Printf.sprintf "bin/%s" p else p
        | "sbin", None -> Printf.sprintf "sbin/%s" artifact_filename
        | "sbin", Some p ->
            if Filename.is_relative p then Printf.sprintf "sbin/%s" p else p
        | "toplevel", None -> Printf.sprintf "lib/toplevel/%s" artifact_filename
        | "toplevel", Some p ->
            if Filename.is_relative p then Printf.sprintf "lib/toplevel/%s" p
            else p
        | "share", None ->
            Printf.sprintf "share/%s/%s" package_name artifact_filename
        | "share", Some p ->
            if Filename.is_relative p then
              Printf.sprintf "share/%s/%s" package_name p
            else p
        | "share_root", None -> Printf.sprintf "share/%s" artifact_filename
        | "share_root", Some p ->
            if Filename.is_relative p then Printf.sprintf "share/%s" p else p
        | "etc", None ->
            Printf.sprintf "etc/%s/%s" package_name artifact_filename
        | "etc", Some p ->
            if Filename.is_relative p then
              Printf.sprintf "etc/%s/%s" package_name p
            else p
        | "doc", None ->
            Printf.sprintf "doc/%s/%s" package_name artifact_filename
        | "doc", Some p ->
            if Filename.is_relative p then
              Printf.sprintf "doc/%s/%s" package_name p
            else p
        | "stublibs", None -> Printf.sprintf "lib/stublibs/%s" artifact_filename
        | "stublibs", Some p ->
            if Filename.is_relative p then Printf.sprintf "lib/stublibs/%s" p
            else p
        | "man", None ->
            Printf.sprintf "man/%s" artifact_filename
            (* man pages are not copied according to the manual. They're not necessary for bootstrapping anyways *)
        | "man", Some p ->
            if Filename.is_relative p then Printf.sprintf "man/%s" p else p
        | "misc", None -> Printf.sprintf "%s" artifact_filename
        | "misc", Some p ->
            if Filename.is_relative p then Printf.sprintf "%s" p else p
        | unknown_section, _ ->
            failwith
              (Printf.sprintf "Unknown section %s in %s.install" unknown_section
                 package_name)
      in
      let dest =
        if Filename.is_relative artifact_path_within_prefix then
          Printf.sprintf "%s/%s" prefix artifact_path_within_prefix
        else artifact_path_within_prefix
      in
      (src, dest) :: acc
    in
    List.fold_left fold_artifacts acc artifacts
  in
  let f (src, dest) =
    Fs.mkdirp (Filename.dirname dest);
    match src with
    | Some src ->
        Fs.copy src dest;
        print_endline @@ Printf.sprintf "%s -> %s" src dest
    | None -> ()
  in
  Parser.main Lexer.token lexbuf
  |> List.fold_left fold_entries []
  |> List.iter f

let () = main ~install_file:Sys.argv.(1)
