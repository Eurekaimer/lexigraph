package vocab

import "testing"

func TestBundledVocabularyLoads(t *testing.T) {
	path, err := Resolve("../../public/data/netem.json")
	if err != nil {
		t.Fatal(err)
	}
	words, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(words) < 5000 {
		t.Fatalf("expected complete NETEM vocabulary, got %d words", len(words))
	}
}
