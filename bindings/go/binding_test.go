package tree_sitter_terra_rewrite_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-terra_rewrite"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_terra_rewrite.Language())
	if language == nil {
		t.Errorf("Error loading TerraRewrite grammar")
	}
}
