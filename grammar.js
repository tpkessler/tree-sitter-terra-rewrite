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
  ],

  rules: {
    quote_expression: ($) => seq(
      'quote',
      optional(choice(
        $.full_quote_statement,
        $.expression,
      )),
      'end'
    ),
    full_quote_statement: ($) => seq(
      field('body', optional_block($)),
      'in',
      $.expression,
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

    local_terra_function_declaration: ($) => seq(
      'local',
      'terra',
      $.identifier,
      '::',
      $.expression
    ),

    escape_expression: ($) => seq(
      '[',
      $.expression,
      ']'
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
      list_seq(choice($.identifier, $.escape_expression, $._typed_declaration), ',')
    ),

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


    _union_body: ($) => list_seq(
        $._typed_declaration,
        /[,\n]/,
        true
    ),

    union_declaration: ($) => seq(
      'union',
      '{',
      $._union_body,
      '}'
    ),

    _struct_body: ($) => list_seq(
      choice($.union_declaration, $._typed_declaration),
      /[,\n]/,
      true
    ),

    struct_declaration: ($) => seq(
        'struct',
        field('name', $._function_name),
        '{',
        optional(field('body', $._struct_body)),
        '}'
    ),

    local_struct_declaration: ($) => seq(
        'local',
        'struct',
        field('name', $.identifier),
        '{',
        optional(field('body', $._struct_body)),
        '}'
    ),

    expression: ($, original) => choice(
      original,
      $.quote_expression,
      $.short_quote_expression,
      $.escape_expression,
      $.function_pointer_expression,
    ),

    statement: ($, original) => choice(
      original,
      $.escape_expression,
      $.escape_statement,
      $.emit_statement,
    ),

    declaration: ($, original) => choice(
      original,
      $.terra_declaration,
      $.terra_var_definition,
      $.terra_function_declaration,
      $.local_terra_function_declaration,
      $.struct_declaration,
      $.local_struct_declaration,
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
