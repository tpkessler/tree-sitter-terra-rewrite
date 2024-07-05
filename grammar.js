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

    typed_declaration: ($) => seq($.expression, ':', $.expression),

    terra_declaration: ($) => seq(
      'var',
      list_seq(choice($.expression, $.typed_declaration), ',')),

    expression: ($, original) => choice(
      original,
      $.quote_expression,
      $.short_quote_expression,
      $.escape_expression,
      $.function_pointer_expression,
    ),

    statement: ($, original) => choice(
      original,
    ),

    declaration: ($, original) => choice(
      original,
      $.terra_declaration,
      $.terra_function_declaration,
      $.local_terra_function_declaration
    ),

    primitive_type: _ => token(choice(
      'bool',
      'int',
      'float',
      'double',
      'opaque',
      ...[8, 16, 32, 64].map(n => `int${n}_t`),
      ...[8, 16, 32, 64].map(n => `uint${n}_t`),
    )),

    type_specifier: ($) => choice(
      $.primitive_type,
    ),

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
