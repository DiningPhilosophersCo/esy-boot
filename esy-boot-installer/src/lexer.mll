{
open Parser        (* The type token is defined in parser.mli *)
}
rule token = parse
| [' ' '\n' '\t']     { token lexbuf }     (* skip blanks *)
  | [ ':' ] { COLON }
  | [ '[' ] { START_PATHS_BLOCK }
  | [ ']' ] { END_PATHS_BLOCK }
  | [ '{' ] { START_DESTINATION_BLOCK }
  | [ '}' ] { END_DESTINATION_BLOCK }
  | [ '#' ] [^ '\n']+ ['\n'] { token lexbuf }
  | [ 'a' - 'z' 'A' - 'Z' '_']+ as lxm { SECTION lxm }
  | [ '"' ] ([ ^ '"' ]+ as lxm) [ '"' ] { STRING lxm }
  | eof            { EOF }
