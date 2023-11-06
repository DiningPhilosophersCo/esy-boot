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
        if Filename.is_relative artifact_build_path then
          Printf.sprintf "%s/%s" cur_root artifact_build_path
        else artifact_build_path
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
  let print_ops (src, dest) =
    print_endline @@ Printf.sprintf "mkdir -p %s" (Filename.dirname dest);
    print_endline
    @@ Printf.sprintf "cp %s %s || true"
         (Str.global_replace (Str.regexp "?") "" src)
         dest
    (* TODO not all copy operations must silently fail. Only source paths with ? can *)
  in
  Parser.main Lexer.token lexbuf
  |> List.fold_left fold_entries []
  |> List.iter print_ops

let () = main ~install_file:Sys.argv.(1)
