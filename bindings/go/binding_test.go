package tree_sitter_terra_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_terra "github.com/tree-sitter/tree-sitter-terra/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_terra.Language())
	if language == nil {
		t.Errorf("Error loading Terra grammar")
	}
}
