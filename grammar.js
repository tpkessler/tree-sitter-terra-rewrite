const lua = require('tree-sitter-lua/grammar')

// copied from the lua grammar
const list_seq = (rule, separator, trailing_separator = false) =>
  trailing_separator
    ? seq(rule, repeat(seq(separator, rule)), optional(separator))
    : seq(rule, repeat(seq(separator, rule)));

const optional_block = ($) => alias(optional($._block), $.block);

module.exports = grammar(lua, {
  name: "terra",

  conflicts: ($) => [
    // Function calls are expressions but with overloaded __apply()
    // they can also be a variable and thus appear on the left hand
    // site of an assignment statement.
    [$.expression, $.variable],
    // Escapes are expression but can also expand to variables
    [$.statement, $.variable],
    [$.struct_declaration, $.struct_definition],
    [$._local_struct_declaration, $._local_struct_definition],
  ],

  rules: {

    defer_statement: ($) => seq(
      'defer',
      $.expression
    ),

    quote_expression: ($) => seq(
      'quote',
      optional(choice(
        $.full_quote_statement,
        $.identifier,
        $._block,
      )),
      'end'
    ),

    full_quote_statement: ($) => seq(
      field('body', optional_block($)),
      'in',
      $._expression_list,
    ),

    short_quote_expression: ($) => seq(
      '`',
      $.expression,
    ),

    // The value of 99 is too high. But we also don't mix
    // lua code with a terra function pointer.
    // All arguments are terra types.
    function_pointer_expression: ($) => prec.right(99,
      seq(
        field('arguments', $.expression),
        '->',
        field('returns', $.expression)
      )
    ),

    terra_function_declaration: ($) => seq(
      'terra',
      $._function_name,
      '::',
      $.expression
    ),

    _local_terra_function_declaration: ($) => seq(
      'local',
      'terra',
      $.identifier,
      '::',
      $.expression
    ),

    terra_function_definition: ($) => seq(
      'terra',
      $._terra_function_body      
    ),

    terra_function_implementation: ($) => seq(
      'terra',
      field('name', $._function_name),
      $._terra_function_body
    ),

    _local_terra_function_implementation: ($) => seq(
      'local',
      'terra',
      field('name', choice($.identifier, $.escape_expression)),
      $._terra_function_body
    ),

    _terra_function_body: ($) => seq(
      field('parameters', $.terra_function_parameters),
      field('body', optional_block($)),
      'end'
    ),

    terra_function_parameters: ($) => seq(
      '(',
      optional($._terra_parameter_list),
      ')',
      optional(seq(
        ':',
        $.expression
      ))
    ),

    _terra_parameter_list: ($) => list_seq(
      choice($._typed_declaration, $.escape_expression),
      ',',
    ),

    escape_expression: ($) => seq(
      '[',
      $.expression,
      ']'
    ),

    dot_index_expression: ($, original) => choice(
      original,
      seq(
        field('table', $._prefix_expression),
        '.',
        $.escape_expression
      )
    ),

    _terra_variable: ($) => choice(
      $.identifier,
      $.escape_expression,
    ),

    _typed_declaration: ($) => seq(
      field('name', $._terra_variable),
      ':',
      field('type', $.expression)
    ),

    terra_declaration: ($) => seq(
      'var',
      list_seq(
        choice($.identifier, $.escape_expression, $._typed_declaration),
        ',')
    ),

    function_call: ($, original) => prec(2, choice(
      original,
      seq($.escape_expression, field('arguments', $.arguments))
    )),

    terra_var_definition: ($) => seq(
      $.terra_declaration,
      '=',
      $._expression_list
    ),

    escape_statement: ($) => seq(
      'escape',
      field('body', optional_block($)),
      'end'
    ),

    emit_statement: ($) => seq(
      'emit',
      $.expression
    ),

    union_declaration: ($) => seq(
      'union',
      $._union_body
    ),

    _union_body: ($) => seq(
      '{',
      list_seq(
        $._typed_declaration,
        /[,\n]/,
        true
      ),
      '}'
    ),

    struct_declaration: ($) => seq(
      'struct',
      field('name', $._function_name)
    ),

    _local_struct_declaration: ($) => seq(
      'local',
      'struct',
      field('name', $.identifier)
    ),

    anon_struct_definition: ($) => seq(
      'struct',
      $._struct_body
    ),

    struct_definition: ($) => seq(
      'struct',
      field('name', $._function_name),
      optional($.base_struct),
      $._struct_body
    ),

    _local_struct_definition: ($) => seq(
      'local',
      'struct',
      field('name', choice($.identifier, $.escape_expression)),
      optional($.base_struct),
      $._struct_body
    ),

    _struct_body: ($) => seq(
      '{',
      field('body', optional(list_seq(
        choice($.union_declaration, $._typed_declaration),
        /[,\n]/,
        true
      ))),
      '}'
    ),

    base_struct: ($) => seq(
      '(',
      $._function_name,
      ')'
    ),

    expression: ($, original) => choice(
      original,
      $.quote_expression,
      $.short_quote_expression,
      $.escape_expression,
      $.function_pointer_expression,
      $.terra_function_definition,
      alias($.anon_struct_definition, $.struct_definition),
    ),

    statement: ($, original) => choice(
      original,
      $.defer_statement,
      $.escape_expression,
      $.escape_statement,
      $.emit_statement,
    ),

    declaration: ($, original) => choice(
      original,
      $.terra_declaration,
      $.terra_var_definition,
      $.terra_function_declaration,
      alias($._local_terra_function_declaration, $.terra_function_declaration),
      $.struct_declaration,
      alias($._local_struct_declaration, $.struct_declaration),
      $.terra_function_implementation,
      alias($._local_terra_function_implementation, $.terra_function_implementation),
      $.struct_definition,
      alias($._local_struct_definition, $.struct_definition)
    ),

    variable: ($, original) => choice(
      original,
      $.function_call,
      $.escape_expression,
    ),

    primitive_type: _ => token(choice(
      'bool',
      'int',
      'float',
      'double',
      'opaque',
      ...[8, 16, 32, 64].map(n => `int${n}`),
      ...[8, 16, 32, 64].map(n => `uint${n}`),
    )),

    type_specifier: ($) => choice(
      $.primitive_type,
    ),

    // From the lua grammar with optional suffix for float or integer types
    number: (_) => {
      function number_literal(digits, exponent_marker, exponent_digits) {
        return choice(
          seq(digits, /U?LL/i),
          seq(
            choice(
              seq(optional(digits), optional('.'), digits),
              seq(digits, optional('.'), optional(digits))
            ),
            optional(
              seq(
                choice(
                  exponent_marker.toLowerCase(),
                  exponent_marker.toUpperCase()
                ),
                seq(optional(choice('-', '+')), exponent_digits),
              )
            ),
            /[iIfFuUlL]*/
          )
        );
      }

      const decimal_digits = /[0-9]+/;
      const decimal_literal = number_literal(
        decimal_digits,
        'e',
        decimal_digits
      );

      const hex_digits = /[a-fA-F0-9]+/;
      const hex_literal = seq(
        choice('0x', '0X'),
        number_literal(hex_digits, 'p', decimal_digits)
      );

      return token(choice(decimal_literal, hex_literal));
    },
    // from the lua grammar, include '`' as an illegal token and
    // remove & from the identifier start as it's used for pointers
    identifier: (_) => {
      const identifier_start =
        /[^\p{Control}\s+\-*/%^#~`|<>=(){}\[\];:,.\\'"\d]/;
      const identifier_continue =
        /[^\p{Control}\s+\-*/%^#&~`|<>=(){}\[\];:,.\\'"]*/;
      return token(seq(identifier_start, identifier_continue));
    },
  }
});
