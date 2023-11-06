/* File parser.mly */
%token COLON START_DESTINATION_BLOCK END_DESTINATION_BLOCK START_PATHS_BLOCK END_PATHS_BLOCK EOF 
%token <string> NOT_DOUBLE_QUOTE
%token <string> STRING
%token <string> SECTION
%start main             /* the entry point */
%type <(string * (string * string option) list) list> main
%%
main:
    sections EOF                { $1 }
;

section:
SECTION COLON paths             { ($1, $3) }

sections:
section                         { [ $1 ] }
| section sections              { $1 :: $2 }

paths:
START_PATHS_BLOCK END_PATHS_BLOCK      { [] }
  | START_PATHS_BLOCK one_or_more_paths END_PATHS_BLOCK { $2 }
;

custom_destination:
START_DESTINATION_BLOCK path END_DESTINATION_BLOCK { $2 }
;

one_or_more_paths:
path                              { [ $1, None ] }
  | path custom_destination         { [ $1, Some $2 ] }
  | path one_or_more_paths               { ($1, None) :: $2 }
  | path custom_destination one_or_more_paths               { ($1, Some $2) :: $3 }

path:
    STRING { $1 }
;
